# Deployment Checklist - Modular Backend

## 🎯 Pre-Deployment Checklist

Before deploying the refactored modular backend to production, ensure the following:

---

## 📁 1. File Structure on VPS

Verify these files/directories exist in `/var/www/rsweeting/frontend`:

```bash
# Required backend files
✅ server.js                    # Main server (56 lines)
✅ routes/                      # Route modules directory
  ├── chat.js                   # n8n webhook proxy
  ├── fitbit.js                 # Fitbit OAuth & API
  ├── google.js                 # Google Calendar OAuth & API
  └── fitbitData.js             # n8n Fitbit data integration
✅ services/                    # Services directory
  └── tokenService.js           # Token management service
✅ supabaseClient.js            # Supabase client config
✅ .env.server                  # Backend environment variables (CRITICAL!)
✅ package.json                 # Dependencies
✅ dist/                        # Built frontend files
```

---

## 🔐 2. Environment Variables (.env.server)

**CRITICAL:** The `.env.server` file must exist on the VPS with these variables:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Fitbit OAuth
FITBIT_CLIENT_ID=your-fitbit-client-id
FITBIT_CLIENT_SECRET=your-fitbit-client-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback

# n8n Integration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
```

### ⚠️ Security Notes:
- **DO NOT** commit `.env.server` to git (already in `.gitignore`)
- Manually create/update `.env.server` on VPS via SSH
- Use service role key for backend (bypasses RLS)

---

## 🚀 3. PM2 Configuration

Ensure PM2 is properly configured to run the modular backend:

### Check Current PM2 Status
```bash
pm2 list
pm2 logs
```

### Expected PM2 Process
```bash
# Should show server.js running
pm2 list
# ┌─────┬────────┬─────────┬─────────┬─────────┬──────────┐
# │ id  │ name   │ mode    │ ↺       │ status  │ cpu      │
# ├─────┼────────┼─────────┼─────────┼─────────┼──────────┤
# │ 0   │ server │ fork    │ 0       │ online  │ 0%       │
# └─────┴────────┴─────────┴─────────┴─────────┴──────────┘
```

### If PM2 Not Set Up
```bash
cd /var/www/rsweeting/frontend
pm2 start server.js --name "lifeflow-backend"
pm2 save
pm2 startup  # Follow instructions to enable auto-start on reboot
```

---

## 🧪 4. Post-Deployment Testing

After deployment, test all endpoints:

### Test Backend Health
```bash
# From VPS or local machine (replace with your domain)
curl https://your-domain.com/api/fitbit/status?userId=test
curl https://your-domain.com/api/google/status?userId=test
```

### Test Modular Routes
```bash
# Chat endpoint (n8n proxy)
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId": "test", "message": "Hello"}'

# Fitbit data endpoint (NEW)
curl https://your-domain.com/api/fitbit-data/test

# Fitbit data range (NEW)
curl "https://your-domain.com/api/fitbit-data/test/range?startDate=2025-10-01&endDate=2025-10-07"
```

### Check PM2 Logs
```bash
pm2 logs --lines 50
```

---

## 🔄 5. Deployment Workflow Updates

The GitHub Actions workflow (`.github/workflows/deploy.yml`) now:

✅ Pulls latest code from `production` branch  
✅ Installs dependencies with `npm ci`  
✅ Builds frontend with `npm run build`  
✅ **NEW:** Verifies backend structure (`routes/`, `services/`, `server.js`)  
✅ **NEW:** Checks for `.env.server` file  
✅ Restarts backend with `pm2 reload all` (zero-downtime)  
✅ Saves PM2 configuration  

---

## 📋 6. Manual Deployment Steps (If Needed)

If you need to manually deploy:

```bash
# SSH into VPS
ssh your-user@your-vps-ip

# Navigate to project
cd /var/www/rsweeting/frontend

# Pull latest changes
git pull origin production

# Install dependencies
npm ci

# Build frontend
npm run build

# Verify backend structure
ls -la routes/ services/ server.js

# Check environment variables
cat .env.server  # Should show all required variables

# Restart backend
pm2 reload all
pm2 save

# Check logs
pm2 logs --lines 50
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Cannot find module './routes/chat.js'"
**Solution:** Ensure `routes/` directory exists and all route files are present
```bash
ls -la routes/
# Should show: chat.js, fitbit.js, google.js, fitbitData.js
```

### Issue: "SUPABASE_URL is undefined"
**Solution:** `.env.server` file missing or not loaded
```bash
# Check if file exists
ls -la .env.server

# Verify contents
cat .env.server

# Restart PM2 to reload env vars
pm2 restart all
```

### Issue: "pm2 reload all" fails
**Solution:** Use `pm2 restart all` instead (less graceful but works)
```bash
pm2 restart all
pm2 save
```

### Issue: Routes return 404
**Solution:** Check if server.js is properly setting up routes
```bash
pm2 logs --lines 100
# Look for "Server running on http://localhost:3001"
```

---

## 🎯 Deployment Success Criteria

✅ All route files exist in `routes/` directory  
✅ `.env.server` file exists with all required variables  
✅ PM2 shows backend process as "online"  
✅ All endpoints return valid responses (not 404)  
✅ PM2 logs show no errors  
✅ Frontend loads and can connect to backend  
✅ OAuth flows work (Google Calendar, Fitbit)  
✅ n8n integration endpoints respond correctly  

---

## 📚 Related Documentation

- **BACKEND_ROUTES_GUIDE.md** - Complete route documentation
- **IMPLEMENTATION_SUMMARY.md** - Refactoring details
- **.github/workflows/deploy.yml** - Automated deployment workflow

---

**Last Updated:** 2025-10-07
