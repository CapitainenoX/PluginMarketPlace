package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"mcmarket/api/internal/config"
	"mcmarket/api/internal/db"
	"mcmarket/api/internal/httpapi"
)

func main() {
	cfg := config.Load()

	if dir := filepath.Dir(cfg.DBPath); dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			log.Fatalf("failed to create db directory: %v", err)
		}
	}
	if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
		log.Fatalf("failed to create upload directory: %v", err)
	}

	store, err := db.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer store.Close()

	if cfg.DevAutoApprove {
		log.Println("WARNING: DEV_AUTO_APPROVE is enabled — uploaded versions are approved immediately without scanning. Disable before Phase 4 / production.")
	}

	srv := httpapi.New(store, cfg)

	log.Printf("listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, srv.Router()); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
