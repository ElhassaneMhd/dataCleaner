package parser

import (
	"encoding/csv"
	"fmt"
	"io"
	"mime/multipart"
	"strings"

	"github.com/xuri/excelize/v2"
)

type FileParser struct {
	chunkSize int
}

func NewFileParser(chunkSize int) *FileParser {
	return &FileParser{
		chunkSize: chunkSize,
	}
}

// ParseFile determines file type and parses accordingly
func (p *FileParser) ParseFile(file *multipart.FileHeader) ([]map[string]string, []string, error) {
	src, err := file.Open()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to open file: %v", err)
	}
	defer src.Close()

	filename := strings.ToLower(file.Filename)

	if strings.HasSuffix(filename, ".csv") {
		return p.ParseCSV(src)
	} else if strings.HasSuffix(filename, ".xlsx") || strings.HasSuffix(filename, ".xls") {
		return p.ParseExcel(file)
	}

	return nil, nil, fmt.Errorf("unsupported file format. Please upload CSV or Excel files")
}

// ParseCSV parses CSV files
func (p *FileParser) ParseCSV(reader io.Reader) ([]map[string]string, []string, error) {
	csvReader := csv.NewReader(reader)
	csvReader.LazyQuotes = true
	csvReader.TrimLeadingSpace = true

	// Read header
	headers, err := csvReader.Read()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read CSV headers: %v", err)
	}

	// Normalize headers
	for i, header := range headers {
		headers[i] = strings.TrimSpace(header)
	}

	var records []map[string]string

	// Read all records
	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			// Skip malformed rows
			continue
		}

		recordMap := make(map[string]string)
		for i, value := range record {
			if i < len(headers) {
				recordMap[headers[i]] = strings.TrimSpace(value)
			}
		}
		records = append(records, recordMap)
	}

	return records, headers, nil
}

// ParseExcel parses Excel files
func (p *FileParser) ParseExcel(file *multipart.FileHeader) ([]map[string]string, []string, error) {
	src, err := file.Open()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to open Excel file: %v", err)
	}
	defer src.Close()

	f, err := excelize.OpenReader(src)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to parse Excel file: %v", err)
	}
	defer f.Close()

	// Get the first sheet
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, nil, fmt.Errorf("no sheets found in Excel file")
	}

	sheetName := sheets[0]
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read Excel rows: %v", err)
	}

	if len(rows) == 0 {
		return nil, nil, fmt.Errorf("Excel file is empty")
	}

	// First row is header
	headers := rows[0]
	for i, header := range headers {
		headers[i] = strings.TrimSpace(header)
	}

	var records []map[string]string

	// Process data rows
	for i := 1; i < len(rows); i++ {
		row := rows[i]
		recordMap := make(map[string]string)

		for j, value := range row {
			if j < len(headers) {
				recordMap[headers[j]] = strings.TrimSpace(value)
			}
		}
		records = append(records, recordMap)
	}

	return records, headers, nil
}

// ExtractEmails extracts email addresses from parsed records
func (p *FileParser) ExtractEmails(records []map[string]string) []string {
	emails := make([]string, 0, len(records))
	emailFields := []string{"email", "Email", "EMAIL", "e-mail", "E-mail", "mail"}

	for _, record := range records {
		// Try to find email field
		var email string
		for _, field := range emailFields {
			if val, exists := record[field]; exists && val != "" {
				email = val
				break
			}
		}

		// If found, add to list
		if email != "" {
			emails = append(emails, strings.TrimSpace(strings.ToLower(email)))
		}
	}

	return emails
}

// ExtractEmailsWithMetadata extracts emails with their associated data
func (p *FileParser) ExtractEmailsWithMetadata(records []map[string]string) []EmailRecord {
	emailRecords := make([]EmailRecord, 0, len(records))
	emailFields := []string{"email", "Email", "EMAIL", "e-mail", "E-mail", "mail"}

	for _, record := range records {
		// Try to find email field
		var email string
		for _, field := range emailFields {
			if val, exists := record[field]; exists && val != "" {
				email = val
				break
			}
		}

		if email != "" {
			emailRecords = append(emailRecords, EmailRecord{
				Email:    strings.TrimSpace(strings.ToLower(email)),
				Metadata: record,
			})
		}
	}

	return emailRecords
}

type EmailRecord struct {
	Email    string
	Metadata map[string]string
}
