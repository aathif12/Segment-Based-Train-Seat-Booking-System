package services

import (
	"fmt"
	"log"
	"strconv"

	"github.com/lfs-railway/backend/internal/config"
	"github.com/lfs-railway/backend/internal/models"

	"gopkg.in/gomail.v2"
)

// EmailService handles sending emails via SMTP.
type EmailService struct {
	dialer *gomail.Dialer
	cfg    *config.Config
}

// NewEmailService creates a new EmailService using the provided configuration.
func NewEmailService(cfg *config.Config) *EmailService {
	port, err := strconv.Atoi(cfg.SMTPPort)
	if err != nil {
		port = 25
	}

	dialer := gomail.NewDialer(cfg.SMTPHost, port, cfg.SMTPUser, cfg.SMTPPass)

	return &EmailService{
		dialer: dialer,
		cfg:    cfg,
	}
}

// SendBookingConfirmation sends an email to the passenger with their booking details.
func (s *EmailService) SendBookingConfirmation(booking *models.Booking) error {
	if s.cfg.SMTPHost == "" {
		log.Println("SMTP_HOST not set, skipping booking confirmation email for", booking.PassengerEmail)
		return nil
	}

	m := gomail.NewMessage()
	m.SetHeader("From", s.cfg.SMTPFrom)
	m.SetHeader("To", booking.PassengerEmail)
	m.SetHeader("Subject", fmt.Sprintf("LFS Railway Booking Confirmation (#%d)", booking.ID))

	htmlBody := fmt.Sprintf(`
		<h2>Booking Confirmed!</h2>
		<p>Dear %s,</p>
		<p>Thank you for choosing LFS Railway. Your ticket has been confirmed.</p>
		<h3>Booking Details:</h3>
		<ul>
			<li><strong>Booking ID:</strong> #%d</li>
			<li><strong>NIC Number:</strong> %s</li>
			<li><strong>Route:</strong> %s to %s</li>
			<li><strong>Travel Date:</strong> %s</li>
			<li><strong>Coach:</strong> %s</li>
			<li><strong>Seat Number:</strong> %d</li>
			<li><strong>Fare:</strong> Rs. %.2f</li>
		</ul>
		<p>Please present your NIC and this email to the ticket checker.</p>
		<br/>
		<p>Safe travels,</p>
		<p>LFS Railway Team</p>
	`,
		booking.PassengerName,
		booking.ID,
		booking.PassengerNIC,
		booking.StartStation.Name, booking.EndStation.Name,
		booking.TravelDate,
		booking.Seat.Coach.Name,
		booking.Seat.SeatNumber,
		booking.Fare,
	)

	m.SetBody("text/html", htmlBody)

	if err := s.dialer.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	log.Printf("Sent booking confirmation email to %s", booking.PassengerEmail)
	return nil
}
