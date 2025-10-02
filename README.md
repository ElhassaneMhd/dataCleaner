# Data Cleaner - Email Validator Platform

A high-performance email validation and cleaning platform built with Go and React + TypeScript. Validates email addresses using syntax checks, DNS/MX lookups, and SMTP verification, then groups them by MX records for organized exports.

## Features

### Section 1: Email Validation
- **Upload CSV/Excel files** with contact data
- **Triple-layer validation**:
  - Syntax validation (RFC compliant)
  - DNS/MX record verification
  - SMTP server verification (100% accuracy)
- Filter out invalid/non-existent emails
- Real-time progress tracking

### Section 2: MX-Based Grouping
- Automatically group valid emails by their MX records
- Export to multiple formats (CSV, Excel)
- Bulk export all valid emails or separate files per MX record
- Download as ZIP archive for easy distribution

## Tech Stack

### Backend (Go)
- **Go 1.21+** - High-performance concurrent processing
- **Fiber** - Fast HTTP framework
- **Excelize** - Excel file processing
- Worker pool pattern for parallel email validation
- Handles 1M+ rows efficiently

### Frontend (React + TypeScript)
- **React 18** - Modern UI library
- **TypeScript** - Type safety
- **TanStack Query** - API state management
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool

## Architecture

```
Upload → Stream Parse → Validation Queue → [Syntax → DNS/MX → SMTP] → Store Valid → Group by MX → Export
```

## Installation

### Prerequisites
- Go 1.21 or higher
- Node.js 18+ and npm
- Git

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Go dependencies
go mod download

# Run the server
go run cmd/server/main.go
```

The backend server will start on `http://localhost:8080`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on `http://localhost:3000`

## Usage

1. **Upload File**
   - Drag and drop or select a CSV/Excel file
   - File must contain an "email" column
   - Supports files with 1M+ rows

2. **Monitor Progress**
   - Real-time validation progress
   - View statistics (total, processed, valid, invalid)
   - Processing runs in background with 100 concurrent workers

3. **View Results**
   - **Valid Emails Tab**: See all verified emails with MX records
   - **Invalid Emails Tab**: Review failed validations with reasons
   - **MX Groups Tab**: Browse emails grouped by mail server

4. **Export Data**
   - **Export CSV/Excel**: Download all valid emails in single file
   - **Export by MX (ZIP)**: Download separate files per MX record
   - Choose between CSV or Excel format

## API Endpoints

### POST `/api/upload`
Upload and start validation
- **Body**: `multipart/form-data` with file
- **Response**: Job ID and status

### GET `/api/jobs/:jobId/status`
Get validation progress
- **Response**: Job status, progress, statistics

### GET `/api/jobs/:jobId/results`
Get validation results
- **Response**: Valid emails, invalid emails, MX groups

### GET `/api/jobs/:jobId/export/valid?format=csv|excel`
Export all valid emails
- **Query**: `format` (csv or excel)
- **Response**: File download

### GET `/api/jobs/:jobId/export/mx?format=csv|excel`
Export emails grouped by MX as ZIP
- **Query**: `format` (csv or excel)
- **Response**: ZIP file download

## Performance

- **Concurrent Processing**: 100 parallel email validations
- **Streaming Parser**: Memory-efficient file processing
- **Rate Limiting**: Prevents SMTP server blocks
- **Scalability**: Handles 1M+ records without issues
- **Speed**: Go's concurrency processes thousands of emails per minute

## File Format Requirements

### CSV Format
```csv
email,fname,lname,name
john@example.com,John,Doe,John Doe
jane@example.com,Jane,Smith,Jane Smith
```

### Excel Format
- First row must contain headers
- Must include an "email" column
- Supports .xlsx and .xls formats

## Project Structure

```
dataCleaner/
├── backend/
│   ├── cmd/server/          # Main application entry
│   ├── internal/
│   │   ├── handlers/        # HTTP handlers
│   │   ├── validator/       # Email validation logic
│   │   ├── parser/          # File parsing (CSV/Excel)
│   │   ├── grouper/         # MX grouping & export
│   │   └── models/          # Data models
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API client
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Configuration

### Backend Configuration
Edit `backend/cmd/server/main.go`:
- Port: Default `8080`
- Body limit: Default `100MB`
- CORS: Configured for all origins

### Frontend Configuration
Edit `frontend/vite.config.ts`:
- Dev port: Default `3000`
- API proxy: Points to `http://localhost:8080`

### Validator Configuration
Edit `backend/internal/handlers/handlers.go`:
- Concurrency: Default `100` (line 25)
- Timeout: Default `10s` per email

## Troubleshooting

### SMTP Verification Fails
- Some mail servers block SMTP verification
- Reduce concurrency to avoid rate limiting
- Check firewall settings for port 25

### Large File Timeout
- Increase timeout in validator configuration
- Process in smaller batches
- Ensure adequate server resources

### Memory Issues
- Files are streamed to minimize memory usage
- Check available RAM for very large files (10M+ rows)
- Consider chunking extremely large datasets

## Development

### Build for Production

Backend:
```bash
cd backend
go build -o datacleaner cmd/server/main.go
```

Frontend:
```bash
cd frontend
npm run build
```

### Run Tests
```bash
# Backend tests
cd backend
go test ./...

# Frontend tests (if configured)
cd frontend
npm test
```

## License

MIT

## Support

For issues, questions, or contributions, please open an issue on GitHub.
