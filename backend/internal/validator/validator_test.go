package validator

import (
	"testing"
)

func TestValidateSyntax(t *testing.T) {
	validator := NewEmailValidator(10)

	tests := []struct {
		name     string
		email    string
		expected bool
	}{
		{"Valid email", "test@example.com", true},
		{"Valid with subdomain", "user@mail.company.com", true},
		{"Valid with plus", "user+tag@example.com", true},
		{"Valid with dots", "first.last@example.com", true},
		{"Valid with numbers", "user123@example.com", true},
		{"Invalid - no @", "invalidemail.com", false},
		{"Invalid - multiple @", "user@@example.com", false},
		{"Invalid - no domain", "user@", false},
		{"Invalid - no user", "@example.com", false},
		{"Invalid - spaces", "user name@example.com", false},
		{"Invalid - too short", "a@b.c", false},
		{"Invalid - no TLD", "user@domain", false},
		{"Invalid - special chars", "user!#$@example.com", false},
		{"Empty string", "", false},
		{"Just @", "@", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validator.ValidateSyntax(tt.email)
			if result != tt.expected {
				t.Errorf("ValidateSyntax(%q) = %v, want %v", tt.email, result, tt.expected)
			}
		})
	}
}

func TestValidateDNS(t *testing.T) {
	validator := NewEmailValidator(10)

	tests := []struct {
		name        string
		email       string
		shouldPass  bool
		shouldHaveMX bool
	}{
		{"Gmail", "test@gmail.com", true, true},
		{"Outlook", "test@outlook.com", true, true},
		{"Invalid domain", "test@invalid-domain-that-does-not-exist-12345.com", false, false},
		{"No MX record", "test@example.invalid", false, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid, mxRecord, err := validator.ValidateDNS(tt.email)

			if tt.shouldPass {
				if !isValid {
					t.Errorf("ValidateDNS(%q) should pass but failed: %v", tt.email, err)
				}
				if tt.shouldHaveMX && mxRecord == "" {
					t.Errorf("ValidateDNS(%q) should have MX record but got empty", tt.email)
				}
			} else {
				if isValid {
					t.Errorf("ValidateDNS(%q) should fail but passed", tt.email)
				}
			}
		})
	}
}

func TestValidateEmail(t *testing.T) {
	validator := NewEmailValidator(10)

	tests := []struct {
		name          string
		email         string
		expectValid   bool
		expectSyntax  bool
		expectDNS     bool
	}{
		{
			name:         "Valid Gmail",
			email:        "test@gmail.com",
			expectValid:  true,
			expectSyntax: true,
			expectDNS:    true,
		},
		{
			name:         "Invalid syntax",
			email:        "invalid-email",
			expectValid:  false,
			expectSyntax: false,
			expectDNS:    false,
		},
		{
			name:         "Valid syntax, invalid domain",
			email:        "test@nonexistent-domain-xyz.com",
			expectValid:  false,
			expectSyntax: true,
			expectDNS:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid, syntaxValid, dnsValid, _, _, _ := validator.ValidateEmail(tt.email)

			if isValid != tt.expectValid {
				t.Errorf("Expected valid=%v, got %v", tt.expectValid, isValid)
			}
			if syntaxValid != tt.expectSyntax {
				t.Errorf("Expected syntaxValid=%v, got %v", tt.expectSyntax, syntaxValid)
			}
			if dnsValid != tt.expectDNS {
				t.Errorf("Expected dnsValid=%v, got %v", tt.expectDNS, dnsValid)
			}
		})
	}
}

func BenchmarkValidateSyntax(b *testing.B) {
	validator := NewEmailValidator(10)
	email := "test@example.com"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		validator.ValidateSyntax(email)
	}
}

func BenchmarkValidateDNS(b *testing.B) {
	validator := NewEmailValidator(10)
	email := "test@gmail.com"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		validator.ValidateDNS(email)
	}
}
