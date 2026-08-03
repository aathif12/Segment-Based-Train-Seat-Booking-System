package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/lfs-railway/backend/internal/config"
	"github.com/lfs-railway/backend/internal/db"
	"github.com/lfs-railway/backend/internal/handlers"
	"github.com/lfs-railway/backend/internal/middleware"
	"github.com/lfs-railway/backend/internal/services"
)

func main() {
	// Load configuration from environment.
	cfg := config.Load()

	// Connect to PostgreSQL and run auto-migration.
	database := db.Connect(cfg.DatabaseURL)

	// Wire up services.
	emailService := services.NewEmailService(cfg)
	fareService := services.NewFareService()
	bookingService := services.NewBookingService(database, fareService, emailService)

	// Wire up handlers.
	authHandler := handlers.NewAuthHandler(database)
	stationHandler := handlers.NewStationHandler(database)
	bookingHandler := handlers.NewBookingHandler(bookingService)
	adminHandler := handlers.NewAdminHandler(bookingService)
	trainScheduleHandler := handlers.NewTrainScheduleHandler(database)
	inquiryHandler := handlers.NewInquiryHandler(database, emailService)

	// Configure Gin.
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(middleware.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())

	// Health check — used by Docker Compose healthcheck.
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API routes.
	api := r.Group("/api")
	{
		// Auth
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// Stations
		api.GET("/stations", stationHandler.List)

		// Train Schedules (public)
		trains := api.Group("/trains")
		{
			trains.GET("/schedules", trainScheduleHandler.List)
			trains.GET("/schedules/:id", trainScheduleHandler.Get)
		}

		// Seats & Availability
		api.GET("/seats/available", bookingHandler.GetAvailableSeats)

		// Inquiries (Public creation)
		api.POST("/inquiries", inquiryHandler.CreateInquiry)

		// Bookings (Optional Auth for creating to link UserID)
		bookings := api.Group("/bookings")
		bookings.Use(middleware.OptionalAuthMiddleware())
		{
			bookings.POST("", bookingHandler.CreateBooking)
			bookings.POST("/waitlist", bookingHandler.AddToWaitlist)
		}
		
		api.GET("/bookings/:id", bookingHandler.GetBooking)
		
		// Protected User Routes
		user := api.Group("/user")
		user.Use(middleware.AuthMiddleware())
		{
			user.GET("/bookings", bookingHandler.GetUserBookings)
			user.POST("/bookings/:id/request", bookingHandler.RequestChange) // User request refund/reschedule
			user.GET("/inquiries", inquiryHandler.GetUserInquiries)
		}

		// Admin (Protected by Basic Auth)
		admin := api.Group("/admin")
		admin.Use(gin.BasicAuth(gin.Accounts{
			"admin": "admin",
		}))
		{
			admin.GET("/occupancy", adminHandler.GetOccupancy)
			admin.GET("/revenue", adminHandler.GetRevenue)
			admin.GET("/bookings", adminHandler.GetBookings)
			admin.GET("/waitlist", adminHandler.GetWaitlist)
			admin.DELETE("/bookings/:id", adminHandler.CancelBooking) // Admin force cancel
			admin.POST("/bookings/:id/process", adminHandler.ProcessCancellation) // Refund / Reschedule
			admin.POST("/waitlist/:id/assign", adminHandler.AssignWaitlistSeat)   // Assign seat to waitlist entry
			admin.DELETE("/waitlist/:id", adminHandler.CancelWaitlistEntry)       // Cancel waitlist entry
			
			admin.GET("/inquiries", inquiryHandler.GetAdminInquiries)
			admin.PUT("/inquiries/:id/status", inquiryHandler.UpdateInquiryStatus)
		}
	}

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Ceylon Railways API listening on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
