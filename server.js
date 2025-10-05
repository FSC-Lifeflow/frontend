import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { TokenService } from './services/tokenService.js';

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
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// Initialize services - Use service role key for backend (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const tokenService = new TokenService(supabase, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// n8n WEBHOOK PROXY (Primary Chat Endpoint)
// ============================================

// Chat endpoint - auto-fetches auth tokens, refreshes if needed, and forwards to n8n
app.post('/api/chat', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    if (!N8N_WEBHOOK_URL) {
      return res.status(500).json({ error: 'n8n webhook not configured' });
    }

    let enhancedPayload = { ...req.body };

    // Fetch and include auth tokens
    const tokens = await tokenService.fetchUserTokens(userId);
    
    // Auto-refresh Google token if expired but has refresh token
    if (!tokens.google.connected && tokens.google.reason === 'token_expired') {
      console.log(`[Chat API] Google token expired, attempting refresh for user ${userId}...`);
      try {
        const validToken = await tokenService.getValidGoogleToken(userId);
        // Re-fetch tokens after refresh
        const refreshedTokens = await tokenService.fetchUserTokens(userId);
        enhancedPayload.auth = refreshedTokens;
        
        console.log(`[Chat API] Token refreshed successfully, googleConnected: ${refreshedTokens.google.connected}`);
      } catch (refreshError) {
        console.error(`[Chat API] Token refresh failed:`, refreshError.message);
        enhancedPayload.auth = tokens; // Use original tokens (will show as disconnected)
      }
    } else {
      enhancedPayload.auth = tokens;
    }

    console.log(`[Chat API] Request from user ${userId}:`, {
      googleConnected: enhancedPayload.auth.google.connected,
      fitbitConnected: enhancedPayload.auth.fitbit.connected,
      hasSelectedEvent: !!enhancedPayload.selected_event,
      eventSummary: enhancedPayload.selected_event?.summary || 'none'
    });

    // Verify event data is present before sending to n8n
    if (enhancedPayload.selected_event) {
      console.log(`[Chat API] ✅ Forwarding event to n8n: ${enhancedPayload.selected_event.summary}`);
    }
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enhancedPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.text();
    res.send(data);
  } catch (error) {
    console.error('Chat webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// FITBIT API PROXY
// ============================================
app.get('/api/fitbit/activities/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const response = await fetch(`https://api.fitbit.com/1/user/-/activities/date/${date}.json`, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Fitbit activities API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calories time series (explicit routes to avoid optional param issues)
app.get('/api/fitbit/calories/:endDate', async (req, res) => {
  try {
    const { endDate } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const response = await fetch(`https://api.fitbit.com/1/user/-/activities/calories/date/${endDate}/7d.json`, {
      headers: { 'Authorization': authHeader },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Fitbit calories API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/fitbit/calories/:endDate/:range', async (req, res) => {
  try {
    const { endDate, range } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const response = await fetch(`https://api.fitbit.com/1/user/-/activities/calories/date/${endDate}/${range}.json`, {
      headers: { 'Authorization': authHeader },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Fitbit calories API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/fitbit/sleep/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const response = await fetch(`https://api.fitbit.com/1/user/-/sleep/date/${date}.json`, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Fitbit sleep API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/fitbit/heart/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const response = await fetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${date}/1d.json`, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Fitbit heart rate API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Exchange Fitbit authorization code for tokens and save to Supabase
app.post('/api/fitbit/token', async (req, res) => {
  try {
    const { code, redirect_uri, userId } = req.body;

    if (!FITBIT_CLIENT_ID || !FITBIT_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Fitbit OAuth not configured' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const response = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        client_id: FITBIT_CLIENT_ID,
        grant_type: 'authorization_code',
        redirect_uri: redirect_uri,
        code: code,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000));

    // Save tokens to Supabase
    const { error: dbError } = await supabase
      .from('fitbit_tokens')
      .upsert({
        user_id: userId,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt.toISOString(),
        scope: data.scope,
      }, {
        onConflict: 'user_id',
      });

    if (dbError) {
      console.error('Database error saving Fitbit tokens:', dbError);
      return res.status(500).json({ error: 'Failed to save tokens' });
    }

    console.log(`Fitbit tokens saved successfully for user: ${userId}`);
    res.json(data);
  } catch (error) {
    console.error('Fitbit token exchange error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ============================================
// GOOGLE CALENDAR OAUTH
// ============================================

// Generate Google OAuth authorization URL
app.get('/api/google/auth-url', (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Google OAuth not configured' });
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', GOOGLE_REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/calendar.events');
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');
  authUrl.searchParams.append('state', userId);

  res.json({ authUrl: authUrl.toString() });
});

// Handle Google OAuth callback and save tokens to Supabase
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query; // state contains userId

    if (!code || !state) {
      return res.redirect('http://localhost:8080/settings?error=missing_params');
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.redirect('http://localhost:8080/settings?error=server_config');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Google token exchange error:', errorText);
      return res.redirect('http://localhost:8080/settings?error=token_exchange_failed');
    }

    const tokens = await tokenResponse.json();
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    const { error: dbError } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        user_id: state,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        scope: tokens.scope,
      }, {
        onConflict: 'user_id',
      });

    if (dbError) {
      console.error('Database error saving Google tokens:', dbError);
      return res.redirect('http://localhost:8080/settings?error=db_save_failed');
    }

    console.log(`Google Calendar connected successfully for user: ${state}`);
    res.redirect('http://localhost:8080/settings?calendar=connected');
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect('http://localhost:8080/settings?error=callback_failed');
  }
});

// Get Google Calendar connection status
app.get('/api/google/status', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const { data, error } = await supabase
      .from('google_calendar_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.json({ connected: false });
    }

    // Check if token is expired
    const expiresAt = new Date(data.expires_at).getTime();
    const isExpired = Date.now() >= (expiresAt - 5 * 60 * 1000);

    res.json({
      connected: !!data.refresh_token,
      hasRefreshToken: !!data.refresh_token,
      isExpired,
    });
  } catch (error) {
    console.error('Google status check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disconnect Google Calendar
app.delete('/api/google/disconnect', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const { error } = await supabase
      .from('google_calendar_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Database error disconnecting Google Calendar:', error);
      return res.status(500).json({ error: 'Failed to disconnect' });
    }

    console.log(`Google Calendar disconnected for user: ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Google disconnect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch Google Calendar events
app.get('/api/google/calendar/events', async (req, res) => {
  try {
    const { userId, timeMin, timeMax, maxResults = 20 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Get valid token (auto-refresh if needed)
    const accessToken = await tokenService.getValidGoogleToken(userId);

    // Fetch events from Google Calendar API
    const params = new URLSearchParams({
      showDeleted: 'false',
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: maxResults.toString(),
    });

    if (timeMin) params.append('timeMin', timeMin);
    if (timeMax) params.append('timeMax', timeMax);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Calendar API error:', errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Calendar events fetch error:', error);
    if (error.message.includes('not connected')) {
      return res.status(401).json({ error: 'Google Calendar not connected' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.listen(PORT, () => {
  console.log(`Fitbit proxy server running on http://localhost:${PORT}`);
});
