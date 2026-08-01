package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lfs-railway/backend/internal/models"
	"github.com/lfs-railway/backend/internal/services"
	"gorm.io/gorm"
)

// StationHandler serves station-related endpoints.
type StationHandler struct {
	db *gorm.DB
}

// NewStationHandler creates a new StationHandler.
func NewStationHandler(db *gorm.DB) *StationHandler {
	return &StationHandler{db: db}
}

// List returns all stations ordered by their position on the route.
// GET /api/stations
func (h *StationHandler) List(c *gin.Context) {
	var stations []models.Station
	if err := h.db.Order("order_in_route ASC").Find(&stations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch stations"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stations})
}

// BookingHandler serves booking-related endpoints.
type BookingHandler struct {
	svc *services.BookingService
}

// NewBookingHandler creates a new BookingHandler.
func NewBookingHandler(svc *services.BookingService) *BookingHandler {
	return &BookingHandler{svc: svc}
}

// GetAvailableSeats returns reserved seats with availability for a given segment.
// GET /api/seats/available?from_order=0&to_order=5
func (h *BookingHandler) GetAvailableSeats(c *gin.Context) {
	fromOrder, err := strconv.Atoi(c.Query("from_order"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from_order must be an integer"})
		return
	}
	toOrder, err := strconv.Atoi(c.Query("to_order"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to_order must be an integer"})
		return
	}
	if fromOrder >= toOrder {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from_order must be less than to_order"})
		return
	}

	date := c.Query("date")
	if date == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "date is required"})
		return
	}

	seats, err := h.svc.GetAvailableSeats(fromOrder, toOrder, date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": seats})
}

// CreateBooking handles a new booking request.
// POST /api/bookings
func (h *BookingHandler) CreateBooking(c *gin.Context) {
	var req services.BookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if uid, exists := c.Get("user_id"); exists {
		userID := uid.(uint)
		req.UserID = &userID
	}

	booking, err := h.svc.Book(req)
	if err != nil {
		if errors.Is(err, services.ErrSegmentConflict) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "This seat is already booked for an overlapping segment. Please choose another seat or adjust your journey.",
				"code":  "SEGMENT_CONFLICT",
			})
			return
		}
		if errors.Is(err, services.ErrSeatNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "seat not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    booking,
		"message": "Booking confirmed successfully",
	})
}

// GetBooking returns a single booking by ID.
// GET /api/bookings/:id
func (h *BookingHandler) GetBooking(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking id"})
		return
	}

	booking, err := h.svc.GetBookingByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": booking})
}

// GetUserBookings returns all bookings for the authenticated user.
// GET /api/user/bookings
func (h *BookingHandler) GetUserBookings(c *gin.Context) {
	uid, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	bookings, err := h.svc.GetUserBookings(uid.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": bookings})
}

// CancelBooking cancels a confirmed booking if owned by the user.
// DELETE /api/bookings/:id
func (h *BookingHandler) CancelBooking(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking id"})
		return
	}

	uid, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	booking, err := h.svc.GetBookingByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
		return
	}

	if booking.UserID == nil || *booking.UserID != uid.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "you do not have permission to cancel this booking"})
		return
	}

	if err := h.svc.Cancel(uint(id)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Booking cancelled successfully"})
}

// AddToWaitlist adds a passenger to the waitlist for a fully-booked segment.
// POST /api/bookings/waitlist
func (h *BookingHandler) AddToWaitlist(c *gin.Context) {
	var req services.BookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if uid, exists := c.Get("user_id"); exists {
		userID := uid.(uint)
		req.UserID = &userID
	}

	entry, err := h.svc.AddToWaitlist(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    entry,
		"message": "Added to waitlist. You will be notified if a seat becomes available.",
	})
}

// AdminHandler serves admin reporting endpoints.
type AdminHandler struct {
	svc *services.BookingService
}

// NewAdminHandler creates a new AdminHandler.
func NewAdminHandler(svc *services.BookingService) *AdminHandler {
	return &AdminHandler{svc: svc}
}

// GetOccupancy returns coach occupancy statistics.
// GET /api/admin/occupancy
func (h *AdminHandler) GetOccupancy(c *gin.Context) {
	stats, err := h.svc.GetOccupancyStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stats})
}

// GetBookings returns all bookings for the admin dashboard.
// GET /api/admin/bookings
func (h *AdminHandler) GetBookings(c *gin.Context) {
	bookings, err := h.svc.GetAllBookings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": bookings})
}

// GetRevenue returns revenue statistics grouped by station pair.
// GET /api/admin/revenue
func (h *AdminHandler) GetRevenue(c *gin.Context) {
	stats, err := h.svc.GetRevenueStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stats})
}

// GetWaitlist returns all waitlist entries for the admin dashboard.
// GET /api/admin/waitlist
func (h *AdminHandler) GetWaitlist(c *gin.Context) {
	waitlist, err := h.svc.GetAllWaitlist()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": waitlist})
}

// CancelBooking cancels a confirmed booking (Admin override).
// DELETE /api/admin/bookings/:id
func (h *AdminHandler) CancelBooking(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking id"})
		return
	}

	if err := h.svc.AdminProcessCancellation(uint(id), "cancel"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Booking cancelled successfully"})
}

// ProcessCancellation handles admin processing of a cancellation request.
// POST /api/admin/bookings/:id/process
func (h *AdminHandler) ProcessCancellation(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking id"})
		return
	}

	var req struct {
		Action string `json:"action" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.AdminProcessCancellation(uint(id), req.Action); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cancellation processed successfully"})
}
