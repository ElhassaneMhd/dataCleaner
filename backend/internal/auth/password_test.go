package auth

import (
	"testing"
)

func TestHashPassword(t *testing.T) {
	password := "mySecurePassword123"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	if hash == "" {
		t.Error("HashPassword returned empty string")
	}

	if hash == password {
		t.Error("HashPassword returned unhashed password")
	}

	// Hash should be different each time
	hash2, err := HashPassword(password)
	if err != nil {
		t.Fatalf("Second HashPassword failed: %v", err)
	}

	if hash == hash2 {
		t.Error("HashPassword should produce different hashes")
	}
}

func TestCheckPassword(t *testing.T) {
	password := "mySecurePassword123"
	wrongPassword := "wrongPassword"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	// Correct password should match
	if !CheckPassword(hash, password) {
		t.Error("CheckPassword failed for correct password")
	}

	// Wrong password should not match
	if CheckPassword(hash, wrongPassword) {
		t.Error("CheckPassword succeeded for wrong password")
	}

	// Empty password should not match
	if CheckPassword(hash, "") {
		t.Error("CheckPassword succeeded for empty password")
	}
}

func TestCheckPasswordEdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		password string
	}{
		{"Short password", "12345"},
		{"Long password", "this-is-a-very-long-password-with-many-characters-1234567890"},
		{"Special characters", "p@ssw0rd!@#$%^&*()"},
		{"Unicode", "пароль密码🔒"},
		{"Spaces", "password with spaces"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashPassword(tt.password)
			if err != nil {
				t.Fatalf("HashPassword failed: %v", err)
			}

			if !CheckPassword(hash, tt.password) {
				t.Errorf("CheckPassword failed for password: %q", tt.password)
			}
		})
	}
}

func BenchmarkHashPassword(b *testing.B) {
	password := "mySecurePassword123"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		HashPassword(password)
	}
}

func BenchmarkCheckPassword(b *testing.B) {
	password := "mySecurePassword123"
	hash, _ := HashPassword(password)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		CheckPassword(hash, password)
	}
}
