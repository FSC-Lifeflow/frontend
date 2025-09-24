# Fitbit Integration Setup

This guide will help you set up Fitbit integration for your LifeFlow wellness dashboard.

## Prerequisites

- A Fitbit account
- A Fitbit developer account (free)
- Fitbit device with synced data

## Step 1: Create Fitbit Developer Account

1. Go to the [Fitbit Developer Portal](https://dev.fitbit.com/)
2. Sign up/Login with your existing Fitbit account
3. Accept the Developer Agreement

## Step 2: Register Your Application

1. **Click "Register an App"** on the developer dashboard
2. **Fill out the application form**:
   - **Application Name**: `LifeFlow Wellness Dashboard`
   - **Description**: `Wellness dashboard that integrates Fitbit health data for tracking fitness goals`
   - **Application Website**: `http://localhost:8080` (for development)
   - **Organization**: Your name or company
   - **Organization Website**: Your website or `http://localhost:8080`
   - **Terms of Service URL**: Can use your website or leave blank for development
   - **Privacy Policy URL**: Can use your website or leave blank for development

3. **OAuth 2.0 Application Type**: Select `Server`

4. **Callback URL**: `http://localhost:8080/fitbit/callback`
   - This must match your `VITE_FITBIT_REDIRECT_URI` in `.env`
   - For production, change this to your actual domain

5. **Default Access Type**: Select `Read Only`

## Step 3: Configure Environment Variables

1. Copy your credentials from the Fitbit developer portal
2. Add them to your `.env` file:
   ```
   VITE_FITBIT_CLIENT_ID=your_client_id_here
   VITE_FITBIT_CLIENT_SECRET=your_client_secret_here
   VITE_FITBIT_REDIRECT_URI=http://localhost:8080/fitbit/callback
   ```

## Step 4: Test the Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Dashboard page
3. Look for the "Today's Progress" section
4. Click "Connect Fitbit"
5. Complete the OAuth flow in Fitbit's authorization page
6. Your Fitbit data should appear in the dashboard

## Features

The Fitbit integration provides:

- **Steps**: Daily step count with progress toward 10,000 step goal
- **Calories**: Calories burned throughout the day
- **Active Minutes**: Very active + fairly active minutes combined
- **Sleep Data**: Hours slept with sleep efficiency
- **Heart Rate**: Resting heart rate and heart rate zones
- **Activity Breakdown**: Detailed activity minutes by intensity
- **Real-time Sync**: Refresh button to get latest data

## Data Types Displayed

### Activity Data
- Steps taken
- Distance traveled
- Calories burned
- Active minutes (very + fairly active)
- Activity breakdown by intensity level

### Sleep Data
- Total sleep time
- Time in bed
- Sleep efficiency percentage

### Heart Rate Data
- Resting heart rate
- Heart rate zones with time spent in each zone

## Troubleshooting

### Common Issues

1. **"Fitbit credentials not configured" error**
   - Check your `.env` file has all required variables
   - Ensure no typos in environment variable names
   - Restart your development server after adding variables

2. **OAuth redirect errors**
   - Verify `VITE_FITBIT_REDIRECT_URI` matches the callback URL in Fitbit developer portal
   - Check that the callback route `/fitbit/callback` is working
   - Ensure you're using the correct port (8080 vs 5173)

3. **"Failed to fetch Fitbit data" error**
   - Check that your Fitbit device has synced recently
   - Verify you have data for today in your Fitbit app
   - Check browser console for detailed API error messages

4. **Token expiration**
   - Fitbit tokens expire after 8 hours
   - The integration automatically refreshes tokens when needed
   - If refresh fails, you'll need to reconnect

### Development vs Production

- **Development**: Uses `http://localhost:8080`
- **Production**: Update callback URL in Fitbit developer portal to your domain
- **Environment Variables**: Set all `VITE_FITBIT_*` variables in production

## Security Notes

- Client Secret is used for server-side token exchange
- Access tokens are stored in localStorage (consider more secure storage for production)
- The integration only requests read-only access to your Fitbit data
- Users can disconnect at any time using the "Disconnect" button

## API Limits

Fitbit API has the following limits:
- 150 requests per hour per user
- 1,000 requests per hour per application
- The integration fetches data efficiently to stay within limits

## Data Refresh

- Data automatically loads when you connect
- Use the refresh button to get latest data
- Fitbit data typically syncs every 15-30 minutes from your device

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Fitbit developer portal settings
3. Ensure all environment variables are set correctly
4. Make sure your Fitbit device has synced recent data
5. Try disconnecting and reconnecting your Fitbit account
