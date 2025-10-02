# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/206c34f9-f636-4885-9ad5-d62afd01ef74

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/206c34f9-f636-4885-9ad5-d62afd01ef74) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

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

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/206c34f9-f636-4885-9ad5-d62afd01ef74) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
