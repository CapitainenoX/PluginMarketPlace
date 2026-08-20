package auth

import (
	"crypto/rand"
	"encoding/base64"
)

// GenerateAPIKey returns a full bearer token like "mcmk_full_<random>" plus
// a short, non-secret prefix (safe to display in dashboard listings) and the
// hash to persist. The full token is returned to the caller exactly once.
func GenerateAPIKey(scope string) (fullToken, prefix, hash string, err error) {
	raw := make([]byte, 24)
	if _, err = rand.Read(raw); err != nil {
		return "", "", "", err
	}
	fullToken = "mcmk_" + scope + "_" + base64.RawURLEncoding.EncodeToString(raw)
	prefix = fullToken[:min(len(fullToken), 16)]
	hash = HashToken(fullToken)
	return fullToken, prefix, hash, nil
}
