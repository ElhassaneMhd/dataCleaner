package validator

import (
	"context"
	"datacleaner/internal/cache"
	"datacleaner/internal/models"
	"strings"
	"sync"
)

// EnhancedEmailValidator wraps EmailValidator with caching and retry logic
type EnhancedEmailValidator struct {
	*EmailValidator
	cache       *cache.DNSCache
	retryConfig *RetryConfig
	dedupMap    map[string]bool
	dedupMutex  sync.RWMutex
}

// NewEnhancedEmailValidator creates a new enhanced email validator
func NewEnhancedEmailValidator(
	concurrency int,
	dnsCache *cache.DNSCache,
	retryConfig *RetryConfig,
) *EnhancedEmailValidator {
	return &EnhancedEmailValidator{
		EmailValidator: NewEmailValidator(concurrency),
		cache:          dnsCache,
		retryConfig:    retryConfig,
		dedupMap:       make(map[string]bool),
	}
}

// IsDuplicate checks if an email has already been processed
func (v *EnhancedEmailValidator) IsDuplicate(email string) bool {
	email = strings.TrimSpace(strings.ToLower(email))

	v.dedupMutex.RLock()
	isDup := v.dedupMap[email]
	v.dedupMutex.RUnlock()

	return isDup
}

// MarkAsSeen marks an email as seen to detect duplicates
func (v *EnhancedEmailValidator) MarkAsSeen(email string) {
	email = strings.TrimSpace(strings.ToLower(email))

	v.dedupMutex.Lock()
	v.dedupMap[email] = true
	v.dedupMutex.Unlock()
}

// ClearDuplicateMap clears the duplicate detection map (call after job completes)
func (v *EnhancedEmailValidator) ClearDuplicateMap() {
	v.dedupMutex.Lock()
	v.dedupMap = make(map[string]bool)
	v.dedupMutex.Unlock()
}

// ValidateDNSWithCache validates DNS with caching
func (v *EnhancedEmailValidator) ValidateDNSWithCache(ctx context.Context, email string) (bool, string, error) {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false, "", nil
	}

	domain := strings.ToLower(parts[1])

	// Check cache first
	if v.cache != nil {
		if mxRecord, found := v.cache.GetMX(ctx, domain); found {
			return true, mxRecord, nil
		}

		if isValid, found := v.cache.GetDNSValid(ctx, domain); found {
			if !isValid {
				return false, "", nil
			}
		}
	}

	// Not in cache, perform DNS lookup with retry
	var isValid bool
	var mxRecord string
	var err error

	retryErr := RetryWithBackoff(ctx, v.retryConfig, func() error {
		isValid, mxRecord, err = v.ValidateDNS(email)
		return err
	})

	// Cache the result
	if v.cache != nil {
		if isValid && mxRecord != "" {
			v.cache.SetMX(ctx, domain, mxRecord)
			v.cache.SetDNSValid(ctx, domain, true)
		} else {
			v.cache.SetDNSValid(ctx, domain, false)
		}
	}

	if retryErr != nil {
		return false, "", retryErr
	}

	return isValid, mxRecord, err
}

