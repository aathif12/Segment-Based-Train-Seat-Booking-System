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

	log.Println("seeding train schedules...")
	seedTrainSchedules(database)

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

// trainSchedules: real Sri Lanka Railways Colombo Fort → Badulla services.
var trainSchedules = []models.TrainSchedule{
	{
		TrainNumber:   "1005",
		TrainName:     "Podi Menike",
		TrainType:     "Express",
		DepartureTime: "05:55",
		ArrivalTime:   "15:27",
		DurationHours: 9,
		DurationMins:  32,
		TotalSeats:    320,
		Classes:       "1st Class,2nd Class,3rd Class",
		RunsDays:      "Daily",
		IsOvernight:   false,
		AccentColor:   "#f5a623",
		DisplayOrder:  1,
		IsActive:      true,
	},
	{
		TrainNumber:   "1015",
		TrainName:     "Udarata Menike",
		TrainType:     "Intercity",
		DepartureTime: "08:30",
		ArrivalTime:   "18:22",
		DurationHours: 9,
		DurationMins:  52,
		TotalSeats:    290,
		Classes:       "1st Class AC,2nd Class,3rd Class",
		RunsDays:      "Daily",
		IsOvernight:   false,
		AccentColor:   "#00c9a7",
		DisplayOrder:  2,
		IsActive:      true,
	},
	{
		TrainNumber:   "1041",
		TrainName:     "Night Mail",
		TrainType:     "Night Mail",
		DepartureTime: "20:15",
		ArrivalTime:   "07:10",
		DurationHours: 10,
		DurationMins:  55,
		TotalSeats:    260,
		Classes:       "Sleeperette 2nd,2nd Class,3rd Class",
		RunsDays:      "Daily",
		IsOvernight:   true,
		AccentColor:   "#7c3aed",
		DisplayOrder:  3,
		IsActive:      true,
	},
}

func seedTrainSchedules(database *gorm.DB) {
	for _, ts := range trainSchedules {
		database.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "train_number"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"train_name", "train_type", "departure_time", "arrival_time",
				"duration_hours", "duration_mins", "total_seats", "classes",
				"runs_days", "is_overnight", "accent_color", "display_order", "is_active",
			}),
		}).Create(&ts)
	}
}

