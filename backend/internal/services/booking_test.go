package services_test

import (
	"fmt"
	"sync"
	"testing"

	"github.com/lfs-railway/backend/internal/config"
	"github.com/lfs-railway/backend/internal/db"
	"github.com/lfs-railway/backend/internal/models"
	"github.com/lfs-railway/backend/internal/services"
)

// TestConcurrentBooking verifies that when N goroutines simultaneously attempt to
// book the same seat for the same overlapping segment, exactly 1 succeeds and the
// rest receive ErrSegmentConflict. This is the core correctness guarantee of the
// SELECT FOR UPDATE concurrency control strategy.
func TestConcurrentBooking(t *testing.T) {
	cfg := config.Load()
	database := db.Connect(cfg.DatabaseURL)

	fareService := services.NewFareService()
	bookingSvc := services.NewBookingService(database, fareService)

	// Find a reserved seat and two consecutive stations to test with.
	var seat models.Seat
	database.Joins("JOIN coaches ON coaches.id = seats.coach_id").
		Where("coaches.type = ?", models.CoachTypeReserved).
		First(&seat)

	if seat.ID == 0 {
		t.Skip("no reserved seats found — run seed first")
	}

	var startStation, endStation models.Station
	database.Order("order_in_route ASC").First(&startStation)
	database.Order("order_in_route ASC").Offset(5).First(&endStation)

	const numGoroutines = 10
	results := make(chan error, numGoroutines)

	var wg sync.WaitGroup
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, err := bookingSvc.Book(services.BookingRequest{
				SeatID:         seat.ID,
				PassengerName:  fmt.Sprintf("Passenger %d", i),
				PassengerEmail: fmt.Sprintf("passenger%d@test.com", i),
				StartStationID: startStation.ID,
				EndStationID:   endStation.ID,
			})
			results <- err
		}(i)
	}

	wg.Wait()
	close(results)

	successCount := 0
	conflictCount := 0
	for err := range results {
		if err == nil {
			successCount++
		} else if err == services.ErrSegmentConflict {
			conflictCount++
		} else {
			t.Errorf("unexpected error: %v", err)
		}
	}

	if successCount != 1 {
		t.Errorf("expected exactly 1 successful booking, got %d", successCount)
	}
	if conflictCount != numGoroutines-1 {
		t.Errorf("expected %d conflicts, got %d", numGoroutines-1, conflictCount)
	}

	t.Logf("concurrent booking test: 1 success, %d conflicts (correct)", conflictCount)
}
