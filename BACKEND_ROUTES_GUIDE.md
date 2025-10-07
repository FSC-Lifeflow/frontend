# Backend Routes Guide - Modular Architecture

## 📋 Overview

The backend has been refactored from a monolithic `server.js` (~726 lines) into a clean, modular route structure. This improves maintainability, testability, and scalability.

---

## 🏗️ Architecture

### Before (Monolithic)
```
server.js (726 lines)
├── Chat endpoint
├── Fitbit OAuth (7 endpoints)
├── Google Calendar OAuth (6 endpoints)
└── All inline route handlers
```

### After (Modular)
```
server.js (56 lines) - Main server setup
routes/
├── chat.js - n8n webhook proxy
├── fitbit.js - Fitbit OAuth & API
├── google.js - Google Calendar OAuth & API
└── fitbitData.js - n8n Fitbit data integration (NEW)
```

**Result:** 87% reduction in server.js size, better separation of concerns

---

## 📁 Route Files

### 1. `routes/chat.js`
**Purpose:** n8n webhook proxy with automatic token refresh

**Endpoints:**
- `POST /api/chat` - Forward chat requests to n8n with auth tokens

**Features:**
- Auto-fetches user tokens (Google + Fitbit)
- Auto-refreshes expired tokens
- Forwards enriched payload to n8n webhook
- Handles token refresh failures gracefully

**Dependencies:**
- `tokenService` - Token management
- `N8N_WEBHOOK_URL` - n8n webhook URL

---

### 2. `routes/fitbit.js`
**Purpose:** Fitbit OAuth and API proxy

**Endpoints:**
- `GET /api/fitbit/status` - Check connection status
- `DELETE /api/fitbit/disconnect` - Disconnect Fitbit
- `POST /api/fitbit/token` - Exchange OAuth code for tokens
- `GET /api/fitbit/activities/:date` - Get activity data
- `GET /api/fitbit/calories/:endDate` - Get 7-day calorie data
- `GET /api/fitbit/calories/:endDate/:range` - Get custom range calories
- `GET /api/fitbit/sleep/:date` - Get sleep data
- `GET /api/fitbit/heart/:date` - Get heart rate data

**Features:**
- Auto-refresh tokens via `tokenService`
- Proxy to Fitbit API
- Store tokens in Supabase

**Dependencies:**
- `supabase` - Database client
- `tokenService` - Token management
- `FITBIT_CLIENT_ID` - OAuth credentials
- `FITBIT_CLIENT_SECRET` - OAuth credentials

---

### 3. `routes/google.js`
**Purpose:** Google Calendar OAuth and API proxy

**Endpoints:**
- `GET /api/google/auth-url` - Generate OAuth URL
- `GET /auth/google/callback` - OAuth callback handler
- `GET /api/google/status` - Check connection status
- `DELETE /api/google/disconnect` - Disconnect Google Calendar
- `GET /api/google/calendar/:calendarId/events` - Get events from specific calendar
- `GET /api/google/calendar/events` - Get events from all calendars (merged)

**Features:**
- OAuth 2.0 flow with offline access
- Auto-refresh tokens via `tokenService`
- Fetch and merge events from multiple calendars
- Store tokens in Supabase

**Dependencies:**
- `supabase` - Database client
- `tokenService` - Token management
- `GOOGLE_CLIENT_ID` - OAuth credentials
- `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `GOOGLE_REDIRECT_URI` - OAuth redirect URL

---

### 4. `routes/fitbitData.js` ⭐ NEW
**Purpose:** n8n integration endpoints for Fitbit data from Supabase

**Endpoints:**
- `GET /api/fitbit-data/:userId` - Get formatted Fitbit data for n8n
- `GET /api/fitbit-data/:userId/range` - Get date range with trends
- `POST /api/fitbit-data/webhook/n8n` - Trigger n8n workflow with data

**Query Parameters:**
- `date` - Specific date (default: today)
- `format` - 'n8n' or 'raw' (default: 'n8n')
- `startDate` - Range start date
- `endDate` - Range end date

**Response Format (n8n):**
```json
{
  "date": "2025-10-07",
  "userId": "user123",
  "activity": {
    "steps": 8500,
    "caloriesOut": 2300,
    "totalActiveMinutes": 45,
    "restingHeartRate": 62
  },
  "sleep": {
    "duration": 28800000,
    "minutesAsleep": 420,
    "efficiency": 92,
    "stages": {
      "deep": 90,
      "light": 240,
      "rem": 90
    }
  },
  "heartRate": {
    "resting": 62,
    "zones": [...]
  },
  "metadata": {
    "syncedAt": "2025-10-07T10:00:00Z",
    "dataAvailability": {
      "activity": true,
      "sleep": true,
      "heartRate": true
    }
  }
}
```

**Features:**
- Queries Supabase for stored Fitbit data
- Formats data for AI analysis
- Calculates trends and averages for date ranges
- Can trigger n8n workflows automatically
- No Fitbit API calls (uses stored data)

**Dependencies:**
- `supabase` - Database client (service role)
- `N8N_WEBHOOK_URL` - Optional n8n webhook

---

## 🔧 server.js Structure

```javascript
// Imports
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { TokenService } from './services/tokenService.js';

