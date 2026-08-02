package models

import "time"

// TrainSchedule represents a scheduled train service on the Colombo Fort–Badulla route.
type TrainSchedule struct {
	ID             uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	TrainNumber    string    `gorm:"size:10;not null;uniqueIndex" json:"train_number"`
	TrainName      string    `gorm:"size:100;not null" json:"train_name"`
	TrainType      string    `gorm:"size:30;not null" json:"train_type"`       // Express, Intercity, Night Mail
	DepartureTime  string    `gorm:"size:5;not null" json:"departure_time"`    // "HH:MM" 24h
	ArrivalTime    string    `gorm:"size:5;not null" json:"arrival_time"`      // "HH:MM" 24h
	DurationHours  int       `gorm:"not null;default:0" json:"duration_hours"`
	DurationMins   int       `gorm:"not null;default:0" json:"duration_mins"`
	TotalSeats     int       `gorm:"not null;default:0" json:"total_seats"`
	Classes        string    `gorm:"size:255;not null" json:"classes"`          // comma-separated
	RunsDays       string    `gorm:"size:100;not null;default:'Daily'" json:"runs_days"`
	IsOvernight    bool      `gorm:"not null;default:false" json:"is_overnight"`
	AccentColor    string    `gorm:"size:20;not null;default:'#f5a623'" json:"accent_color"`
	DisplayOrder   int       `gorm:"not null;default:0" json:"display_order"`
	IsActive       bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
