package validator

import (
	"fmt"
	"net"
	"net/smtp"
	"regexp"
	"strings"
	"time"

	"datacleaner/internal/models"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

type EmailValidator struct {
	concurrency        int
	timeout            time.Duration
	fromEmail          string
	heloHostname       string
	smtpEnabled        bool
	bypassOnBlacklist  bool
}

func NewEmailValidator(concurrency int) *EmailValidator {
	return &EmailValidator{
		concurrency:       concurrency,
		timeout:           5 * time.Second,
		fromEmail:         "verify@datacleaner.local",
		heloHostname:      "datacleaner.local",
		smtpEnabled:       true,
		bypassOnBlacklist: true,
	}
}

// SetSMTPConfig allows configuring SMTP validation parameters
func (v *EmailValidator) SetSMTPConfig(fromEmail, heloHostname string, enabled, bypassBlacklist bool) {
	v.fromEmail = fromEmail
	v.heloHostname = heloHostname
	v.smtpEnabled = enabled
	v.bypassOnBlacklist = bypassBlacklist
}

// GetSMTPConfig returns current SMTP configuration
func (v *EmailValidator) GetSMTPConfig() (string, string, bool, bool) {
	return v.fromEmail, v.heloHostname, v.smtpEnabled, v.bypassOnBlacklist
}

// ValidateSyntax checks if email follows proper syntax
func (v *EmailValidator) ValidateSyntax(email string) bool {
	email = strings.TrimSpace(email)
	if len(email) < 3 || len(email) > 254 {
		return false
	}
	return emailRegex.MatchString(email)
}

// ValidateDNS checks if domain has valid MX records
func (v *EmailValidator) ValidateDNS(email string) (bool, string, error) {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false, "", fmt.Errorf("invalid email format")
	}

	domain := parts[1]

	// Lookup MX records
	mxRecords, err := net.LookupMX(domain)
	if err != nil {
		return false, "", err
	}

	if len(mxRecords) == 0 {
		return false, "", fmt.Errorf("no MX records found")
	}

	// Return the primary MX record (lowest preference number)
	primaryMX := mxRecords[0].Host
	for _, mx := range mxRecords {
		if mx.Pref < mxRecords[0].Pref {
			primaryMX = mx.Host
		}
	}

	return true, strings.TrimSuffix(primaryMX, "."), nil
}

// ValidateSMTP performs SMTP verification without sending email
func (v *EmailValidator) ValidateSMTP(email string, mxHost string) (bool, error) {
	// Add timeout to prevent hanging
	conn, err := net.DialTimeout("tcp", mxHost+":25", v.timeout)
	if err != nil {
		return false, fmt.Errorf("failed to connect to SMTP server: %v", err)
	}
	defer conn.Close()

	// Set deadline for the entire operation
	conn.SetDeadline(time.Now().Add(v.timeout))

	client, err := smtp.NewClient(conn, mxHost)
	if err != nil {
		return false, fmt.Errorf("failed to create SMTP client: %v", err)
	}
	defer client.Close()

	// HELO command
	err = client.Hello(v.heloHostname)
	if err != nil {
		return false, fmt.Errorf("HELO failed: %v", err)
	}

	// MAIL FROM
	err = client.Mail(v.fromEmail)
	if err != nil {
		return false, fmt.Errorf("MAIL FROM failed: %v", err)
	}

	// RCPT TO - this is where we verify the email
	err = client.Rcpt(email)
	if err != nil {
		return false, fmt.Errorf("RCPT TO failed: %v", err)
	}

	// QUIT
	client.Quit()

	return true, nil
}

// ValidateEmail performs complete validation (syntax + DNS + SMTP)
func (v *EmailValidator) ValidateEmail(email string) (bool, bool, bool, bool, string, string) {
	email = strings.TrimSpace(strings.ToLower(email))

	// Step 1: Syntax validation
	syntaxValid := v.ValidateSyntax(email)
	if !syntaxValid {
		return false, syntaxValid, false, false, "", "Invalid email syntax"
	}

	// Step 2: DNS/MX validation
	dnsValid, mxRecord, err := v.ValidateDNS(email)
	if !dnsValid {
		errorMsg := "DNS validation failed"
		if err != nil {
			errorMsg = err.Error()
		}
		return false, syntaxValid, dnsValid, false, "", errorMsg
	}

	// Step 3: SMTP validation
	// Check if SMTP validation is enabled
	if !v.smtpEnabled {
		// Skip SMTP validation - email is valid if Syntax and DNS pass
		return true, syntaxValid, dnsValid, true, mxRecord, ""
	}

	smtpValid, err := v.ValidateSMTP(email, mxRecord)

	// If SMTP fails, check if we should bypass on blacklist
	if !smtpValid && err != nil && v.bypassOnBlacklist {
		errStr := err.Error()
		// Check if error is due to blacklisting/blocking
		if strings.Contains(errStr, "blocked") ||
		   strings.Contains(errStr, "Spamhaus") ||
		   strings.Contains(errStr, "blacklist") ||
		   strings.Contains(errStr, "Service unavailable") {
			// Email passes Syntax + DNS, so mark as valid despite SMTP blocking
			return true, syntaxValid, dnsValid, false, mxRecord, ""
		}
		// Other SMTP errors - email might be invalid
		return false, syntaxValid, dnsValid, smtpValid, mxRecord, errStr
	}

	if !smtpValid && err != nil {
		return false, syntaxValid, dnsValid, smtpValid, mxRecord, err.Error()
	}

	return true, syntaxValid, dnsValid, smtpValid, mxRecord, ""
}

// ValidateEmailBatch validates multiple emails concurrently
func (v *EmailValidator) ValidateEmailBatch(emails []string, progressChan chan<- int) []models.ValidationResult {
	results := make([]models.ValidationResult, len(emails))
	semaphore := make(chan struct{}, v.concurrency)
	done := make(chan struct {
		index int
		result models.ValidationResult
	}, len(emails))

	// Launch concurrent workers
	for i, email := range emails {
		go func(index int, emailAddr string) {
			semaphore <- struct{}{} // Acquire semaphore
			defer func() { <-semaphore }() // Release semaphore

			isValid, syntaxValid, dnsValid, smtpValid, mxRecord, errorReason := v.ValidateEmail(emailAddr)

			done <- struct {
				index int
				result models.ValidationResult
			}{
				index: index,
				result: models.ValidationResult{
					Email:       emailAddr,
					IsValid:     isValid,
					SyntaxValid: syntaxValid,
					DNSValid:    dnsValid,
					SMTPValid:   smtpValid,
					MXRecord:    mxRecord,
					ErrorReason: errorReason,
				},
			}

			// Send progress update
			if progressChan != nil {
				progressChan <- 1
			}
		}(i, email)
	}

	// Collect results
	for i := 0; i < len(emails); i++ {
		result := <-done
		results[result.index] = result.result
	}

	return results
}