// Import route modules
import { setupChatRoutes } from './routes/chat.js';
import { setupFitbitRoutes } from './routes/fitbit.js';
import { setupGoogleRoutes } from './routes/google.js';
import { setupFitbitDataRoutes } from './routes/fitbitData.js';

// Initialize
const app = express();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const tokenService = new TokenService(...);

// Middleware
app.use(cors());
app.use(express.json());

// Setup routes
setupChatRoutes(app, tokenService, N8N_WEBHOOK_URL);
setupFitbitRoutes(app, supabase, tokenService, FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET);
setupGoogleRoutes(app, supabase, tokenService, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
setupFitbitDataRoutes(app, supabase, N8N_WEBHOOK_URL);

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

## 🚀 Usage Examples

### Get Fitbit Data for n8n
```bash
# Get today's data (n8n format)
curl http://localhost:3001/api/fitbit-data/user123

# Get specific date
curl http://localhost:3001/api/fitbit-data/user123?date=2025-10-06

# Get raw format
curl http://localhost:3001/api/fitbit-data/user123?format=raw
```

### Get Date Range with Trends
```bash
curl "http://localhost:3001/api/fitbit-data/user123/range?startDate=2025-10-01&endDate=2025-10-07"
```

### Trigger n8n Workflow
```bash
curl -X POST http://localhost:3001/api/fitbit-data/webhook/n8n \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "date": "2025-10-07"}'
```

---

## 🔄 Data Flow

### Frontend → Supabase (Automatic)
```
User opens app
    ↓
useFitbit.ts fetches from Fitbit API
    ↓
fitbitDataService.ts stores in Supabase
    ↓
Data available for n8n
```

### n8n → Formatted Data
```
n8n workflow triggered
    ↓
GET /api/fitbit-data/:userId
    ↓
routes/fitbitData.js queries Supabase
    ↓
Returns formatted data for AI analysis
```

---

## 🧪 Testing

### Test All Endpoints
```bash
# Chat endpoint
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "message": "Hello"}'

# Fitbit status
curl http://localhost:3001/api/fitbit/status?userId=user123

# Google status
curl http://localhost:3001/api/google/status?userId=user123

# Fitbit data for n8n
curl http://localhost:3001/api/fitbit-data/user123
```

---

## 📦 Environment Variables

Required in `.env.server`:
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
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# n8n Integration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
```

---

## ✅ Benefits of Modular Structure

1. **Maintainability** - Each route file handles one domain
2. **Readability** - Easy to find specific endpoints
3. **Testability** - Can test route modules independently
4. **Scalability** - Add new routes without bloating server.js
5. **Separation of Concerns** - Clear boundaries between features
6. **Reusability** - Route functions can be reused or moved
7. **Code Organization** - Follows industry best practices

---

## 🔄 Adding New Routes

To add a new route module:

1. **Create route file** in `routes/` directory
```javascript
// routes/newFeature.js
export function setupNewFeatureRoutes(app, dependencies) {
  app.get('/api/new-feature', async (req, res) => {
    // Your logic here
  });
}
```

2. **Import in server.js**
```javascript
import { setupNewFeatureRoutes } from './routes/newFeature.js';
```

3. **Setup routes**
```javascript
setupNewFeatureRoutes(app, dependencies);
```

---

## 📚 Related Files

- `services/tokenService.js` - Token management and refresh logic
- `supabaseClient.js` - Supabase client configuration
- `src/services/fitbitDataService.ts` - Frontend data storage service
- `supabase_fitbit_tables.sql` - Database schema

---

## 🎯 Next Steps

1. ✅ Routes modularized
2. ✅ n8n Fitbit data endpoints created
3. ⏳ Test all endpoints
4. ⏳ Update n8n workflow to use new endpoints
5. ⏳ Deploy to production

---

**Last Updated:** 2025-10-07
