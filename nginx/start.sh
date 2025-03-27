#!/bin/sh


CERT_PATH="/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem"

# Create a dummy certificate if it doesn't exist yet
# This allows nginx to start even if the real certificate is not available
if [ ! -f "$CERT_PATH" ]; then
  echo "Generating dummy TLS cert for ${DOMAIN_NAME}..."
  mkdir -p /etc/letsencrypt/live/${DOMAIN_NAME}
  openssl req -x509 -nodes -newkey rsa:2048 \
    -days 1 \
    -keyout /etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem \
    -out /etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem \
    -subj "/CN=localhost"
fi

# Substitute env vars into config
envsubst '$DOMAIN_NAME' < /etc/nginx/default.conf > /etc/nginx/conf.d/default.conf

# Start nginx
nginx -g 'daemon off;'