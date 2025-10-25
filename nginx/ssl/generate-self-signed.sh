#!/bin/bash

# Generate self-signed SSL certificates for development/testing
# This script creates certificates for openaero.cn domain

echo "Generating self-signed SSL certificates for openaero.cn..."

# Generate private key
openssl genrsa -out privkey.pem 2048

# Generate certificate signing request
openssl req -new -key privkey.pem -out cert.csr -subj "/C=CN/ST=Beijing/L=Beijing/O=OpenAero/OU=IT Department/CN=openaero.cn/emailAddress=admin@openaero.cn"

# Generate self-signed certificate
openssl x509 -req -in cert.csr -signkey privkey.pem -out fullchain.pem -days 365 -extensions v3_req -extfile <(
cat <<EOF
[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = openaero.cn
DNS.2 = www.openaero.cn
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF
)

# Copy fullchain.pem to openaero.cn.crt for www redirect
cp fullchain.pem openaero.cn.crt
cp privkey.pem openaero.cn.key

# Clean up CSR file
rm cert.csr

echo "SSL certificates generated successfully!"
echo "Files created:"
echo "  - fullchain.pem (certificate)"
echo "  - privkey.pem (private key)"
echo "  - openaero.cn.crt (certificate copy)"
echo "  - openaero.cn.key (private key copy)"
echo ""
echo "Note: These are self-signed certificates for development/testing only."
echo "For production, use certificates from a trusted CA like Let's Encrypt."