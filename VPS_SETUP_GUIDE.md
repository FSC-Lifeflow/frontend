# VPS Setup Guide - One-Time Configuration

This guide covers the **one-time setup** required on your VPS to support the modular backend architecture.

---

## 🎯 Overview

The refactored backend requires:
1. Backend files (`routes/`, `services/`, `server.js`) - ✅ Auto-deployed via git
2. Environment variables (`.env.server`) - ⚠️ **Manual setup required**
3. PM2 process manager - ⚠️ **Manual setup required**

---

## 📋 Step 1: Create .env.server on VPS

**CRITICAL:** The `.env.server` file is **NOT** in git (for security) and must be manually created on the VPS.

### SSH into VPS
```bash
ssh your-user@your-vps-ip
```

### Navigate to Project
```bash
cd /var/www/rsweeting/frontend
```

### Create .env.server File
```bash
nano .env.server
```

### Add Required Variables
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Fitbit OAuth Credentials
FITBIT_CLIENT_ID=your-fitbit-client-id
FITBIT_CLIENT_SECRET=your-fitbit-client-secret

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback

# n8n Integration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
```

### Save and Exit
- Press `Ctrl + O` to save
- Press `Enter` to confirm
- Press `Ctrl + X` to exit

### Verify File
```bash
cat .env.server
# Should display all your environment variables
```

### Set Proper Permissions
```bash
chmod 600 .env.server  # Only owner can read/write
```

---

## 🚀 Step 2: Install and Configure PM2

PM2 is a process manager that keeps your Node.js backend running.

### Install PM2 Globally (if not already installed)
```bash
npm install -g pm2
```

### Start Backend with PM2
```bash
cd /var/www/rsweeting/frontend
pm2 start server.js --name "lifeflow-backend"
```

### Save PM2 Configuration
```bash
pm2 save
```

### Enable PM2 Auto-Start on Reboot
```bash
pm2 startup
# Follow the instructions printed (usually copy/paste a command)
```

### Verify PM2 is Running
```bash
pm2 list
# Should show "lifeflow-backend" as "online"

pm2 logs --lines 20
# Should show "Server running on http://localhost:3001"
```

---

## 🔧 Step 3: Configure Nginx (if using)

If you're using Nginx as a reverse proxy, ensure it's configured to proxy to port 3001.

### Check Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/your-domain.com
```

### Required Proxy Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (static files)
    location / {
        root /var/www/rsweeting/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API (proxy to Node.js)
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # OAuth callback routes
    location /auth/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Test and Reload Nginx
```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx  # Reload if test passes
```

---

## ✅ Step 4: Verify Setup

### Test Backend Directly
```bash
curl http://localhost:3001/api/fitbit/status?userId=test
# Should return JSON (not 404)
```

### Test Through Nginx
```bash
curl https://your-domain.com/api/fitbit/status?userId=test
# Should return JSON (not 404)
```

### Check PM2 Status
```bash
pm2 status
pm2 logs --lines 50
```

### Check All Route Files Exist
```bash
ls -la routes/
# Should show: chat.js, fitbit.js, google.js, fitbitData.js

ls -la services/
# Should show: tokenService.js
```

---

## 🔄 Future Deployments

Once this one-time setup is complete, future deployments are **fully automated** via GitHub Actions:

1. Push to `production` branch
2. GitHub Actions workflow runs automatically
3. Code is pulled, dependencies installed, frontend built
4. Backend is restarted with `pm2 reload all`
5. Zero-downtime deployment! 🎉

---

## 🆘 Troubleshooting

### Backend Won't Start
```bash
# Check PM2 logs
pm2 logs --lines 100

# Common issues:
# - Missing .env.server file
# - Invalid environment variables
# - Port 3001 already in use
# - Missing node_modules (run: npm ci)
```

### Routes Return 404
```bash
# Verify route files exist
ls -la routes/ services/

# Check server.js is loading routes
pm2 logs | grep "Server running"

# Restart PM2
pm2 restart all
```

### Environment Variables Not Loading
```bash
# Verify .env.server exists
cat .env.server

# Restart PM2 to reload env vars
pm2 restart all
pm2 logs --lines 20
```

### PM2 Not Auto-Starting on Reboot
```bash
# Re-run startup command
pm2 startup
# Follow instructions

# Save configuration
pm2 save
```

---

## 📚 Related Documentation

- **DEPLOYMENT_CHECKLIST.md** - Pre-deployment verification
- **BACKEND_ROUTES_GUIDE.md** - Complete API documentation
- **.github/workflows/deploy.yml** - Automated deployment workflow

---

## 🎯 Quick Reference Commands

```bash
# SSH into VPS
ssh your-user@your-vps-ip

# Navigate to project
cd /var/www/rsweeting/frontend

# Check PM2 status
pm2 status
pm2 logs --lines 50

# Restart backend
pm2 restart all

# Pull latest code manually
git pull origin production
npm ci
npm run build
pm2 reload all

# View environment variables
cat .env.server

# Test endpoints
curl http://localhost:3001/api/fitbit/status?userId=test
```

---

**Last Updated:** 2025-10-07
