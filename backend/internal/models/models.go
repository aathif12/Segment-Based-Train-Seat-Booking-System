package models

import (
	"time"
)

// User represents a passenger account.
type User struct {
	ID           uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name         string    `gorm:"size:150;not null" json:"name"`
	Email        string    `gorm:"size:255;not null;uniqueIndex" json:"email"`
	PasswordHash string    `gorm:"not null" json:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// CoachType distinguishes reserved (seat-assigned) from unreserved coaches.
type CoachType string

const (
	CoachTypeReserved   CoachType = "RESERVED"
	CoachTypeUnreserved CoachType = "UNRESERVED"
)

// BookingStatus represents the lifecycle state of a booking.
type BookingStatus string

const (
	BookingStatusConfirmed       BookingStatus = "CONFIRMED"
	BookingStatusCancelled       BookingStatus = "CANCELLED"
	BookingStatusWaitlisted      BookingStatus = "WAITLISTED"
	BookingStatusCancelRequested BookingStatus = "CANCEL_REQUESTED"
	BookingStatusRefunded        BookingStatus = "REFUNDED"
	BookingStatusRescheduled     BookingStatus = "RESCHEDULED"
)

// Station represents a stop on the Colombo Fort–Badulla route.
// OrderInRoute is a monotonically increasing integer (0 = Fort, N = Badulla)
// used for all segment-overlap calculations.
type Station struct {
	ID           uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name         string    `gorm:"size:100;not null;uniqueIndex" json:"name"`
	Code         string    `gorm:"size:10;not null;uniqueIndex" json:"code"`
	OrderInRoute int       `gorm:"not null;uniqueIndex" json:"order_in_route"`
	DistanceKm   float64   `gorm:"not null;default:0" json:"distance_km"` // cumulative km from Fort
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Coach represents a single physical coach on the train.
// TotalSeats is stored for quick reference (avoids counting seats every time).
type Coach struct {
	ID         uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name       string    `gorm:"size:10;not null;uniqueIndex" json:"name"`
	Type       CoachType `gorm:"size:20;not null" json:"type"`
	TotalSeats int       `gorm:"not null;default:0" json:"total_seats"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`

	Seats []Seat `gorm:"foreignKey:CoachID" json:"seats,omitempty"`
}

// Seat represents a single bookable seat within a reserved coach.
// Unreserved coaches have no seat records — they are first-come-first-served.
type Seat struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	CoachID     uint      `gorm:"not null;uniqueIndex:idx_seat_coach" json:"coach_id"`
	SeatNumber  string    `gorm:"size:10;not null;uniqueIndex:idx_seat_coach" json:"seat_number"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Coach    Coach     `gorm:"foreignKey:CoachID" json:"coach,omitempty"`
	Bookings []Booking `gorm:"foreignKey:SeatID" json:"bookings,omitempty"`
}

// Booking records a confirmed or cancelled passenger reservation.
//
// Segment overlap logic:
//   Two bookings on the same seat overlap when:
//   MAX(b1.StartStationOrder, b2.StartStationOrder) < MIN(b1.EndStationOrder, b2.EndStationOrder)
//
// This means adjacent bookings (e.g., Fort→Kandy + Kandy→Badulla) do NOT overlap
// and are fully supported, enabling segment-based resale.
type Booking struct {
	ID                 uint          `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID             *uint         `gorm:"index" json:"user_id,omitempty"`
	SeatID             uint          `gorm:"not null;index" json:"seat_id"`
	PassengerName      string        `gorm:"size:150;not null" json:"passenger_name"`
	PassengerEmail     string        `gorm:"size:255;not null" json:"passenger_email"`
	TravelDate         string        `gorm:"size:10;not null;index;default:'2026-08-01'" json:"travel_date"`
	StartStationOrder  int           `gorm:"not null" json:"start_station_order"`
	EndStationOrder    int           `gorm:"not null" json:"end_station_order"`
	StartStationID     uint          `gorm:"not null" json:"start_station_id"`
	EndStationID       uint          `gorm:"not null" json:"end_station_id"`
	Fare               float64       `gorm:"not null;default:0" json:"fare"`
	Status             BookingStatus `gorm:"size:20;not null;default:'CONFIRMED'" json:"status"`
	CreatedAt          time.Time     `json:"created_at"`
	UpdatedAt          time.Time     `json:"updated_at"`

	Seat         Seat    `gorm:"foreignKey:SeatID" json:"seat,omitempty"`
	StartStation Station `gorm:"foreignKey:StartStationID" json:"start_station,omitempty"`
	EndStation   Station `gorm:"foreignKey:EndStationID" json:"end_station,omitempty"`
	User         *User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// WaitlistEntry queues a passenger when a seat's segment is fully booked.
// When a booking is cancelled, the service promotes the next matching entry.
type WaitlistEntry struct {
	ID                uint          `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID            *uint         `gorm:"index" json:"user_id,omitempty"`
	SeatID            uint          `gorm:"not null;index" json:"seat_id"`
	PassengerName     string        `gorm:"size:150;not null" json:"passenger_name"`
	PassengerEmail    string        `gorm:"size:255;not null" json:"passenger_email"`
	TravelDate        string        `gorm:"size:10;not null;index;default:'2026-08-01'" json:"travel_date"`
	StartStationOrder int           `gorm:"not null" json:"start_station_order"`
	EndStationOrder   int           `gorm:"not null" json:"end_station_order"`
	StartStationID    uint          `gorm:"not null" json:"start_station_id"`
	EndStationID      uint          `gorm:"not null" json:"end_station_id"`
	Status            BookingStatus `gorm:"size:20;not null;default:'WAITLISTED'" json:"status"`
	CreatedAt         time.Time     `json:"created_at"`
	UpdatedAt         time.Time     `json:"updated_at"`

	User              *User         `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Seat              Seat          `gorm:"foreignKey:SeatID" json:"seat,omitempty"`
	StartStation      Station       `gorm:"foreignKey:StartStationID" json:"start_station,omitempty"`
	EndStation        Station       `gorm:"foreignKey:EndStationID" json:"end_station,omitempty"`
}
