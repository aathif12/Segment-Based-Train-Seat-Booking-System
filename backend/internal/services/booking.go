package services

import (
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/lfs-railway/backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrSegmentConflict is returned when a seat is already booked for an overlapping segment.
var ErrSegmentConflict = errors.New("seat is already booked for an overlapping segment")

// ErrSeatNotFound is returned when the requested seat does not exist.
var ErrSeatNotFound = errors.New("seat not found")

// BookingService handles all booking lifecycle operations.
type BookingService struct {
	db          *gorm.DB
	fareService *FareService
}

// NewBookingService creates a new BookingService.
func NewBookingService(db *gorm.DB, fareService *FareService) *BookingService {
	return &BookingService{db: db, fareService: fareService}
}

// BookingRequest carries the input data for a new booking.
type BookingRequest struct {
	SeatID         uint   `json:"seat_id" binding:"required"`
	PassengerName  string `json:"passenger_name" binding:"required,min=2,max=150"`
	PassengerEmail string `json:"passenger_email" binding:"required,email"`
	StartStationID uint   `json:"start_station_id" binding:"required"`
	EndStationID   uint   `json:"end_station_id" binding:"required"`
}

// AvailabilityResult holds a seat with its availability flag for a given segment.
type AvailabilityResult struct {
	models.Seat
	IsAvailable bool    `json:"is_available"`
	Fare        float64 `json:"fare"`
}

// GetAvailableSeats returns all reserved seats with availability status for the given segment.
// It does NOT lock rows — this is a read-only query for the UI to display the seat map.
// Actual conflict prevention happens inside Book() via SELECT FOR UPDATE.
func (s *BookingService) GetAvailableSeats(startOrder, endOrder int) ([]AvailabilityResult, error) {
	var seats []models.Seat
	if err := s.db.Preload("Coach").Find(&seats, "coaches.type = ?", models.CoachTypeReserved).
		Joins("JOIN coaches ON coaches.id = seats.coach_id").
		Where("coaches.type = ?", models.CoachTypeReserved).Find(&seats).Error; err != nil {
		return nil, fmt.Errorf("fetch seats: %w", err)
	}

	// For each seat, check if any confirmed booking overlaps the requested segment.
	results := make([]AvailabilityResult, 0, len(seats))
	for _, seat := range seats {
		var conflictCount int64
		s.db.Model(&models.Booking{}).
			Where("seat_id = ? AND status = ? AND start_station_order < ? AND end_station_order > ?",
				seat.ID, models.BookingStatusConfirmed, endOrder, startOrder).
			Count(&conflictCount)

		// Fetch stations to compute fare estimate
		var startStation, endStation models.Station
		s.db.First(&startStation, "order_in_route = ?", startOrder)
		s.db.First(&endStation, "order_in_route = ?", endOrder)

		fare := s.fareService.Calculate(startStation, endStation, seat, seat.Coach)

		results = append(results, AvailabilityResult{
			Seat:        seat,
			IsAvailable: conflictCount == 0,
			Fare:        fare,
		})
	}

	return results, nil
}

// Book creates a booking for the given seat and segment.
//
// Concurrency guarantee:
//   We open a transaction and immediately acquire a row-level lock on the seat row
//   using SELECT ... FOR UPDATE. Any concurrent transaction attempting to book the
//   same seat will block until we commit or rollback. After acquiring the lock, we
//   re-check for overlapping bookings — if one exists, we return ErrSegmentConflict.
//   If none exists, we insert the booking and commit. This is the only correct way
//   to prevent phantom reads without relying on SERIALIZABLE isolation (which would
//   cause excessive retries under load).
func (s *BookingService) Book(req BookingRequest) (*models.Booking, error) {
	var booking *models.Booking

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Lock the seat row exclusively for the duration of this transaction.
		var seat models.Seat
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Coach").
			First(&seat, req.SeatID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrSeatNotFound
			}
			return fmt.Errorf("lock seat: %w", err)
		}

		// Validate the seat is in a reserved coach (unreserved seats are not bookable).
		if seat.Coach.Type != models.CoachTypeReserved {
			return errors.New("only reserved coach seats can be booked")
		}

		// 2. Fetch station details for both endpoints.
		var startStation, endStation models.Station
		if err := tx.First(&startStation, req.StartStationID).Error; err != nil {
			return fmt.Errorf("start station not found: %w", err)
		}
		if err := tx.First(&endStation, req.EndStationID).Error; err != nil {
			return fmt.Errorf("end station not found: %w", err)
		}

		if startStation.OrderInRoute >= endStation.OrderInRoute {
			return errors.New("start station must be before end station on the route")
		}

		// 3. Check for overlapping bookings — now safe because the seat row is locked.
		var conflictCount int64
		tx.Model(&models.Booking{}).
			Where(`seat_id = ? AND status = ? AND start_station_order < ? AND end_station_order > ?`,
				seat.ID,
				models.BookingStatusConfirmed,
				endStation.OrderInRoute,
				startStation.OrderInRoute,
			).Count(&conflictCount)

		if conflictCount > 0 {
			return ErrSegmentConflict
		}

		// 4. Compute fare and create the booking.
		fare := s.fareService.Calculate(startStation, endStation, seat, seat.Coach)

		booking = &models.Booking{
			SeatID:            seat.ID,
			PassengerName:     req.PassengerName,
			PassengerEmail:    req.PassengerEmail,
			StartStationOrder: startStation.OrderInRoute,
			EndStationOrder:   endStation.OrderInRoute,
			StartStationID:    startStation.ID,
			EndStationID:      endStation.ID,
			Fare:              fare,
			Status:            models.BookingStatusConfirmed,
		}

		if err := tx.Create(booking).Error; err != nil {
			return fmt.Errorf("create booking: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Eagerly load associations for the response.
	s.db.Preload("Seat.Coach").Preload("StartStation").Preload("EndStation").First(booking, booking.ID)

	return booking, nil
}

// Cancel marks a booking as cancelled and attempts to promote the first matching
// waitlist entry for the now-freed segment.
func (s *BookingService) Cancel(bookingID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var booking models.Booking
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&booking, bookingID).Error; err != nil {
			return fmt.Errorf("booking not found: %w", err)
		}

		if booking.Status != models.BookingStatusConfirmed {
			return errors.New("only confirmed bookings can be cancelled")
		}

		booking.Status = models.BookingStatusCancelled
		if err := tx.Save(&booking).Error; err != nil {
			return err
		}

		// Attempt waitlist promotion in a goroutine so the cancel response is fast.
		go s.promoteWaitlist(booking)

		return nil
	})
}

