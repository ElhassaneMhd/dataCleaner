package cache

import (
	"context"
	"testing"
	"time"
)

func TestMemoryCache(t *testing.T) {
	cache := NewMemoryCache()
	ctx := context.Background()

	// Test Set and Get
	err := cache.Set(ctx, "key1", "value1", 1*time.Minute)
	if err != nil {
		t.Fatalf("Set failed: %v", err)
	}

	value, err := cache.Get(ctx, "key1")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}

	if value != "value1" {
		t.Errorf("Expected value1, got %s", value)
	}

	// Test non-existent key
	_, err = cache.Get(ctx, "nonexistent")
	if err == nil {
		t.Error("Get should fail for non-existent key")
	}

	// Test Exists
	exists, err := cache.Exists(ctx, "key1")
	if err != nil {
		t.Fatalf("Exists failed: %v", err)
	}
	if !exists {
		t.Error("Exists should return true for existing key")
	}

	exists, err = cache.Exists(ctx, "nonexistent")
	if err != nil {
		t.Fatalf("Exists failed: %v", err)
	}
	if exists {
		t.Error("Exists should return false for non-existent key")
	}

	// Test Delete
	err = cache.Delete(ctx, "key1")
	if err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	_, err = cache.Get(ctx, "key1")
	if err == nil {
		t.Error("Get should fail after Delete")
	}
}

func TestMemoryCacheExpiry(t *testing.T) {
	cache := NewMemoryCache()
	ctx := context.Background()

	// Set with short TTL
	err := cache.Set(ctx, "expiring", "value", 100*time.Millisecond)
	if err != nil {
		t.Fatalf("Set failed: %v", err)
	}

	// Should exist immediately
	value, err := cache.Get(ctx, "expiring")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if value != "value" {
		t.Errorf("Expected value, got %s", value)
	}

	// Wait for expiry
	time.Sleep(200 * time.Millisecond)

	// Should be expired
	_, err = cache.Get(ctx, "expiring")
	if err == nil {
		t.Error("Get should fail for expired key")
	}
}

func TestDNSCache(t *testing.T) {
	memCache := NewMemoryCache()
	dnsCache := NewDNSCache(memCache, 1*time.Minute)
	ctx := context.Background()

	// Test MX caching
	err := dnsCache.SetMX(ctx, "example.com", "mx.example.com")
	if err != nil {
		t.Fatalf("SetMX failed: %v", err)
	}

	mxRecord, found := dnsCache.GetMX(ctx, "example.com")
	if !found {
		t.Error("GetMX should find cached MX record")
	}
	if mxRecord != "mx.example.com" {
		t.Errorf("Expected mx.example.com, got %s", mxRecord)
	}

	// Test DNS validation caching
	err = dnsCache.SetDNSValid(ctx, "example.com", true)
	if err != nil {
		t.Fatalf("SetDNSValid failed: %v", err)
	}

	isValid, found := dnsCache.GetDNSValid(ctx, "example.com")
	if !found {
		t.Error("GetDNSValid should find cached result")
	}
	if !isValid {
		t.Error("Expected isValid=true")
	}

	// Test negative caching
	err = dnsCache.SetDNSValid(ctx, "invalid.com", false)
	if err != nil {
		t.Fatalf("SetDNSValid failed: %v", err)
	}

	isValid, found = dnsCache.GetDNSValid(ctx, "invalid.com")
	if !found {
		t.Error("GetDNSValid should find cached result")
	}
	if isValid {
		t.Error("Expected isValid=false")
	}
}

func TestDNSCacheValidationResult(t *testing.T) {
	memCache := NewMemoryCache()
	dnsCache := NewDNSCache(memCache, 1*time.Minute)
	ctx := context.Background()

	result := &CachedValidationResult{
		IsValid:     true,
		SyntaxValid: true,
		DNSValid:    true,
		SMTPValid:   false,
		MXRecord:    "mx.gmail.com",
		ErrorReason: "",
	}

	err := dnsCache.SetValidationResult(ctx, "test@gmail.com", result)
	if err != nil {
		t.Fatalf("SetValidationResult failed: %v", err)
	}

	cached, found := dnsCache.GetValidationResult(ctx, "test@gmail.com")
	if !found {
		t.Error("GetValidationResult should find cached result")
	}

	if cached.IsValid != result.IsValid {
		t.Errorf("Expected IsValid=%v, got %v", result.IsValid, cached.IsValid)
	}
	if cached.MXRecord != result.MXRecord {
		t.Errorf("Expected MXRecord=%s, got %s", result.MXRecord, cached.MXRecord)
	}
}

func BenchmarkMemoryCacheSet(b *testing.B) {
	cache := NewMemoryCache()
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cache.Set(ctx, "key", "value", 1*time.Minute)
	}
}

func BenchmarkMemoryCacheGet(b *testing.B) {
	cache := NewMemoryCache()
	ctx := context.Background()
	cache.Set(ctx, "key", "value", 1*time.Minute)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cache.Get(ctx, "key")
	}
}
