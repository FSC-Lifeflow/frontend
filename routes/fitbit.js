import fetch from 'node-fetch';

/**
 * Fitbit Routes - OAuth and API proxy
 * Handles Fitbit authentication and data fetching
 */
export function setupFitbitRoutes(app, supabase, tokenService, FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET) {
  
  // Get Fitbit connection status
  app.get('/api/fitbit/status', async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const { data, error } = await supabase
        .from('fitbit_tokens')
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
      console.error('Fitbit status check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Disconnect Fitbit
  app.delete('/api/fitbit/disconnect', async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const { error } = await supabase
        .from('fitbit_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Database error disconnecting Fitbit:', error);
        return res.status(500).json({ error: 'Failed to disconnect' });
      }

      console.log(`Fitbit disconnected for user: ${userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Fitbit disconnect error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get activities for a specific date
  app.get('/api/fitbit/activities/:date', async (req, res) => {
    try {
      const { date } = req.params;
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Get valid token (auto-refresh if needed)
      const accessToken = await tokenService.getValidFitbitToken(userId);

      const response = await fetch(`https://api.fitbit.com/1/user/-/activities/date/${date}.json`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
      if (error.message.includes('not connected')) {
        return res.status(401).json({ error: 'Fitbit not connected' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Calories time series (7 days default)
  app.get('/api/fitbit/calories/:endDate', async (req, res) => {
    try {
      const { endDate } = req.params;
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Get valid token (auto-refresh if needed)
      const accessToken = await tokenService.getValidFitbitToken(userId);

      const response = await fetch(`https://api.fitbit.com/1/user/-/activities/calories/date/${endDate}/7d.json`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Fitbit calories API error:', error);
      if (error.message.includes('not connected')) {
        return res.status(401).json({ error: 'Fitbit not connected' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Calories time series with custom range
  app.get('/api/fitbit/calories/:endDate/:range', async (req, res) => {
    try {
      const { endDate, range } = req.params;
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Get valid token (auto-refresh if needed)
      const accessToken = await tokenService.getValidFitbitToken(userId);

      const response = await fetch(`https://api.fitbit.com/1/user/-/activities/calories/date/${endDate}/${range}.json`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Fitbit calories API error:', error);
      if (error.message.includes('not connected')) {
        return res.status(401).json({ error: 'Fitbit not connected' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get sleep data for a specific date
  app.get('/api/fitbit/sleep/:date', async (req, res) => {
    try {
      const { date } = req.params;
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Get valid token (auto-refresh if needed)
      const accessToken = await tokenService.getValidFitbitToken(userId);

      const response = await fetch(`https://api.fitbit.com/1/user/-/sleep/date/${date}.json`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
      if (error.message.includes('not connected')) {
        return res.status(401).json({ error: 'Fitbit not connected' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get heart rate data for a specific date
  app.get('/api/fitbit/heart/:date', async (req, res) => {
    try {
      const { date } = req.params;
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Get valid token (auto-refresh if needed)
      const accessToken = await tokenService.getValidFitbitToken(userId);

      const response = await fetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${date}/1d.json`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
      if (error.message.includes('not connected')) {
        return res.status(401).json({ error: 'Fitbit not connected' });
      }
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
}
