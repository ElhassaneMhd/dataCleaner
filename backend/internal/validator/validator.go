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

	// Verification VPS (for checking existence - NEVER uses your main IP)
	verifyVPSHost      string
	verifyVPSPort      int
	verifyFromEmail    string
	verifyHeloHostname string
	verifyEnabled      bool
	bypassOnBlacklist  bool

	// Sending SMTP (for actual email sending)
	sendingHost        string
	sendingPort        int
	sendingUsername    string
	sendingPassword    string
	sendingFromEmail   string
	sendingTestEnabled bool
}

func NewEmailValidator(concurrency int) *EmailValidator {
	return &EmailValidator{
		concurrency:        concurrency,
		timeout:            5 * time.Second,
		verifyVPSHost:      "", // EMPTY = Syntax+DNS only (safe default)
		verifyVPSPort:      25,
		verifyFromEmail:    "verify@datacleaner.local",
		verifyHeloHostname: "datacleaner.local",
		verifyEnabled:      false, // DISABLED by default - requires VPS
		bypassOnBlacklist:  true,
		sendingPort:        587,
		sendingTestEnabled: false,
	}
}

// SetSMTPConfig allows configuring SMTP validation parameters
func (v *EmailValidator) SetSMTPConfig(config models.SMTPConfig) {
	// Verification VPS
	v.verifyVPSHost = config.VerifyVPSHost
	v.verifyVPSPort = config.VerifyVPSPort
	v.verifyFromEmail = config.VerifyFromEmail
	v.verifyHeloHostname = config.VerifyHeloHostname
	v.bypassOnBlacklist = config.BypassBlacklist

	// CRITICAL: Only enable SMTP verification if VPS is configured
	// This protects the user's main IP from blacklisting
	if config.VerifyVPSHost != "" && config.VerifyEnabled {
		v.verifyEnabled = true
	} else {
		v.verifyEnabled = false // Force disable if no VPS
	}

	// Sending SMTP
	v.sendingHost = config.SendingHost
	v.sendingPort = config.SendingPort
	v.sendingUsername = config.SendingUsername
	v.sendingPassword = config.SendingPassword
	v.sendingFromEmail = config.SendingFromEmail
	v.sendingTestEnabled = config.SendingTestEnabled
}

// GetSMTPConfig returns current SMTP configuration
func (v *EmailValidator) GetSMTPConfig() models.SMTPConfig {
	return models.SMTPConfig{
		VerifyVPSHost:      v.verifyVPSHost,
		VerifyVPSPort:      v.verifyVPSPort,
		VerifyFromEmail:    v.verifyFromEmail,
		VerifyHeloHostname: v.verifyHeloHostname,
		VerifyEnabled:      v.verifyEnabled,
		BypassBlacklist:    v.bypassOnBlacklist,
		SendingHost:        v.sendingHost,
		SendingPort:        v.sendingPort,
		SendingUsername:    v.sendingUsername,
		SendingPassword:    v.sendingPassword,
		SendingFromEmail:   v.sendingFromEmail,
		SendingTestEnabled: v.sendingTestEnabled,
	}
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

// ValidateSMTP performs SMTP verification via VPS (NEVER uses your main IP)
func (v *EmailValidator) ValidateSMTP(email string, mxHost string) (bool, error) {
	// CRITICAL SAFETY CHECK: Require VPS host to protect main IP
	if v.verifyVPSHost == "" {
		return false, fmt.Errorf("VPS host not configured - SMTP verification disabled for IP protection")
	}

	// Connect through VPS proxy/relay (NOT direct from your server)
	// This uses the VPS IP instead of your main server IP
	vpsAddr := fmt.Sprintf("%s:%d", v.verifyVPSHost, v.verifyVPSPort)
	conn, err := net.DialTimeout("tcp", vpsAddr, v.timeout)
	if err != nil {
		return false, fmt.Errorf("failed to connect to verification VPS: %v", err)
	}
	defer conn.Close()

	// Set deadline for the entire operation
	conn.SetDeadline(time.Now().Add(v.timeout))

	// Create SMTP client through VPS
	client, err := smtp.NewClient(conn, v.verifyVPSHost)
	if err != nil {
		return false, fmt.Errorf("failed to create SMTP client via VPS: %v", err)
	}
	defer client.Close()

	// HELO command
	err = client.Hello(v.verifyHeloHostname)
	if err != nil {
		return false, fmt.Errorf("HELO failed: %v", err)
	}

	// MAIL FROM
	err = client.Mail(v.verifyFromEmail)
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
	if !v.verifyEnabled {
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

// TestSendingSMTPToMX tests if the sending SMTP server can reach a specific MX server
func (v *EmailValidator) TestSendingSMTPToMX(mxServer string) bool {
	if !v.sendingTestEnabled || v.sendingHost == "" {
		return false
	}

	// Connect to the sending SMTP server
	addr := fmt.Sprintf("%s:%d", v.sendingHost, v.sendingPort)
	conn, err := net.DialTimeout("tcp", addr, v.timeout)
	if err != nil {
		return false
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, v.sendingHost)
	if err != nil {
		return false
	}
	defer client.Close()

	// Authenticate if credentials provided
	if v.sendingUsername != "" && v.sendingPassword != "" {
		auth := smtp.PlainAuth("", v.sendingUsername, v.sendingPassword, v.sendingHost)
		if err = client.Auth(auth); err != nil {
			return false
		}
	}

	// Try to send MAIL FROM command
	err = client.Mail(v.sendingFromEmail)
	if err != nil {
		return false
	}

	// Try a test RCPT TO with the MX domain
	// Use a test email format: test@<domain-from-mx>
	testEmail := fmt.Sprintf("test@%s", mxServer)
	err = client.Rcpt(testEmail)

	// Close without actually sending
	client.Quit()

	// If no error, the sending SMTP can reach this MX
	return err == nil
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
