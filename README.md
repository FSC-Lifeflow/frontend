# FitFlow AI

AI-powered fitness automation platform that adapts to your schedule, weather, and health data for personalized wellness coaching.

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd lifeflow-frontend

# Step 3: Install dependencies
npm i

# Step 4: Start the development server
npm run dev

# Step 5: (Optional) Start both frontend and backend
npm run dev:full
```

## Technologies

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Profile Pictures (Avatars) Setup

This app supports user profile pictures stored in Supabase Storage.

1. Create a Storage Bucket
   - In Supabase, go to Storage > Create bucket.
   - Name: `avatars`
   - Public: enabled (recommended for simple public avatar URLs)

2. (If not public) Add a public read policy
   - If you prefer a private bucket, you must create a policy to allow public read of files or serve via a signed URL. The code currently expects a public URL.

3. Environment Variables
   - The frontend reads Supabase credentials from Vite env vars:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Ensure they are set in your `.env` files used by Vite.

4. Database Schema
   - The `users` table should include a nullable `avatar_url` column (`text` or `varchar`). The app updates this when users upload a new avatar.

5. Usage in App
   - Users can upload an avatar in `Settings` under the Profile section.
   - Accepted types: PNG, JPG, WEBP. Max size: 5MB.

Notes
- The older `supabaseClient.js` with hardcoded keys is deprecated; the app uses `src/lib/supabase.ts` which reads from environment variables.
- Supabase
- Express.js (backend server)

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run server` - Start the backend server
- `npm run dev:full` - Run both frontend and backend concurrently
- `npm run preview` - Preview production build
