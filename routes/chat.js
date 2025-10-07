import fetch from 'node-fetch';

/**
 * Chat Routes - n8n webhook proxy
 * Handles chat requests with auto-token refresh
 */
export function setupChatRoutes(app, tokenService, N8N_WEBHOOK_URL, supabase) {
  
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

      // Fetch user profile data from Supabase
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('fitness_level, primary_goals, exercise_preferences, weekly_frequency, session_duration, equipment_access, physical_limitations')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error(`[Chat API] Failed to fetch user profile for ${userId}:`, userError.message);
      } else if (userData) {
        enhancedPayload.userProfile = {
          fitness_level: userData.fitness_level,
          primary_goals: userData.primary_goals,
          exercise_preferences: userData.exercise_preferences,
          weekly_frequency: userData.weekly_frequency,
          session_duration: userData.session_duration,
          equipment_access: userData.equipment_access,
          physical_limitations: userData.physical_limitations
        };
        console.log(`[Chat API] User profile data fetched for ${userId}`);
      }

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
          
          console.log(`[Chat API] Google token refreshed successfully, googleConnected: ${refreshedTokens.google.connected}`);
        } catch (refreshError) {
          console.error(`[Chat API] Google token refresh failed:`, refreshError.message);
          enhancedPayload.auth = tokens; // Use original tokens (will show as disconnected)
        }
      } else {
        enhancedPayload.auth = tokens;
      }

      // Auto-refresh Fitbit token if expired but has refresh token
      if (!enhancedPayload.auth.fitbit.connected && enhancedPayload.auth.fitbit.reason === 'token_expired') {
        console.log(`[Chat API] Fitbit token expired, attempting refresh for user ${userId}...`);
        try {
          const validToken = await tokenService.getValidFitbitToken(userId);
          // Re-fetch tokens after refresh
          const refreshedTokens = await tokenService.fetchUserTokens(userId);
          enhancedPayload.auth = refreshedTokens;
          
          console.log(`[Chat API] Fitbit token refreshed successfully, fitbitConnected: ${refreshedTokens.fitbit.connected}`);
        } catch (refreshError) {
          console.error(`[Chat API] Fitbit token refresh failed:`, refreshError.message);
          // Keep current auth state (will show as disconnected)
        }
      }

      console.log(`[Chat API] Request from user ${userId}:`, {
        googleConnected: enhancedPayload.auth.google.connected,
        fitbitConnected: enhancedPayload.auth.fitbit.connected,
        hasSelectedEvent: !!enhancedPayload.selected_event,
        eventSummary: enhancedPayload.selected_event?.summary || 'none',
        hasUserProfile: !!enhancedPayload.userProfile,
        fitnessLevel: enhancedPayload.userProfile?.fitness_level || 'not set'
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
}
