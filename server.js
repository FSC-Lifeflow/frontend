import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { TokenService } from './services/tokenService.js';

// Import route modules
import { setupChatRoutes } from './routes/chat.js';
import { setupFitbitRoutes } from './routes/fitbit.js';
import { setupGoogleRoutes } from './routes/google.js';
import { setupFitbitDataRoutes } from './routes/fitbitData.js';

dotenv.config({ path: '.env.server' });

const app = express();
const PORT = 3001;

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID;
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// Initialize services - Use service role key for backend (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const tokenService = new TokenService(supabase, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET);

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// SETUP ROUTES
// ============================================

// Chat routes (n8n webhook proxy)
setupChatRoutes(app, tokenService, N8N_WEBHOOK_URL, supabase);

// Fitbit OAuth and API routes
setupFitbitRoutes(app, supabase, tokenService, FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET);

// Google Calendar OAuth and API routes
setupGoogleRoutes(app, supabase, tokenService, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, FRONTEND_URL);

// Fitbit data routes for n8n integration
setupFitbitDataRoutes(app, supabase, N8N_WEBHOOK_URL);


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fitbit proxy server running on http://0.0.0.0:${PORT}`);
  console.log(`Accessible from network at http://192.168.1.88:${PORT}`);
});
