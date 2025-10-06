package validator

import (
	"context"
	"fmt"
	"time"
)

// RetryConfig defines retry behavior
type RetryConfig struct {
	MaxRetries int
	RetryDelay time.Duration
}

// NewRetryConfig creates a new retry configuration
func NewRetryConfig(maxRetries int, retryDelayMS int) *RetryConfig {
	return &RetryConfig{
		MaxRetries: maxRetries,
		RetryDelay: time.Duration(retryDelayMS) * time.Millisecond,
	}
}

// RetryableError represents an error that can be retried
type RetryableError struct {
	Err       error
	Retryable bool
}

func (e *RetryableError) Error() string {
	return e.Err.Error()
}

// IsRetryable checks if an error is retryable
func IsRetryable(err error) bool {
	if err == nil {
		return false
	}

	errStr := err.Error()

	// Network errors - retryable
	if contains(errStr, "timeout") ||
		contains(errStr, "connection refused") ||
		contains(errStr, "connection reset") ||
		contains(errStr, "temporary failure") ||
		contains(errStr, "i/o timeout") ||
		contains(errStr, "EOF") {
		return true
	}

	// DNS errors - retryable
	if contains(errStr, "no such host") ||
		contains(errStr, "server misbehaving") {
		return true
	}

	// SMTP temporary errors (4xx) - retryable
	if contains(errStr, "451") || // Temporary local problem
		contains(errStr, "452") || // Insufficient system storage
		contains(errStr, "454") { // Temporary authentication failure
		return true
	}

	// Greylisting - retryable
	if contains(errStr, "try again later") ||
		contains(errStr, "greylist") {
		return true
	}

	return false
}

// RetryWithBackoff executes a function with exponential backoff
func RetryWithBackoff(ctx context.Context, cfg *RetryConfig, fn func() error) error {
	var lastErr error

	for attempt := 0; attempt <= cfg.MaxRetries; attempt++ {
		// Execute the function
		err := fn()
		if err == nil {
			return nil // Success
		}

		lastErr = err

		// Check if error is retryable
		if !IsRetryable(err) {
			return err // Not retryable, return immediately
		}

		// Don't sleep after the last attempt
		if attempt < cfg.MaxRetries {
			// Calculate backoff delay (exponential)
			delay := cfg.RetryDelay * time.Duration(1<<uint(attempt))

			// Max delay: 5 seconds
			if delay > 5*time.Second {
				delay = 5 * time.Second
			}

			// Check for context cancellation
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
				// Continue to next attempt
			}
		}
	}

	return fmt.Errorf("max retries exceeded: %w", lastErr)
}

func contains(s, substr string) bool {
	return len(s) > 0 && len(substr) > 0 &&
		(s == substr || len(s) >= len(substr) &&
		findSubstring(s, substr))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
