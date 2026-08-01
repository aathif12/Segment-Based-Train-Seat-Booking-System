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
	fareService := services.NewFareService()
	bookingService := services.NewBookingService(database, fareService)

	// Wire up handlers.
	stationHandler := handlers.NewStationHandler(database)
	bookingHandler := handlers.NewBookingHandler(bookingService)
	adminHandler := handlers.NewAdminHandler(bookingService)

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
		// Stations
		api.GET("/stations", stationHandler.List)

		// Seats & Availability
		api.GET("/seats/available", bookingHandler.GetAvailableSeats)

		// Bookings
		api.POST("/bookings", bookingHandler.CreateBooking)
		api.GET("/bookings/:id", bookingHandler.GetBooking)
		api.DELETE("/bookings/:id", bookingHandler.CancelBooking)
		api.POST("/bookings/waitlist", bookingHandler.AddToWaitlist)

		// Admin
		admin := api.Group("/admin")
		{
			admin.GET("/occupancy", adminHandler.GetOccupancy)
			admin.GET("/revenue", adminHandler.GetRevenue)
		}
	}

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("LFS Railway API listening on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
