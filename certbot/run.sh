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

echo "Certbot finished. Please run: docker exec nginx nginx -s reload"
