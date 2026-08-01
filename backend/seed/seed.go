package main

import (
	"fmt"
	"log"

	"github.com/lfs-railway/backend/internal/config"
	"github.com/lfs-railway/backend/internal/db"
	"github.com/lfs-railway/backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Station seed data: real stations on the Colombo Fort – Badulla line.
// distance_km values are approximate cumulative distances from Colombo Fort.
var stations = []models.Station{
	{Name: "Colombo Fort", Code: "CMB", OrderInRoute: 0, DistanceKm: 0},
	{Name: "Maradana", Code: "MRD", OrderInRoute: 1, DistanceKm: 2},
	{Name: "Ragama", Code: "RGM", OrderInRoute: 2, DistanceKm: 21},
	{Name: "Polgahawela", Code: "POL", OrderInRoute: 3, DistanceKm: 62},
	{Name: "Peradeniya Junction", Code: "PRD", OrderInRoute: 4, DistanceKm: 108},
	{Name: "Kandy", Code: "KDY", OrderInRoute: 5, DistanceKm: 121},
	{Name: "Gampola", Code: "GMP", OrderInRoute: 6, DistanceKm: 134},
	{Name: "Nawalapitiya", Code: "NWL", OrderInRoute: 7, DistanceKm: 152},
	{Name: "Hatton", Code: "HTN", OrderInRoute: 8, DistanceKm: 181},
	{Name: "Nanu Oya", Code: "NNO", OrderInRoute: 9, DistanceKm: 200},
	{Name: "Bandarawela", Code: "BDW", OrderInRoute: 10, DistanceKm: 241},
	{Name: "Haputale", Code: "HPT", OrderInRoute: 11, DistanceKm: 251},
	{Name: "Ella", Code: "ELA", OrderInRoute: 12, DistanceKm: 272},
	{Name: "Demodara", Code: "DMD", OrderInRoute: 13, DistanceKm: 282},
	{Name: "Badulla", Code: "BDL", OrderInRoute: 14, DistanceKm: 292},
}

// Coach configuration: 3 reserved (A, B, C) + 5 unreserved (D–H).
// TotalSeats is set here and matches the seats created below.
// Seats per reserved coach: 40. Unreserved coaches have no seat records.
var coaches = []models.Coach{
	{Name: "A", Type: models.CoachTypeReserved, TotalSeats: 40},
	{Name: "B", Type: models.CoachTypeReserved, TotalSeats: 40},
	{Name: "C", Type: models.CoachTypeReserved, TotalSeats: 40},
	{Name: "D", Type: models.CoachTypeUnreserved, TotalSeats: 60},
	{Name: "E", Type: models.CoachTypeUnreserved, TotalSeats: 60},
	{Name: "F", Type: models.CoachTypeUnreserved, TotalSeats: 60},
	{Name: "G", Type: models.CoachTypeUnreserved, TotalSeats: 60},
	{Name: "H", Type: models.CoachTypeUnreserved, TotalSeats: 60},
}

func main() {
	cfg := config.Load()
	database := db.Connect(cfg.DatabaseURL)

	log.Println("seeding stations...")
	seedStations(database)

	log.Println("seeding coaches and seats...")
	seedCoachesAndSeats(database)

	log.Println("seed complete")
}

func seedStations(database *gorm.DB) {
	for _, s := range stations {
		database.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "order_in_route", "distance_km"}),
		}).Create(&s)
	}
}

func seedCoachesAndSeats(database *gorm.DB) {
	for _, c := range coaches {
		coach := c // capture
		database.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"type", "total_seats"}),
		}).Create(&coach)

		// Only create seats for reserved coaches.
		if coach.Type == models.CoachTypeReserved {
			// Re-fetch to get the ID after upsert.
			database.Where("name = ?", coach.Name).First(&coach)
			seedSeats(database, coach)
		}
	}
}

func seedSeats(database *gorm.DB, coach models.Coach) {
	for i := 1; i <= coach.TotalSeats; i++ {
		seat := models.Seat{
			CoachID:    coach.ID,
			SeatNumber: fmt.Sprintf("%d", i),
		}
		database.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "coach_id"}, {Name: "seat_number"}},
			DoNothing: true,
		}).Create(&seat)
	}
}
