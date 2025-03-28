#!/bin/sh
sleep 10

echo "Requesting Let's Encrypt certificate for ${DOMAIN_NAME}..."

certbot certonly --webroot -w /var/www/certbot \
  --email "$EMAIL_ADDRESS" \
  --agree-tos \
  --no-eff-email \
  --non-interactive \
  --force-renewal \
  --cert-name "$DOMAIN_NAME" \
  -d "$DOMAIN_NAME" \
  -d "www.$DOMAIN_NAME"

# Switch symlink to point to real cert
REAL_CERT_DIR="/etc/letsencrypt/live/${DOMAIN_NAME}"
LINK_CERT_DIR="/etc/letsencrypt/use/${DOMAIN_NAME}"

echo "Switching symlink to real certificate..."
ln -sfn "$REAL_CERT_DIR" "$LINK_CERT_DIR"

echo "Certbot finished. Please run: docker exec nginx nginx -s reload"
