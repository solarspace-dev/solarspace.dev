#!/bin/sh

DUMMY_CERT_DIR="/etc/letsencrypt/dummy/${DOMAIN_NAME}"
LIVE_CERT_DIR="/etc/letsencrypt/live/${DOMAIN_NAME}"
LINK_CERT_DIR="/etc/letsencrypt/use/${DOMAIN_NAME}"

# Create a dummy certificate if it doesn't exist yet
# This allows nginx to start even if the real certificate is not available
# This block should only execute on the first run.
if [ ! -f "$DUMMY_CERT_DIR/fullchain.pem" ]; then
  echo "Generating dummy TLS cert for ${DOMAIN_NAME}..."
  mkdir -p $DUMMY_CERT_DIR
  openssl req -x509 -nodes -newkey rsa:2048 \
    -days 1 \
    -keyout $DUMMY_CERT_DIR/privkey.pem \
    -out /$DUMMY_CERT_DIR/fullchain.pem \
    -subj "/CN=localhost"

  # Always link to dummy initially
  mkdir -p "$(dirname "$LINK_CERT_DIR")"
  ln -sfn "$DUMMY_CERT_DIR" "$LINK_CERT_DIR"
fi

# Substitute env vars into config
envsubst '$DOMAIN_NAME' < /etc/nginx/default.conf > /etc/nginx/conf.d/default.conf

# Start nginx
nginx -g 'daemon off;'