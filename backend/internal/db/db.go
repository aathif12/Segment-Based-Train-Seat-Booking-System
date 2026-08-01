package db

import (
	"fmt"
	"log"

	"github.com/lfs-railway/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect opens a GORM connection to PostgreSQL using the provided DSN.
// It auto-migrates all models so the schema is always current on startup.
func Connect(dsn string) *gorm.DB {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if err := autoMigrate(db); err != nil {
		log.Fatalf("database migration failed: %v", err)
	}

	log.Println("database connected and migrated successfully")
	return db
}

// autoMigrate runs GORM's automatic schema migration for all models.
// In production you would replace this with versioned SQL migrations;
// auto-migrate is used here so `docker-compose up --build` works on a clean machine.
func autoMigrate(db *gorm.DB) error {
	err := db.AutoMigrate(
		&models.User{},
		&models.Station{},
		&models.Coach{},
		&models.Seat{},
		&models.Booking{},
		&models.WaitlistEntry{},
	)
	if err != nil {
		return fmt.Errorf("automigrate: %w", err)
	}
	return nil
}
