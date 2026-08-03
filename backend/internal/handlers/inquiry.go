package handlers

import (
	"net/http"
	"strconv"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/lfs-railway/backend/internal/models"
	"github.com/lfs-railway/backend/internal/services"
	"gorm.io/gorm"
)

type InquiryHandler struct {
	db       *gorm.DB
	emailSvc *services.EmailService
}

func NewInquiryHandler(db *gorm.DB, emailSvc *services.EmailService) *InquiryHandler {
	return &InquiryHandler{db: db, emailSvc: emailSvc}
}

type CreateInquiryReq struct {
	BookingID  *uint  `json:"booking_id"`
	Name       string `json:"name" binding:"required"`
	Email      string `json:"email" binding:"required,email"`
	Phone      string `json:"phone" binding:"required"`
	ActionType string `json:"action_type" binding:"required"`
	Message    string `json:"message" binding:"required"`
}

// CreateInquiry allows guests or users to submit a support request.
func (h *InquiryHandler) CreateInquiry(c *gin.Context) {
	var req CreateInquiryReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify booking if provided
	if req.BookingID != nil {
		var booking models.Booking
		if err := h.db.First(&booking, *req.BookingID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
			return
		}
		// Basic security: require email and phone to match the booking
		if booking.PassengerEmail != req.Email || booking.PassengerPhone != req.Phone {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "email and phone do not match the booking record"})
			return
		}
	}

	inquiry := models.Inquiry{
		BookingID:  req.BookingID,
		Name:       req.Name,
		Email:      req.Email,
		Phone:      req.Phone,
		ActionType: req.ActionType,
		Message:    req.Message,
		Status:     "PENDING",
	}

	if err := h.db.Create(&inquiry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create inquiry"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Inquiry submitted successfully", "data": inquiry})
}

// GetUserInquiries fetches inquiries made by the authenticated user
func (h *InquiryHandler) GetUserInquiries(c *gin.Context) {
	uid, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := uid.(uint)

	// Fetch user email to match inquiries
	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	var inquiries []models.Inquiry
	if err := h.db.Where("email = ?", user.Email).Order("created_at DESC").Find(&inquiries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch inquiries"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": inquiries})
}

// GetAdminInquiries fetches all inquiries for admins
func (h *InquiryHandler) GetAdminInquiries(c *gin.Context) {
	var inquiries []models.Inquiry
	if err := h.db.Preload("Booking").Order("created_at DESC").Find(&inquiries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch inquiries"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": inquiries})
}

// UpdateInquiryStatus allows admins to update the status of an inquiry
func (h *InquiryHandler) UpdateInquiryStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid inquiry id"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var inquiry models.Inquiry
	if err := h.db.First(&inquiry, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "inquiry not found"})
		return
	}

	inquiry.Status = req.Status
	if err := h.db.Save(&inquiry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update inquiry"})
		return
	}

	// Send email if resolved
	if inquiry.Status == "RESOLVED" && h.emailSvc != nil {
		go func() {
			if err := h.emailSvc.SendInquiryResolvedEmail(&inquiry); err != nil {
				log.Printf("Failed to send inquiry resolved email for #%d: %v", inquiry.ID, err)
			}
		}()
	}

	c.JSON(http.StatusOK, gin.H{"message": "Inquiry updated successfully"})
}
