import fetch from 'node-fetch';

/**
 * Google Calendar Routes - OAuth and API proxy
 * Handles Google Calendar authentication and event fetching
 */
export function setupGoogleRoutes(app, supabase, tokenService, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, FRONTEND_URL) {
  
  // Generate Google OAuth authorization URL
  app.get('/api/google/auth-url', (req, res) => {
    const { userId, redirectUri } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google OAuth not configured' });
    }

    // Use provided redirectUri (for mobile) or default GOOGLE_REDIRECT_URI (for web)
    const finalRedirectUri = redirectUri || GOOGLE_REDIRECT_URI;

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', finalRedirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('state', userId);

    res.json({ authUrl: authUrl.toString() });
  });

  // Handle Google OAuth callback for mobile (returns JSON instead of redirecting)
  app.get('/api/google/callback/mobile', async (req, res) => {
    try {
      const { code, state, redirectUri } = req.query; // state contains userId

      if (!code || !state) {
        return res.status(400).json({ error: 'Missing code or state' });
      }

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ error: 'Server configuration error' });
      }

      // Use the redirectUri from the query (the Expo app URI) or fall back to server URL
      const finalRedirectUri = redirectUri || `${req.protocol}://${req.get('host')}/api/google/callback/mobile`;

      console.log('Exchanging code with redirect_uri:', finalRedirectUri);

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: finalRedirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Google token exchange error:', errorText);
        return res.status(500).json({ error: 'Token exchange failed' });
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
        return res.status(500).json({ error: 'Database save failed' });
      }

      console.log(`Google Calendar connected successfully for user: ${state}`);
      
      // Return a simple HTML page that closes the browser and returns to the app
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Success</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; text-align: center; padding: 50px; }
            .success { color: #10b981; font-size: 48px; }
          </style>
        </head>
        <body>
          <div class="success">✓</div>
          <h1>Calendar Connected!</h1>
          <p>You can close this window and return to the app.</p>
          <script>
            // Try to close the window after a short delay
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.status(500).json({ error: 'Callback failed' });
    }
  });

  // Handle Google OAuth callback and save tokens to Supabase (for web)
  app.get('/auth/google/callback', async (req, res) => {
    try {
      const { code, state } = req.query; // state contains userId

      if (!code || !state) {
        return res.redirect(`${FRONTEND_URL}/settings?error=missing_params`);
      }

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.redirect(`${FRONTEND_URL}/settings?error=server_config`);
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
        return res.redirect(`${FRONTEND_URL}/settings?error=token_exchange_failed`);
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
        return res.redirect(`${FRONTEND_URL}/settings?error=db_save_failed`);
      }

      console.log(`Google Calendar connected successfully for user: ${state}`);
      res.redirect(`${FRONTEND_URL}/settings?calendar=connected`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${FRONTEND_URL}/settings?error=callback_failed`);
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

  // Fetch events from a specific calendar by ID
  app.get('/api/google/calendar/:calendarId/events', async (req, res) => {
    try {
      const { calendarId } = req.params;
      const { userId, timeMin, timeMax, maxResults = 20 } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Get valid token (auto-refresh if needed)
      const accessToken = await tokenService.getValidGoogleToken(userId);

      // Fetch events from specified calendar
      const params = new URLSearchParams({
        showDeleted: 'false',
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: maxResults.toString(),
      });

      if (timeMin) params.append('timeMin', timeMin);
      if (timeMax) params.append('timeMax', timeMax);

      // URL encode the calendar ID to handle special characters (e.g., email addresses)
      const encodedCalendarId = encodeURIComponent(calendarId);
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?${params.toString()}`,
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

  // Fetch events from all calendars (merged and sorted)
  app.get('/api/google/calendar/events', async (req, res) => {
    try {
      const { userId, timeMin, timeMax, maxResults = 20 } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Get valid token (auto-refresh if needed)
      const accessToken = await tokenService.getValidGoogleToken(userId);

      // First, fetch the list of all calendars
      const calendarListResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!calendarListResponse.ok) {
        const errorText = await calendarListResponse.text();
        console.error('Google Calendar List API error:', errorText);
        return res.status(calendarListResponse.status).json({ error: errorText });
      }

      const calendarList = await calendarListResponse.json();
      const calendars = calendarList.items || [];

      console.log(`Fetching events from ${calendars.length} calendars for user ${userId}`);

      // Fetch events from each calendar in parallel
      const params = new URLSearchParams({
        showDeleted: 'false',
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: maxResults.toString(),
      });

      if (timeMin) params.append('timeMin', timeMin);
      if (timeMax) params.append('timeMax', timeMax);

      const eventPromises = calendars.map(async (calendar) => {
        try {
          const encodedCalendarId = encodeURIComponent(calendar.id);
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!response.ok) {
            console.warn(`Failed to fetch events from calendar ${calendar.summary}:`, await response.text());
            return { items: [], calendarInfo: calendar };
          }

          const data = await response.json();
          // Add calendar metadata to each event
          const eventsWithCalendar = (data.items || []).map(event => ({
            ...event,
            calendarId: calendar.id,
            calendarName: calendar.summary,
            calendarColor: calendar.backgroundColor,
          }));
          
          return { items: eventsWithCalendar, calendarInfo: calendar };
        } catch (error) {
          console.warn(`Error fetching events from calendar ${calendar.summary}:`, error.message);
          return { items: [], calendarInfo: calendar };
        }
      });

      const results = await Promise.all(eventPromises);
      
      // Merge all events and sort by start time
      const allEvents = results.flatMap(result => result.items);
      allEvents.sort((a, b) => {
        const aTime = a.start?.dateTime || a.start?.date || '';
        const bTime = b.start?.dateTime || b.start?.date || '';
        return aTime.localeCompare(bTime);
      });

      // Limit to maxResults after merging
      const limitedEvents = allEvents.slice(0, parseInt(maxResults));

      console.log(`Fetched ${allEvents.length} total events across all calendars, returning ${limitedEvents.length}`);

      res.json({
        items: limitedEvents,
        calendars: calendars.map(cal => ({
          id: cal.id,
          summary: cal.summary,
          backgroundColor: cal.backgroundColor,
          primary: cal.primary || false,
        })),
      });
    } catch (error) {
      console.error('Calendar events fetch error:', error);
      if (error.code === 'TOKEN_EXPIRED') {
        return res.status(401).json({ 
          error: 'Google Calendar connection expired', 
          message: error.message,
          reconnect: true 
        });
      }
      if (error.message.includes('not connected')) {
        return res.status(401).json({ error: 'Google Calendar not connected' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