// ValidateEmailEnhanced performs enhanced validation with caching, retry, and deduplication
func (v *EnhancedEmailValidator) ValidateEmailEnhanced(ctx context.Context, email string) (bool, bool, bool, bool, string, string, bool) {
	email = strings.TrimSpace(strings.ToLower(email))

	// Check for duplicates
	isDuplicate := v.IsDuplicate(email)
	if isDuplicate {
		// Mark as seen even if duplicate (for consistency)
		return false, false, false, false, "", "Duplicate email", true
	}

	// Mark as seen
	v.MarkAsSeen(email)

	// Check cache for full validation result
	if v.cache != nil {
		if cachedResult, found := v.cache.GetValidationResult(ctx, email); found {
			return cachedResult.IsValid,
				cachedResult.SyntaxValid,
				cachedResult.DNSValid,
				cachedResult.SMTPValid,
				cachedResult.MXRecord,
				cachedResult.ErrorReason,
				isDuplicate
		}
	}

	// Step 1: Syntax validation
	syntaxValid := v.ValidateSyntax(email)
	if !syntaxValid {
		result := &cache.CachedValidationResult{
			IsValid:     false,
			SyntaxValid: syntaxValid,
			DNSValid:    false,
			SMTPValid:   false,
			MXRecord:    "",
			ErrorReason: "Invalid email syntax",
		}
		if v.cache != nil {
			v.cache.SetValidationResult(ctx, email, result)
		}
		return false, syntaxValid, false, false, "", "Invalid email syntax", isDuplicate
	}

	// Step 2: DNS validation with cache and retry
	dnsValid, mxRecord, err := v.ValidateDNSWithCache(ctx, email)
	if !dnsValid {
		errorMsg := "DNS validation failed"
		if err != nil {
			errorMsg = err.Error()
		}

		result := &cache.CachedValidationResult{
			IsValid:     false,
			SyntaxValid: syntaxValid,
			DNSValid:    dnsValid,
			SMTPValid:   false,
			MXRecord:    "",
			ErrorReason: errorMsg,
		}
		if v.cache != nil {
			v.cache.SetValidationResult(ctx, email, result)
		}
		return false, syntaxValid, dnsValid, false, "", errorMsg, isDuplicate
	}

	// Step 3: SMTP validation (if enabled)
	if !v.verifyEnabled {
		// SMTP verification disabled - email is valid if Syntax and DNS pass
		result := &cache.CachedValidationResult{
			IsValid:     true,
			SyntaxValid: syntaxValid,
			DNSValid:    dnsValid,
			SMTPValid:   true,
			MXRecord:    mxRecord,
			ErrorReason: "",
		}
		if v.cache != nil {
			v.cache.SetValidationResult(ctx, email, result)
		}
		return true, syntaxValid, dnsValid, true, mxRecord, "", isDuplicate
	}

	// SMTP validation with retry
	var smtpValid bool
	var smtpErr error

	retryErr := RetryWithBackoff(ctx, v.retryConfig, func() error {
		smtpValid, smtpErr = v.ValidateSMTP(email, mxRecord)
		return smtpErr
	})

	// Handle SMTP validation result
	if !smtpValid && retryErr != nil && v.bypassOnBlacklist {
		errStr := retryErr.Error()
		// Check if error is due to blacklisting/blocking
		if strings.Contains(errStr, "blocked") ||
			strings.Contains(errStr, "Spamhaus") ||
			strings.Contains(errStr, "blacklist") ||
			strings.Contains(errStr, "Service unavailable") {
			// Email passes Syntax + DNS, so mark as valid despite SMTP blocking
			result := &cache.CachedValidationResult{
				IsValid:     true,
				SyntaxValid: syntaxValid,
				DNSValid:    dnsValid,
				SMTPValid:   false,
				MXRecord:    mxRecord,
				ErrorReason: "",
			}
			if v.cache != nil {
				v.cache.SetValidationResult(ctx, email, result)
			}
			return true, syntaxValid, dnsValid, false, mxRecord, "", isDuplicate
		}

		// Other SMTP errors - email might be invalid
		result := &cache.CachedValidationResult{
			IsValid:     false,
			SyntaxValid: syntaxValid,
			DNSValid:    dnsValid,
			SMTPValid:   smtpValid,
			MXRecord:    mxRecord,
			ErrorReason: errStr,
		}
		if v.cache != nil {
			v.cache.SetValidationResult(ctx, email, result)
		}
		return false, syntaxValid, dnsValid, smtpValid, mxRecord, errStr, isDuplicate
	}

	if !smtpValid && retryErr != nil {
		result := &cache.CachedValidationResult{
			IsValid:     false,
			SyntaxValid: syntaxValid,
			DNSValid:    dnsValid,
			SMTPValid:   smtpValid,
			MXRecord:    mxRecord,
			ErrorReason: retryErr.Error(),
		}
		if v.cache != nil {
			v.cache.SetValidationResult(ctx, email, result)
		}
		return false, syntaxValid, dnsValid, smtpValid, mxRecord, retryErr.Error(), isDuplicate
	}

	// Success
	result := &cache.CachedValidationResult{
		IsValid:     true,
		SyntaxValid: syntaxValid,
		DNSValid:    dnsValid,
		SMTPValid:   smtpValid,
		MXRecord:    mxRecord,
		ErrorReason: "",
	}
	if v.cache != nil {
		v.cache.SetValidationResult(ctx, email, result)
	}

	return true, syntaxValid, dnsValid, smtpValid, mxRecord, "", isDuplicate
}

// ValidateEmailBatchEnhanced validates multiple emails concurrently with enhancements
func (v *EnhancedEmailValidator) ValidateEmailBatchEnhanced(
	ctx context.Context,
	emails []string,
	progressChan chan<- models.ValidationResult,
) []models.ValidationResult {
	results := make([]models.ValidationResult, len(emails))
	semaphore := make(chan struct{}, v.concurrency)
	done := make(chan struct {
		index  int
		result models.ValidationResult
	}, len(emails))

	// Launch concurrent workers
	for i, email := range emails {
		go func(index int, emailAddr string) {
			semaphore <- struct{}{} // Acquire semaphore
			defer func() { <-semaphore }() // Release semaphore

			isValid, syntaxValid, dnsValid, smtpValid, mxRecord, errorReason, isDuplicate :=
				v.ValidateEmailEnhanced(ctx, emailAddr)

			result := models.ValidationResult{
				Email:       emailAddr,
				IsValid:     isValid,
				SyntaxValid: syntaxValid,
				DNSValid:    dnsValid,
				SMTPValid:   smtpValid,
				MXRecord:    mxRecord,
				ErrorReason: errorReason,
			}

			// Add duplicate flag if needed (you may need to extend the model)
			if isDuplicate && errorReason == "" {
				result.ErrorReason = "Duplicate email"
			}

			done <- struct {
				index  int
				result models.ValidationResult
			}{
				index:  index,
				result: result,
			}

			// Send progress update with result
			if progressChan != nil {
				progressChan <- result
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
