#!/bin/sh
# แทนที่ ${RAILWAY_API_URL} ใน nginx config ด้วยค่าจริงจาก environment

set -e

# Default fallback
RAILWAY_API_URL=${RAILWAY_API_URL:-http://localhost:8080}

# Replace env var in nginx config
envsubst '${RAILWAY_API_URL}' < /etc/nginx/conf.d/default.conf > /tmp/default.conf
cp /tmp/default.conf /etc/nginx/conf.d/default.conf

echo "✅ Nginx configured with API URL: $RAILWAY_API_URL"

# Start nginx
exec nginx -g "daemon off;"
