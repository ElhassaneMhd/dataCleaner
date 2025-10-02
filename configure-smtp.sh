#!/bin/bash

# Bash script to configure SMTP validation settings

FROM_EMAIL="${1:-verify@datacleaner.local}"
HELO_HOSTNAME="${2:-datacleaner.local}"
SMTP_ENABLED="${3:-true}"
BYPASS_BLACKLIST="${4:-true}"
SERVER_URL="${5:-http://localhost:8080}"

echo "=================================================="
echo "       SMTP Validation Configuration Tool        "
echo "=================================================="
echo ""

# Create JSON payload
CONFIG=$(cat <<EOF
{
  "fromEmail": "$FROM_EMAIL",
  "heloHostname": "$HELO_HOSTNAME",
  "smtpEnabled": $SMTP_ENABLED,
  "bypassBlacklist": $BYPASS_BLACKLIST
}
EOF
)

echo "Configuration to apply:"
echo "$CONFIG"
echo ""

# Send configuration to server
RESPONSE=$(curl -s -X POST "$SERVER_URL/api/config/smtp" \
  -H "Content-Type: application/json" \
  -d "$CONFIG")

if [ $? -eq 0 ]; then
    echo "✓ Configuration updated successfully!"
    echo ""
    echo "Active Configuration:"
    echo "  From Email:        $FROM_EMAIL"
    echo "  HELO Hostname:     $HELO_HOSTNAME"
    echo "  SMTP Enabled:      $SMTP_ENABLED"
    echo "  Bypass Blacklist:  $BYPASS_BLACKLIST"
    echo ""
else
    echo "✗ Failed to update configuration"
    echo "Make sure the backend server is running on $SERVER_URL"
    echo ""
fi

echo "=================================================="
echo ""
echo "Examples:"
echo ""
echo "1. Use different email address:"
echo "   ./configure-smtp.sh test@example.com example.com"
echo ""
echo "2. Disable SMTP validation:"
echo "   ./configure-smtp.sh verify@datacleaner.local datacleaner.local false"
echo ""
echo "3. Enable strict SMTP (no blacklist bypass):"
echo "   ./configure-smtp.sh verify@datacleaner.local datacleaner.local true false"
echo ""
