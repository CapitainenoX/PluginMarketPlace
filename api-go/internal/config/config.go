// Package config loads server configuration from environment variables with
// sane local-dev defaults. See api-go/.env.example for the full list.
package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port                 string
	DBPath               string
	UploadDir            string
	CORSAllowedOrigin    string
	InternalSharedSecret string
	WorkerInternalURL    string
	DevAutoApprove       bool
	CookieSecure         bool
	MaxUploadBytes       int64
}

func Load() Config {
	return Config{
		Port:                 getEnv("PORT", "8080"),
		DBPath:               getEnv("DB_PATH", "./data/marketplace.db"),
		UploadDir:            getEnv("UPLOAD_DIR", "./data/uploads"),
		CORSAllowedOrigin:    getEnv("CORS_ALLOWED_ORIGIN", "http://localhost:3000"),
		InternalSharedSecret: getEnv("INTERNAL_SHARED_SECRET", ""),
		WorkerInternalURL:    getEnv("WORKER_INTERNAL_URL", ""),
		DevAutoApprove:       getEnvBool("DEV_AUTO_APPROVE", true),
		CookieSecure:         getEnvBool("COOKIE_SECURE", false),
		MaxUploadBytes:       100 << 20, // 100MB, per plan
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}