// promoteWaitlist finds the oldest waitlist entry whose segment fits within the
// now-available gap and converts it to a confirmed booking.
func (s *BookingService) promoteWaitlist(cancelled models.Booking) {
	var entry models.WaitlistEntry
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Find the first waitlist entry that fits within the freed segment.
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where(`seat_id = ? AND status = ? AND start_station_order >= ? AND end_station_order <= ?`,
				cancelled.SeatID,
				models.BookingStatusWaitlisted,
				cancelled.StartStationOrder,
				cancelled.EndStationOrder,
			).
			Order("created_at ASC").
			First(&entry).Error; err != nil {
			return err // no waitlist entry found, nothing to do
		}

		// Verify no new conflicting booking was created in the meantime.
		var conflicts int64
		tx.Model(&models.Booking{}).
			Where(`seat_id = ? AND status = ? AND start_station_order < ? AND end_station_order > ?`,
				entry.SeatID, models.BookingStatusConfirmed,
				entry.EndStationOrder, entry.StartStationOrder).
			Count(&conflicts)

		if conflicts > 0 {
			return nil // another booking took the slot — leave waitlist entry for next time
		}

		// Promote: create confirmed booking from waitlist entry.
		promoted := &models.Booking{
			SeatID:            entry.SeatID,
			PassengerName:     entry.PassengerName,
			PassengerEmail:    entry.PassengerEmail,
			StartStationOrder: entry.StartStationOrder,
			EndStationOrder:   entry.EndStationOrder,
			StartStationID:    entry.StartStationID,
			EndStationID:      entry.EndStationID,
			Status:            models.BookingStatusConfirmed,
		}
		if err := tx.Create(promoted).Error; err != nil {
			return err
		}

		// Mark waitlist entry as confirmed (repurpose status field).
		entry.Status = models.BookingStatusConfirmed
		return tx.Save(&entry).Error
	})

	if err != nil {
		log.Printf("waitlist promotion failed for booking %d: %v", cancelled.ID, err)
	} else {
		log.Printf("promoted waitlist entry %d after cancellation of booking %d", entry.ID, cancelled.ID)
	}
}

