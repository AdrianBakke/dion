put csr.pem and key.pem here

- Remember to open port 443 in your firewall settings if necessary.
- If you are deploying this on a live server, consider using a reverse proxy like Nginx to handle SSL termination and forward requests to your Node.js application. This configuration often simplifies the process of obtaining and renewing SSL certificates.

# Generate a private key
openssl genrsa -out key.pem 2048

# Generate a certificate signing request (CSR)
openssl req -new -key key.pem -out csr.pem

# Generate a self-signed certificate
openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem

### Using Let's Encrypt for Production

For a production environment, you should use a trusted Certificate Authority(CA) like Let's Encrypt to obtain a valid certificate:

1. ** Install Certbot **:
- Certbot is a tool to automate obtaining and renewing Let's Encrypt certificates. Install it by following the instructions on [Certbot's website](https://certbot.eff.org/).

    2. ** Generate a Certificate **:
- Use Certbot to generate a certificate for your domain.You might need to use a web server like Nginx or Apache to complete the verification process.

   ```bash
   sudo certbot certonly --standalone -d yourdomain.com
   ```

    - Follow the prompts to complete the domain validation and certificate issuance.

3. ** Renewal **:
- Let's Encrypt certificates are valid for 90 days, and Certbot can automatically renew them. You can schedule a cron job to automate this process.

