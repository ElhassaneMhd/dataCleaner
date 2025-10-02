# PowerShell script to configure SMTP validation settings

param(
    [string]$FromEmail = "verify@datacleaner.local",
    [string]$HeloHostname = "datacleaner.local",
    [bool]$SMTPEnabled = $true,
    [bool]$BypassBlacklist = $true,
    [string]$ServerUrl = "http://localhost:8080"
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "       SMTP Validation Configuration Tool        " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration object
$config = @{
    fromEmail = $FromEmail
    heloHostname = $HeloHostname
    smtpEnabled = $SMTPEnabled
    bypassBlacklist = $BypassBlacklist
} | ConvertTo-Json

Write-Host "Configuration to apply:" -ForegroundColor Yellow
Write-Host $config
Write-Host ""

try {
    # Send configuration to server
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/config/smtp" `
        -Method Post `
        -Body $config `
        -ContentType "application/json"

    Write-Host "✓ Configuration updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Active Configuration:" -ForegroundColor Green
    Write-Host "  From Email:        $FromEmail"
    Write-Host "  HELO Hostname:     $HeloHostname"
    Write-Host "  SMTP Enabled:      $SMTPEnabled"
    Write-Host "  Bypass Blacklist:  $BypassBlacklist"
    Write-Host ""
}
catch {
    Write-Host "✗ Failed to update configuration" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the backend server is running on $ServerUrl" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Examples
Write-Host "Examples:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Use different email address:" -ForegroundColor White
Write-Host "   .\configure-smtp.ps1 -FromEmail 'test@example.com' -HeloHostname 'example.com'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Disable SMTP validation completely:" -ForegroundColor White
Write-Host "   .\configure-smtp.ps1 -SMTPEnabled `$false" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Enable strict SMTP (no blacklist bypass):" -ForegroundColor White
Write-Host "   .\configure-smtp.ps1 -BypassBlacklist `$false" -ForegroundColor Gray
Write-Host ""
