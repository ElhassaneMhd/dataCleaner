package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Server     ServerConfig
	Database   DatabaseConfig
	Redis      RedisConfig
	Cache      CacheConfig
	Validator  ValidatorConfig
	SMTP       SMTPConfig
	Auth       AuthConfig
	FileUpload FileUploadConfig
	Cleanup    CleanupConfig
	Logging    LoggingConfig
	Env        string
}

type ServerConfig struct {
	Port        string
	Host        string
	BodyLimitMB int
	CORSOrigins string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type RedisConfig struct {
	Enabled  bool
	Host     string
	Port     string
	Password string
	DB       int
}

type CacheConfig struct {
	DNSCacheTTL int // seconds
	MXCacheTTL  int // seconds
}

type ValidatorConfig struct {
	Concurrency     int
	TimeoutSeconds  int
	MaxRetries      int
	RetryDelayMS    int
}

type SMTPConfig struct {
	// Verification VPS
	VerifyVPSHost      string
	VerifyVPSPort      int
	VerifyFromEmail    string
	VerifyHeloHostname string
	VerifyEnabled      bool
	BypassBlacklist    bool

	// Sending SMTP
	SendingHost        string
	SendingPort        int
	SendingUsername    string
	SendingPassword    string
	SendingFromEmail   string
	SendingTestEnabled bool
}

type AuthConfig struct {
	JWTSecret      string
	JWTExpiryHours int
}

type FileUploadConfig struct {
	MaxFileSizeMB         int
	AllowedFileExtensions []string
}

type CleanupConfig struct {
	Enabled        bool
	IntervalHours  int
	RetentionDays  int
}

type LoggingConfig struct {
	Level  string
	Format string
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		Server: ServerConfig{
			Port:        getEnv("SERVER_PORT", "8080"),
			Host:        getEnv("SERVER_HOST", "0.0.0.0"),
			BodyLimitMB: getEnvAsInt("BODY_LIMIT_MB", 500),
			CORSOrigins: getEnv("CORS_ORIGINS", "*"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			DBName:   getEnv("DB_NAME", "datacleaner"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Redis: RedisConfig{
			Enabled:  getEnvAsBool("REDIS_ENABLED", true),
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvAsInt("REDIS_DB", 0),
		},
		Cache: CacheConfig{
			DNSCacheTTL: getEnvAsInt("DNS_CACHE_TTL", 3600),
			MXCacheTTL:  getEnvAsInt("MX_CACHE_TTL", 3600),
		},
		Validator: ValidatorConfig{
			Concurrency:     getEnvAsInt("VALIDATOR_CONCURRENCY", 1000),
			TimeoutSeconds:  getEnvAsInt("VALIDATOR_TIMEOUT_SECONDS", 3),
			MaxRetries:      getEnvAsInt("VALIDATOR_MAX_RETRIES", 2),
			RetryDelayMS:    getEnvAsInt("VALIDATOR_RETRY_DELAY_MS", 500),
		},
		SMTP: SMTPConfig{
			VerifyVPSHost:      getEnv("VERIFY_VPS_HOST", ""),
			VerifyVPSPort:      getEnvAsInt("VERIFY_VPS_PORT", 25),
			VerifyFromEmail:    getEnv("VERIFY_FROM_EMAIL", "verify@datacleaner.local"),
			VerifyHeloHostname: getEnv("VERIFY_HELO_HOSTNAME", "datacleaner.local"),
			VerifyEnabled:      getEnvAsBool("VERIFY_ENABLED", false),
			BypassBlacklist:    getEnvAsBool("BYPASS_BLACKLIST", true),
			SendingHost:        getEnv("SENDING_HOST", ""),
			SendingPort:        getEnvAsInt("SENDING_PORT", 587),
			SendingUsername:    getEnv("SENDING_USERNAME", ""),
			SendingPassword:    getEnv("SENDING_PASSWORD", ""),
			SendingFromEmail:   getEnv("SENDING_FROM_EMAIL", ""),
			SendingTestEnabled: getEnvAsBool("SENDING_TEST_ENABLED", false),
		},
		Auth: AuthConfig{
			JWTSecret:      getEnv("JWT_SECRET", "change-this-to-a-secure-random-string-in-production"),
			JWTExpiryHours: getEnvAsInt("JWT_EXPIRY_HOURS", 24),
		},
		FileUpload: FileUploadConfig{
			MaxFileSizeMB:         getEnvAsInt("MAX_FILE_SIZE_MB", 500),
			AllowedFileExtensions: getEnvAsSlice("ALLOWED_FILE_EXTENSIONS", []string{".csv", ".xlsx", ".xls"}),
		},
		Cleanup: CleanupConfig{
			Enabled:       getEnvAsBool("CLEANUP_ENABLED", true),
			IntervalHours: getEnvAsInt("CLEANUP_INTERVAL_HOURS", 24),
			RetentionDays: getEnvAsInt("CLEANUP_RETENTION_DAYS", 7),
		},
		Logging: LoggingConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
		},
		Env: getEnv("ENV", "development"),
	}

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	if c.Auth.JWTSecret == "change-this-to-a-secure-random-string-in-production" && c.Env == "production" {
		return fmt.Errorf("JWT_SECRET must be changed in production")
	}

	if c.Validator.Concurrency < 1 {
		return fmt.Errorf("VALIDATOR_CONCURRENCY must be at least 1")
	}

	if c.Validator.TimeoutSeconds < 1 {
		return fmt.Errorf("VALIDATOR_TIMEOUT_SECONDS must be at least 1")
	}

	return nil
}

// GetDSN returns database connection string
func (c *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode)
}

// GetRedisAddr returns Redis address
func (c *RedisConfig) GetAddr() string {
	return fmt.Sprintf("%s:%s", c.Host, c.Port)
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := os.Getenv(key)
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := os.Getenv(key)
	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}
	return strings.Split(valueStr, ",")
}
