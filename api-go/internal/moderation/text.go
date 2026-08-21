// Package moderation applies lightweight, deterministic content checks to
// user-submitted free text (plugin name/summary/description, version
// changelog) before it's stored. It rejects two things outright: embedded
// links (this marketplace is self-contained — there's no legitimate reason
// for a plugin listing to carry an outbound URL, and it's the most common
// vector for phishing/malware links slipping into approved listings, including
// via edits made *after* a plugin was already approved) and a small blocklist
// of slurs/insults. It is not a substitute for human moderation of anything
// more subtle than that — see docs/SECURITY.md.
package moderation

import (
	"fmt"
	"regexp"
	"strings"
)

// linkPattern catches http(s) URLs, bare "www." hosts, and common
// shortener/TLD patterns (e.g. "bit.ly/x", "example.com/path") so obfuscated
// links ("go to evil . com") without the scheme still get caught in the
// common case of no added spaces.
var linkPattern = regexp.MustCompile(`(?i)(https?://|www\.|\b[a-z0-9-]+\.(com|net|org|io|gg|xyz|tk|ru|info|biz|link|click|top|shop|dev|app|co)\b(/\S*)?)`)

// blockedWords is a small, deliberately conservative list of slurs and
// harassment terms. Matched whole-word, case-insensitive. Not exhaustive —
// it exists to catch blunt, obvious abuse automatically; anything subtler
// still relies on the admin approval queue.
var blockedWords = []string{
	"nigger", "nigga", "faggot", "retard", "chink", "spic", "kike", "tranny",
	"connard", "enculé", "encule", "batard", "pute", "salope", "négro", "negro",
}

var wordPatterns = func() []*regexp.Regexp {
	out := make([]*regexp.Regexp, len(blockedWords))
	for i, w := range blockedWords {
		out[i] = regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(w) + `\b`)
	}
	return out
}()

// Check scans the given named fields and returns a human-readable error
// describing the first violation found, or "" if the text is clean.
func Check(fields map[string]string) string {
	for _, name := range []string{"name", "summary", "description", "changelog", "tags"} {
		text, ok := fields[name]
		if !ok || text == "" {
			continue
		}
		if linkPattern.MatchString(text) {
			return fmt.Sprintf("%s must not contain links or web addresses", name)
		}
		for _, re := range wordPatterns {
			if re.MatchString(text) {
				return fmt.Sprintf("%s contains language that isn't allowed here", name)
			}
		}
	}
	return ""
}

// CheckJoined is a convenience for callers that already have a slice of
// strings (e.g. tags) to fold into one field under a single name.
func CheckJoined(name string, values []string) string {
	return Check(map[string]string{name: strings.Join(values, " ")})
}
