# VPS Deployment Guide - CD App

## Server Specs
- **CPU:** Xeon E3-1240 v3
- **RAM:** 8GB DDR3
- **Storage:** 2 x 1TB HDD SATA
- **Provider:** NameCheap

---

## Prerequisites

### 1. Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install nginx (reverse proxy)
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

### 2. Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE USER fcapp WITH PASSWORD 'YOUR_STRONG_PASSWORD_HERE';
CREATE DATABASE fcapp OWNER fcapp;
GRANT ALL PRIVILEGES ON DATABASE fcapp TO fcapp;
\q
```

---

## Environment Variables

Create `/var/www/fcapp/.env`:

```env
# Database
DATABASE_URL="postgresql://fcapp:YOUR_STRONG_PASSWORD_HERE@localhost:5432/fcapp?schema=public"

# Authentication (REQUIRED - generate secure values!)
# Generate with: openssl rand -base64 48
JWT_SECRET="YOUR_32+_CHARACTER_SECRET_HERE"
SESSION_DURATION_DAYS=7

# Application
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV="production"

# Email Tracking
ENABLE_EMAIL_TRACKING="true"

# Cron Security (REQUIRED in production)
# Generate with: openssl rand -hex 32
CRON_SECRET="YOUR_CRON_SECRET_HERE"
```

### Generate Secure Secrets

```bash
# Generate JWT_SECRET (48 bytes base64)
openssl rand -base64 48

# Generate CRON_SECRET (32 bytes hex)
openssl rand -hex 32

# Generate Database Password
openssl rand -base64 24
```

---

## Deployment Steps

### 1. Clone and Setup

```bash
# Create app directory
sudo mkdir -p /var/www/fcapp
sudo chown $USER:$USER /var/www/fcapp

# Clone repository
cd /var/www
git clone YOUR_REPO_URL fcapp
cd fcapp/fcapp

# Install dependencies
npm install

# Copy and edit environment file
cp .env.production.example .env
nano .env  # Edit with your values
```

### 2. Database Setup

```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# (Optional) Seed initial data
npm run db:seed
```

### 3. Build Application

```bash
npm run build
```

### 4. Configure PM2

```bash
# Start with PM2
pm2 start npm --name "fcapp" -- start

# Save PM2 config
pm2 save

# Setup PM2 startup on boot
pm2 startup
```

### 5. Configure Nginx

Create `/etc/nginx/sites-available/fcapp`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/fcapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Setup SSL (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already configured by certbot)
sudo systemctl status certbot.timer
```

---

## Cron Jobs Setup

For email sync, add to crontab:

```bash
crontab -e
```

Add:
```cron
# Sync emails every 5 minutes
*/5 * * * * curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/email/cron-sync
```

---

## Maintenance Commands

```bash
# View logs
pm2 logs fcapp

# Restart app
pm2 restart fcapp

# Update application
cd /var/www/fcapp/fcapp
git pull
npm install
npm run build
pm2 restart fcapp

# Database backup
pg_dump -U fcapp fcapp > backup_$(date +%Y%m%d).sql
```

---

## Security Checklist

- [ ] Strong database password set
- [ ] JWT_SECRET is 32+ characters
- [ ] CRON_SECRET is set
- [ ] Firewall configured (UFW)
- [ ] SSL certificate installed
- [ ] Regular backups scheduled
- [ ] PM2 log rotation configured

---

## Firewall Setup

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

## Troubleshooting

### App won't start
```bash
pm2 logs fcapp --lines 100
```

### Database connection issues
```bash
# Test connection
psql -U fcapp -h localhost -d fcapp
```

### Nginx errors
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```
