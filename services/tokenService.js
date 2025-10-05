import fetch from 'node-fetch';

/**
 * Token Service - Handles fetching and refreshing OAuth tokens
 */
export class TokenService {
  constructor(supabase, googleClientId, googleClientSecret) {
    this.supabase = supabase;
    this.googleClientId = googleClientId;
    this.googleClientSecret = googleClientSecret;
  }

  /**
   * Fetch both Google and Fitbit tokens for a user
   */
  async fetchUserTokens(userId) {
    console.log(`[TokenService] Fetching tokens for user: ${userId}`);
    
    const [googleResult, fitbitResult] = await Promise.all([
      this.supabase
        .from('google_calendar_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', userId)
        .single(),
      this.supabase
        .from('fitbit_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', userId)
        .single()
    ]);

    // Debug Google token fetch
    console.log(`[TokenService] Google token fetch result:`, {
      hasData: !!googleResult.data,
      hasError: !!googleResult.error,
      errorCode: googleResult.error?.code,
      errorMessage: googleResult.error?.message,
      hasAccessToken: !!googleResult.data?.access_token,
      hasRefreshToken: !!googleResult.data?.refresh_token,
      expiresAt: googleResult.data?.expires_at,
      isExpired: googleResult.data?.expires_at ? this.isTokenExpired(googleResult.data.expires_at) : 'N/A'
    });

    // Debug Fitbit token fetch
    console.log(`[TokenService] Fitbit token fetch result:`, {
      hasData: !!fitbitResult.data,
      hasError: !!fitbitResult.error,
      errorCode: fitbitResult.error?.code,
      errorMessage: fitbitResult.error?.message
    });

    // Build response with expiration checking
    const googleToken = googleResult.data && !this.isTokenExpired(googleResult.data.expires_at) ? {
      access_token: googleResult.data.access_token,
      refresh_token: googleResult.data.refresh_token,
      expires_at: googleResult.data.expires_at,
      connected: true
    } : { 
      connected: false,
      reason: !googleResult.data ? 'no_token_in_db' : 'token_expired'
    };

    const fitbitToken = fitbitResult.data && !this.isTokenExpired(fitbitResult.data.expires_at) ? {
      access_token: fitbitResult.data.access_token,
      refresh_token: fitbitResult.data.refresh_token,
      expires_at: fitbitResult.data.expires_at,
      connected: true
    } : { 
      connected: false,
      reason: !fitbitResult.data ? 'no_token_in_db' : 'token_expired'
    };

    console.log(`[TokenService] Final token status:`, {
      google: googleToken.connected ? 'connected' : `disconnected (${googleToken.reason})`,
      fitbit: fitbitToken.connected ? 'connected' : `disconnected (${fitbitToken.reason})`
    });

    return {
      google: googleToken,
      fitbit: fitbitToken
    };
  }

  /**
   * Check if token is expired (with 5-minute buffer)
   */
  isTokenExpired(expiresAt) {
    const tokenExpiresAt = new Date(expiresAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return now >= (tokenExpiresAt - fiveMinutes);
  }

  /**
   * Refresh Google access token
   */
  async refreshGoogleToken(refreshToken) {
    if (!this.googleClientId || !this.googleClientSecret) {
      throw new Error('Google OAuth not configured');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token refresh failed: ${errorText}`);
    }

    const tokens = await tokenResponse.json();
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    return {
      access_token: tokens.access_token,
      expires_at: expiresAt.toISOString(),
      expires_in: tokens.expires_in,
    };
  }

  /**
   * Get valid Google token (refresh if needed)
   */
  async getValidGoogleToken(userId) {
    const { data: tokenData, error } = await this.supabase
      .from('google_calendar_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single();

    if (error || !tokenData) {
      throw new Error('User has not connected Google Calendar');
    }

    // Check if token needs refresh
    if (this.isTokenExpired(tokenData.expires_at)) {
      console.log(`Token expired for user ${userId}, refreshing...`);
      
      const newTokens = await this.refreshGoogleToken(tokenData.refresh_token);

      // Update Supabase with new token
      await this.supabase
        .from('google_calendar_tokens')
        .update({
          access_token: newTokens.access_token,
          expires_at: newTokens.expires_at,
        })
        .eq('user_id', userId);

      console.log(`Token refreshed and updated for user ${userId}`);
      return newTokens.access_token;
    }

    return tokenData.access_token;
  }
}