// AddToWaitlist queues a passenger for a fully-booked segment.
func (s *BookingService) AddToWaitlist(req BookingRequest) (*models.WaitlistEntry, error) {
	var startStation, endStation models.Station
	if err := s.db.First(&startStation, req.StartStationID).Error; err != nil {
		return nil, fmt.Errorf("start station not found: %w", err)
	}
	if err := s.db.First(&endStation, req.EndStationID).Error; err != nil {
		return nil, fmt.Errorf("end station not found: %w", err)
	}

	entry := &models.WaitlistEntry{
		SeatID:            req.SeatID,
		PassengerName:     req.PassengerName,
		PassengerEmail:    req.PassengerEmail,
		StartStationOrder: startStation.OrderInRoute,
		EndStationOrder:   endStation.OrderInRoute,
		StartStationID:    startStation.ID,
		EndStationID:      endStation.ID,
		Status:            models.BookingStatusWaitlisted,
	}

	if err := s.db.Create(entry).Error; err != nil {
		return nil, fmt.Errorf("create waitlist entry: %w", err)
	}

	return entry, nil
}

// GetBookingByID fetches a single booking with all associations.
func (s *BookingService) GetBookingByID(id uint) (*models.Booking, error) {
	var booking models.Booking
	if err := s.db.Preload("Seat.Coach").Preload("StartStation").Preload("EndStation").
		First(&booking, id).Error; err != nil {
		return nil, err
	}
	return &booking, nil
}

// AdminOccupancy returns occupancy stats grouped by coach.
type CoachOccupancy struct {
	CoachID    uint      `json:"coach_id"`
	CoachName  string    `json:"coach_name"`
	TotalSeats int       `json:"total_seats"`
	Bookings   int64     `json:"active_bookings"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (s *BookingService) GetOccupancyStats() ([]CoachOccupancy, error) {
	var coaches []models.Coach
	s.db.Preload("Seats").Find(&coaches, "type = ?", models.CoachTypeReserved)

	var stats []CoachOccupancy
	for _, coach := range coaches {
		var seatIDs []uint
		for _, seat := range coach.Seats {
			seatIDs = append(seatIDs, seat.ID)
		}

		var activeBookings int64
		if len(seatIDs) > 0 {
			s.db.Model(&models.Booking{}).
				Where("seat_id IN ? AND status = ?", seatIDs, models.BookingStatusConfirmed).
				Count(&activeBookings)
		}

		stats = append(stats, CoachOccupancy{
			CoachID:    coach.ID,
			CoachName:  coach.Name,
			TotalSeats: coach.TotalSeats,
			Bookings:   activeBookings,
			UpdatedAt:  coach.UpdatedAt,
		})
	}

	return stats, nil
}

// RevenueBySegment returns total confirmed revenue grouped by start→end station pair.
type RevenueRecord struct {
	StartStationName string  `json:"start_station_name"`
	EndStationName   string  `json:"end_station_name"`
	TotalRevenue     float64 `json:"total_revenue"`
	BookingCount     int64   `json:"booking_count"`
}

func (s *BookingService) GetRevenueStats() ([]RevenueRecord, error) {
	var records []RevenueRecord
	err := s.db.Raw(`
		SELECT
			s1.name AS start_station_name,
			s2.name AS end_station_name,
			SUM(b.fare) AS total_revenue,
			COUNT(*) AS booking_count
		FROM bookings b
		JOIN stations s1 ON s1.id = b.start_station_id
		JOIN stations s2 ON s2.id = b.end_station_id
		WHERE b.status = 'CONFIRMED'
		GROUP BY s1.name, s2.name
		ORDER BY total_revenue DESC
	`).Scan(&records).Error
	return records, err
}
