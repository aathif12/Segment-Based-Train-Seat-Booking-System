package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lfs-railway/backend/internal/models"
	"gorm.io/gorm"
)

// TrainScheduleHandler serves train schedule endpoints.
type TrainScheduleHandler struct {
	db *gorm.DB
}

// NewTrainScheduleHandler creates a new TrainScheduleHandler.
func NewTrainScheduleHandler(db *gorm.DB) *TrainScheduleHandler {
	return &TrainScheduleHandler{db: db}
}

// ScheduleResponse extends TrainSchedule with a live available-seat count.
type ScheduleResponse struct {
	models.TrainSchedule
	AvailableSeats int `json:"available_seats"`
}

// List returns all active train schedules with live seat availability.
// GET /api/trains/schedules?date=YYYY-MM-DD
func (h *TrainScheduleHandler) List(c *gin.Context) {
	date := c.Query("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	var schedules []models.TrainSchedule
	if err := h.db.
		Where("is_active = ?", true).
		Order("display_order ASC").
		Find(&schedules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch train schedules"})
		return
	}

	// Compute available seats for each schedule by counting non-conflicting bookings
	// across all reserved seats for the given date.
	// Available = TotalReservedSeats - seats that have at least one CONFIRMED booking on that date.
	var totalReservedSeats int64
	h.db.Model(&models.Seat{}).Count(&totalReservedSeats)

	var bookedSeatCount int64
	h.db.Model(&models.Booking{}).
		Where("travel_date = ? AND status = ?", date, models.BookingStatusConfirmed).
		Distinct("seat_id").
		Count(&bookedSeatCount)

	baseAvailable := int(totalReservedSeats) - int(bookedSeatCount)
	if baseAvailable < 0 {
		baseAvailable = 0
	}

	result := make([]ScheduleResponse, 0, len(schedules))
	for _, s := range schedules {
		result = append(result, ScheduleResponse{
			TrainSchedule:  s,
			AvailableSeats: baseAvailable,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// Get returns a single train schedule by ID.
// GET /api/trains/schedules/:id
func (h *TrainScheduleHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid schedule id"})
		return
	}

	var schedule models.TrainSchedule
	if err := h.db.First(&schedule, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "schedule not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": schedule})
}
