package auth

import (
	"testing"
	"time"
)

func TestGenerateToken(t *testing.T) {
	manager := NewJWTManager("test-secret-key", 24)

	token, err := manager.GenerateToken("user123", "test@example.com", "user")
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	if token == "" {
		t.Error("GenerateToken returned empty token")
	}
}

func TestValidateToken(t *testing.T) {
	manager := NewJWTManager("test-secret-key", 24)

	userID := "user123"
	email := "test@example.com"
	role := "admin"

	token, err := manager.GenerateToken(userID, email, role)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	claims, err := manager.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("Expected UserID=%s, got %s", userID, claims.UserID)
	}

	if claims.Email != email {
		t.Errorf("Expected Email=%s, got %s", email, claims.Email)
	}

	if claims.Role != role {
		t.Errorf("Expected Role=%s, got %s", role, claims.Role)
	}
}

func TestValidateTokenInvalid(t *testing.T) {
	manager := NewJWTManager("test-secret-key", 24)

	tests := []struct {
		name  string
		token string
	}{
		{"Empty token", ""},
		{"Invalid token", "invalid.token.here"},
		{"Malformed token", "not-a-jwt-token"},
		{"Random string", "abcdef123456"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := manager.ValidateToken(tt.token)
			if err == nil {
				t.Error("ValidateToken should fail for invalid token")
			}
		})
	}
}

func TestValidateTokenWrongSecret(t *testing.T) {
	manager1 := NewJWTManager("secret1", 24)
	manager2 := NewJWTManager("secret2", 24)

	token, _ := manager1.GenerateToken("user123", "test@example.com", "user")

	_, err := manager2.ValidateToken(token)
	if err == nil {
		t.Error("ValidateToken should fail when using wrong secret")
	}
}

func TestRefreshToken(t *testing.T) {
	manager := NewJWTManager("test-secret-key", 24)

	originalToken, err := manager.GenerateToken("user123", "test@example.com", "user")
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	time.Sleep(1 * time.Second)

	newToken, err := manager.RefreshToken(originalToken)
	if err != nil {
		t.Fatalf("RefreshToken failed: %v", err)
	}

	if newToken == "" {
		t.Error("RefreshToken returned empty token")
	}

	if newToken == originalToken {
		t.Error("RefreshToken should generate a new token")
	}

	// Validate the new token
	claims, err := manager.ValidateToken(newToken)
	if err != nil {
		t.Fatalf("ValidateToken failed for refreshed token: %v", err)
	}

	if claims.UserID != "user123" {
		t.Error("Refreshed token has incorrect UserID")
	}
}

func TestTokenExpiry(t *testing.T) {
	// Create manager with 1 second expiry
	manager := NewJWTManager("test-secret-key", 0) // 0 hours = immediate expiry

	token, err := manager.GenerateToken("user123", "test@example.com", "user")
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	// Token should be immediately expired
	time.Sleep(2 * time.Second)

	_, err = manager.ValidateToken(token)
	if err == nil {
		t.Error("ValidateToken should fail for expired token")
	}
}

func BenchmarkGenerateToken(b *testing.B) {
	manager := NewJWTManager("test-secret-key", 24)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		manager.GenerateToken("user123", "test@example.com", "user")
	}
}

func BenchmarkValidateToken(b *testing.B) {
	manager := NewJWTManager("test-secret-key", 24)
	token, _ := manager.GenerateToken("user123", "test@example.com", "user")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		manager.ValidateToken(token)
	}
}
