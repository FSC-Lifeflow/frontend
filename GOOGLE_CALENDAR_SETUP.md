# Google Calendar Integration Setup

This guide will help you set up Google Calendar integration for your LifeFlow wellness dashboard.

## Prerequisites

- A Google account with Google Calendar access
- A Google Cloud Platform project (free tier is sufficient)

## Step 1: Create Google Cloud Project and Enable Calendar API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click on it and press "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in the required fields (App name, User support email, Developer contact)
   - Add your domain to "Authorized domains" (for production)
   - Add the following scopes:
     - `https://www.googleapis.com/auth/calendar.readonly`
4. Create OAuth client ID:
   - Application type: "Web application"
   - Name: "LifeFlow Calendar Integration"
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - Your production domain (when deploying)
   - Authorized redirect URIs:
     - `http://localhost:5173` (for development)
     - Your production domain (when deploying)

## Step 3: Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Google Client ID to the `.env` file:
   ```
   VITE_GOOGLE_CLIENT_ID=your_actual_google_client_id_here.apps.googleusercontent.com
   ```

## Step 4: Test the Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Dashboard page
3. Look for the "Calendar Integration" section
4. Click "Connect Google Calendar"
5. Complete the OAuth flow in the popup window
6. Your calendar events should appear in the dashboard

## Features

The Google Calendar integration provides:

- **Authentication**: Secure OAuth 2.0 flow with Google
- **Event Display**: Shows upcoming events for the next 7 days
- **Smart Categorization**: Automatically categorizes events (Workout, Meeting, Wellness, etc.)
- **Event Details**: Displays time, location, attendees, and descriptions
- **Real-time Updates**: Refresh button to fetch latest events
- **Responsive Design**: Works on desktop and mobile devices

## Troubleshooting

### Common Issues

1. **"Google API not loaded" error**
   - Check your internet connection
   - Ensure the Google API scripts are loading properly
   - Check browser console for any script loading errors

2. **"Invalid client ID" error**
   - Verify your `VITE_GOOGLE_CLIENT_ID` in the `.env` file
   - Ensure the client ID matches exactly from Google Cloud Console
   - Check that the domain is authorized in your OAuth settings

3. **"Access denied" error**
   - Make sure your OAuth consent screen is properly configured
   - Check that the Calendar API is enabled in your Google Cloud project
   - Verify the required scopes are added to your OAuth consent screen

4. **No events showing**
   - Check that you have events in your Google Calendar for the next 7 days
   - Verify the calendar you're trying to access is your primary calendar
   - Check browser console for any API errors

### Development vs Production

- **Development**: Uses `http://localhost:5173`
- **Production**: Update your OAuth settings with your actual domain
- **Environment Variables**: Make sure to set `VITE_GOOGLE_CLIENT_ID` in your production environment

## Security Notes

- Never commit your `.env` file to version control
- The Google Client ID is safe to expose in frontend code (it's designed for public use)
- The integration only requests read-only access to your calendar
- Users can disconnect at any time using the "Disconnect" button

## API Limits

Google Calendar API has the following limits:
- 1,000,000 queries per day (more than sufficient for typical use)
- 100 queries per 100 seconds per user
- The integration fetches a maximum of 20 events per request

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Google Cloud Console settings
3. Ensure all environment variables are set correctly
4. Test with a simple calendar event to verify the integration works
