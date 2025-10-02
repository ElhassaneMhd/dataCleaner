package grouper

import (
	"bytes"
	"encoding/csv"
	"fmt"

	"datacleaner/internal/models"

	"github.com/xuri/excelize/v2"
)

type MXGrouper struct{}

func NewMXGrouper() *MXGrouper {
	return &MXGrouper{}
}

// GroupByMX groups validation results by MX record
func (g *MXGrouper) GroupByMX(results []models.ValidationResult) map[string][]models.ValidationResult {
	groups := make(map[string][]models.ValidationResult)

	for _, result := range results {
		if result.IsValid && result.MXRecord != "" {
			groups[result.MXRecord] = append(groups[result.MXRecord], result)
		}
	}

	return groups
}

// ExportToCSV exports a group to CSV format
func (g *MXGrouper) ExportToCSV(results []models.ValidationResult) ([]byte, error) {
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Write header
	header := []string{"Email", "MX Record", "Syntax Valid", "DNS Valid", "SMTP Valid"}
	if err := writer.Write(header); err != nil {
		return nil, fmt.Errorf("failed to write CSV header: %v", err)
	}

	// Write data
	for _, result := range results {
		row := []string{
			result.Email,
			result.MXRecord,
			fmt.Sprintf("%t", result.SyntaxValid),
			fmt.Sprintf("%t", result.DNSValid),
			fmt.Sprintf("%t", result.SMTPValid),
		}
		if err := writer.Write(row); err != nil {
			return nil, fmt.Errorf("failed to write CSV row: %v", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, fmt.Errorf("CSV writer error: %v", err)
	}

	return buf.Bytes(), nil
}

// ExportToExcel exports a group to Excel format
func (g *MXGrouper) ExportToExcel(results []models.ValidationResult) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheetName := "ValidEmails"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		return nil, fmt.Errorf("failed to create sheet: %v", err)
	}

	// Write header
	headers := []string{"Email", "MX Record", "Syntax Valid", "DNS Valid", "SMTP Valid"}
	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheetName, cell, header)
	}

	// Write data
	for rowIdx, result := range results {
		row := rowIdx + 2 // Start from row 2 (1 is header)
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), result.Email)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), result.MXRecord)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), result.SyntaxValid)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), result.DNSValid)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), result.SMTPValid)
	}

	// Set active sheet
	f.SetActiveSheet(index)

	// Delete default sheet
	f.DeleteSheet("Sheet1")

	// Write to buffer
	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, fmt.Errorf("failed to write Excel file: %v", err)
	}

	return buf.Bytes(), nil
}

// ExportGroupedToMultipleFiles exports each MX group to separate files
func (g *MXGrouper) ExportGroupedToMultipleFiles(groups map[string][]models.ValidationResult, format string) (map[string][]byte, error) {
	files := make(map[string][]byte)

	for mxRecord, results := range groups {
		var data []byte
		var err error

		if format == "csv" {
			data, err = g.ExportToCSV(results)
		} else if format == "excel" {
			data, err = g.ExportToExcel(results)
		} else {
			return nil, fmt.Errorf("unsupported format: %s", format)
		}

		if err != nil {
			return nil, fmt.Errorf("failed to export group %s: %v", mxRecord, err)
		}

		// Use MX record as filename (sanitize for filesystem)
		filename := sanitizeFilename(mxRecord)
		files[filename] = data
	}

	return files, nil
}

// ExportAllToSingleFile exports all valid emails to a single file
func (g *MXGrouper) ExportAllToSingleFile(results []models.ValidationResult, format string) ([]byte, error) {
	if format == "csv" {
		return g.ExportToCSV(results)
	} else if format == "excel" {
		return g.ExportToExcel(results)
	}
	return nil, fmt.Errorf("unsupported format: %s", format)
}

// sanitizeFilename removes invalid characters from filename
func sanitizeFilename(filename string) string {
	// Replace dots with underscores (except file extension)
	// Remove other invalid characters
	invalid := []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|"}
	result := filename

	for _, char := range invalid {
		result = string(bytes.ReplaceAll([]byte(result), []byte(char), []byte("_")))
	}

	// Replace dots with dashes to avoid confusion
	result = string(bytes.ReplaceAll([]byte(result), []byte("."), []byte("-")))

	return result
}
