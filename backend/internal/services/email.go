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
	m.SetHeader("Subject", fmt.Sprintf("Ceylon Railways Booking Confirmation (#%d)", booking.ID))

	htmlBody := fmt.Sprintf(`
		<h2>Booking Confirmed!</h2>
		<p>Dear %s,</p>
		<p>Thank you for choosing Ceylon Railways. Your ticket has been confirmed.</p>
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
		<p>Ceylon Railways Team</p>
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

// SendInquiryResolvedEmail sends an email to the user when their inquiry is resolved.
func (s *EmailService) SendInquiryResolvedEmail(inquiry *models.Inquiry) error {
	if s.cfg.SMTPHost == "" {
		log.Println("SMTP_HOST not set, skipping inquiry resolved email for", inquiry.Email)
		return nil
	}

	m := gomail.NewMessage()
	m.SetHeader("From", s.cfg.SMTPFrom)
	m.SetHeader("To", inquiry.Email)
	m.SetHeader("Subject", fmt.Sprintf("Ceylon Railways Support: Inquiry Resolved (#%d)", inquiry.ID))

	htmlBody := fmt.Sprintf(`
		<h2>Your Inquiry has been Resolved</h2>
		<p>Dear %s,</p>
		<p>We are writing to let you know that your recent inquiry (<strong>#%d</strong>) regarding <em>%s</em> has been marked as resolved by our support team.</p>
		<p>If you have any further questions or require additional assistance, please feel free to submit a new inquiry or reply to this email.</p>
		<br/>
		<p>Best regards,</p>
		<p>Ceylon Railways Team</p>
	`,
		inquiry.Name,
		inquiry.ID,
		inquiry.ActionType,
	)

	m.SetBody("text/html", htmlBody)

	if err := s.dialer.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send inquiry resolved email: %w", err)
	}

	log.Printf("Sent inquiry resolved email to %s", inquiry.Email)
	return nil
}

// SendAdminActionEmail sends an email to the passenger when an admin refunds or reschedules their booking.
func (s *EmailService) SendAdminActionEmail(booking *models.Booking, action string) error {
	if s.cfg.SMTPHost == "" {
		log.Println("SMTP_HOST not set, skipping admin action email for", booking.PassengerEmail)
		return nil
	}

	m := gomail.NewMessage()
	m.SetHeader("From", s.cfg.SMTPFrom)
	m.SetHeader("To", booking.PassengerEmail)

	var subject, title, message string
	
	switch action {
	case "refund", "cancel":
		subject = fmt.Sprintf("Ceylon Railways Booking Refunded (#%d)", booking.ID)
		title = "Booking Refunded"
		message = "Your booking has been cancelled and refunded by our admin team."
		if booking.CancellationReason != "" {
			message += fmt.Sprintf("<br/><br/><strong>Reason:</strong> %s", booking.CancellationReason)
		}
	case "reschedule":
		subject = fmt.Sprintf("Ceylon Railways Booking Rescheduled (#%d)", booking.ID)
		title = "Booking Rescheduled"
		message = fmt.Sprintf("Your booking has been rescheduled. Your new travel date is <strong>%s</strong>, Coach <strong>%s</strong>, Seat <strong>%s</strong>.", booking.TravelDate, booking.Seat.Coach.Name, booking.Seat.SeatNumber)
	default:
		return nil
	}

	m.SetHeader("Subject", subject)

	htmlBody := fmt.Sprintf(`
		<div style="font-family: 'Inter', sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
			<div style="background: linear-gradient(135deg, #f5a623 0%%, #c47d0e 100%%); padding: 20px; text-align: center;">
				<h2 style="color: #fff; margin: 0; font-size: 24px;">%s</h2>
			</div>
			<div style="padding: 30px;">
				<p style="font-size: 16px; line-height: 1.5;">Dear %s,</p>
				<p style="font-size: 16px; line-height: 1.5; color: #555;">%s</p>
				
				<div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin-top: 25px; border-left: 4px solid #00c9a7;">
					<h3 style="margin-top: 0; color: #222;">Booking Details:</h3>
					<ul style="list-style: none; padding: 0; margin: 0;">
						<li style="margin-bottom: 8px;"><strong>Booking ID:</strong> #%d</li>
						<li style="margin-bottom: 8px;"><strong>NIC Number:</strong> %s</li>
						<li style="margin-bottom: 8px;"><strong>Route:</strong> %s to %s</li>
					</ul>
				</div>
				
				<p style="font-size: 16px; margin-top: 30px;">If you have any questions, please contact our support.</p>
				<p style="font-size: 16px; color: #777;">Safe travels,<br/><strong style="color: #333;">Ceylon Railways Team</strong></p>
			</div>
		</div>
	`,
		title,
		booking.PassengerName,
		message,
		booking.ID,
		booking.PassengerNIC,
		booking.StartStation.Name, booking.EndStation.Name,
	)

	m.SetBody("text/html", htmlBody)

	if err := s.dialer.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send admin action email: %w", err)
	}

	log.Printf("Sent admin action email to %s", booking.PassengerEmail)
	return nil
}
