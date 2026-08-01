package services

import (
	"math"

	"github.com/lfs-railway/backend/internal/models"
)

// Fare configuration constants.
// These are kept as named constants (not magic numbers) so the department
// can tune them without touching business logic.
const (
	// BaseRatePerKm is the base fare in LKR per kilometre for a reserved seat.
	BaseRatePerKm float64 = 3.50

	// UnreservedDiscount is the percentage reduction applied to unreserved coaches.
	// (Unreserved coaches don't use segment booking, but included for completeness.)
	UnreservedDiscount float64 = 0.45

	// MinimumFare ensures very short segments still have a floor price.
	MinimumFare float64 = 50.0
)

// FareService computes fares for a given seat and segment.
type FareService struct{}

// NewFareService creates a new FareService.
func NewFareService() *FareService {
	return &FareService{}
}

// Calculate returns the fare in LKR for a journey between two stations on a given seat.
// Formula: max(MinimumFare, distance_km * BaseRatePerKm)
// The fare covers only the passenger's actual segment — not the full route —
// which is the core pricing rationale of the system.
func (s *FareService) Calculate(fromStation, toStation models.Station, seat models.Seat, coach models.Coach) float64 {
	distanceKm := math.Abs(toStation.DistanceKm - fromStation.DistanceKm)
	fare := distanceKm * BaseRatePerKm

	// Apply unreserved discount if applicable (informational only here)
	if coach.Type == models.CoachTypeUnreserved {
		fare *= (1 - UnreservedDiscount)
	}

	if fare < MinimumFare {
		fare = MinimumFare
	}

	return math.Round(fare*100) / 100 // round to 2 decimal places
}
