package httpapi

import (
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

func itoa(id int64) string {
	return strconv.FormatInt(id, 10)
}

var slugInvalidChars = regexp.MustCompile(`[^a-z0-9-]+`)

// slugify produces a URL-safe slug from a display name. It does not
// guarantee uniqueness; callers must handle unique-constraint violations.
func slugify(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = strings.ReplaceAll(s, " ", "-")
	s = slugInvalidChars.ReplaceAllString(s, "")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "plugin"
	}
	return s
}

func fileModTime(path string) time.Time {
	if fi, err := os.Stat(path); err == nil {
		return fi.ModTime()
	}
	return time.Now()
}
