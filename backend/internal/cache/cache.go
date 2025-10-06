package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// Cache interface for different cache implementations
type Cache interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value string, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	Exists(ctx context.Context, key string) (bool, error)
	Close() error
}

// MemoryCache is an in-memory cache implementation
type MemoryCache struct {
	data map[string]*cacheItem
	mu   sync.RWMutex
}

type cacheItem struct {
	value      string
	expiration time.Time
}

// NewMemoryCache creates a new in-memory cache
func NewMemoryCache() *MemoryCache {
	cache := &MemoryCache{
		data: make(map[string]*cacheItem),
	}

	// Start cleanup goroutine
	go cache.cleanup()

	return cache
}

func (c *MemoryCache) Get(ctx context.Context, key string) (string, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, exists := c.data[key]
	if !exists {
		return "", fmt.Errorf("key not found")
	}

	if time.Now().After(item.expiration) {
		return "", fmt.Errorf("key expired")
	}

	return item.value, nil
}

func (c *MemoryCache) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.data[key] = &cacheItem{
		value:      value,
		expiration: time.Now().Add(ttl),
	}

	return nil
}

func (c *MemoryCache) Delete(ctx context.Context, key string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.data, key)
	return nil
}

func (c *MemoryCache) Exists(ctx context.Context, key string) (bool, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, exists := c.data[key]
	if !exists {
		return false, nil
	}

	if time.Now().After(item.expiration) {
		return false, nil
	}

	return true, nil
}

func (c *MemoryCache) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.data = make(map[string]*cacheItem)
	return nil
}

// cleanup removes expired items periodically
func (c *MemoryCache) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for key, item := range c.data {
			if now.After(item.expiration) {
				delete(c.data, key)
			}
		}
		c.mu.Unlock()
	}
}

// DNSCache wraps a cache for DNS/MX lookups
type DNSCache struct {
	cache Cache
	ttl   time.Duration
}

// NewDNSCache creates a new DNS cache
func NewDNSCache(cache Cache, ttl time.Duration) *DNSCache {
	return &DNSCache{
		cache: cache,
		ttl:   ttl,
	}
}

// GetMX retrieves cached MX record for a domain
func (c *DNSCache) GetMX(ctx context.Context, domain string) (string, bool) {
	key := fmt.Sprintf("mx:%s", domain)
	value, err := c.cache.Get(ctx, key)
	if err != nil {
		return "", false
	}
	return value, true
}

// SetMX caches MX record for a domain
func (c *DNSCache) SetMX(ctx context.Context, domain, mxRecord string) error {
	key := fmt.Sprintf("mx:%s", domain)
	return c.cache.Set(ctx, key, mxRecord, c.ttl)
}

// GetDNSValid retrieves cached DNS validation result
func (c *DNSCache) GetDNSValid(ctx context.Context, domain string) (bool, bool) {
	key := fmt.Sprintf("dns:%s", domain)
	value, err := c.cache.Get(ctx, key)
	if err != nil {
		return false, false
	}
	return value == "true", true
}

// SetDNSValid caches DNS validation result
func (c *DNSCache) SetDNSValid(ctx context.Context, domain string, isValid bool) error {
	key := fmt.Sprintf("dns:%s", domain)
	value := "false"
	if isValid {
		value = "true"
	}
	return c.cache.Set(ctx, key, value, c.ttl)
}

// CachedValidationResult represents a cached validation result
type CachedValidationResult struct {
	IsValid     bool   `json:"isValid"`
	SyntaxValid bool   `json:"syntaxValid"`
	DNSValid    bool   `json:"dnsValid"`
	SMTPValid   bool   `json:"smtpValid"`
	MXRecord    string `json:"mxRecord"`
	ErrorReason string `json:"errorReason"`
}

// GetValidationResult retrieves cached validation result for an email
func (c *DNSCache) GetValidationResult(ctx context.Context, email string) (*CachedValidationResult, bool) {
	key := fmt.Sprintf("validation:%s", email)
	value, err := c.cache.Get(ctx, key)
	if err != nil {
		return nil, false
	}

	var result CachedValidationResult
	if err := json.Unmarshal([]byte(value), &result); err != nil {
		return nil, false
	}

	return &result, true
}

// SetValidationResult caches validation result for an email
func (c *DNSCache) SetValidationResult(ctx context.Context, email string, result *CachedValidationResult) error {
	key := fmt.Sprintf("validation:%s", email)
	data, err := json.Marshal(result)
	if err != nil {
		return err
	}
	return c.cache.Set(ctx, key, string(data), c.ttl)
}
