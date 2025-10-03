package main

import (
	"datacleaner/internal/handlers"
	ws "datacleaner/internal/websocket"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/websocket/v2"
)

func main() {
	app := fiber.New(fiber.Config{
		BodyLimit: 500 * 1024 * 1024, // 500MB max file size
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	// Initialize WebSocket manager
	wsManager := ws.NewManager()
	go wsManager.Run()

	// Initialize handler
	h := handlers.NewHandler(wsManager)

	// Routes
	api := app.Group("/api")

	// Upload and validate
	api.Post("/upload", h.UploadAndValidate)

	// Get job status
	api.Get("/jobs/:jobId/status", h.GetJobStatus)

	// Get validation results (counts only)
	api.Get("/jobs/:jobId/results", h.GetValidationResults)

	// Get paginated MX groups list
	api.Get("/jobs/:jobId/mx-groups", h.GetMXGroupsList)

	// Get paginated emails for specific MX group
	api.Get("/jobs/:jobId/mx-group", h.GetMXGroupPaginated)

	// Export valid emails (single file)
	api.Get("/jobs/:jobId/export/valid", h.ExportValidEmails)

	// Export invalid emails (single file)
	api.Get("/jobs/:jobId/export/invalid", h.ExportInvalidEmails)

	// Export all MX groups (zip file with multiple files)
	api.Get("/jobs/:jobId/export/mx-all", h.ExportByMX)

	// Export selected MX groups (POST with mxRecords array)
	api.Post("/jobs/:jobId/export/mx-selected", h.ExportSelectedMXGroups)

	// Configure SMTP validation settings
	api.Post("/config/smtp", h.ConfigureSMTP)

	// Get current SMTP configuration
	api.Get("/config/smtp", h.GetSMTPConfig)

	// WebSocket endpoint for real-time job status updates
	app.Get("/ws/:jobId", func(c *fiber.Ctx) error {
		jobID := c.Params("jobId")

		// Check if it's a websocket upgrade request
		if websocket.IsWebSocketUpgrade(c) {
			return websocket.New(func(conn *websocket.Conn) {
				h.HandleWebSocketWithJobID(conn, jobID)
			})(c)
		}
		return fiber.ErrUpgradeRequired
	})

	// Health check
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	log.Println("Server starting on :8080")
	log.Println("SMTP Configuration:")
	log.Println("  - Default From Email: verify@datacleaner.local")
	log.Println("  - Default HELO Hostname: datacleaner.local")
	log.Println("  - SMTP Enabled: true")
	log.Println("  - Bypass on Blacklist: true")
	log.Println("")
	log.Println("To configure SMTP settings, use:")
	log.Println("  POST /api/config/smtp")
	log.Println("  Body: {\"fromEmail\": \"your@email.com\", \"heloHostname\": \"yourdomain.com\", \"smtpEnabled\": true, \"bypassBlacklist\": true}")
	log.Fatal(app.Listen(":8080"))
}
