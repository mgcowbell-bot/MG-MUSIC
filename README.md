# MG MUSIC

MG MUSIC is a production-ready music platform using Supabase PostgreSQL, storage, and authentication.

## Features
- real database-backed music library
- real MP3 and cover upload to Supabase storage
- admin email/password authentication
- secure admin pages with redirect protection
- public music website driven by database queries
- actual HTML5 audio streaming
- real downloads and play counters
- search by title, artist, album, and genre
- share links using Web Share API or clipboard
- mobile-first responsive layout

## Project structure
```text
MG-MUSIC/
├── index.html
├── login.html
├── admin.html
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   ├── auth.js
│   ├── player.js
│   ├── app.js
│   └── admin.js
├── .gitignore
└── README.md
```

## Required configuration
Before the project works, set up your Supabase project and replace the placeholder values in `js/config.js`:

```js
window.MG_MUSIC_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseAnonKey: 'YOUR_PUBLIC_ANON_KEY'
};
```

Do not put a service-role key or secret admin credential in frontend code.

## Supabase setup
### 1) Create a project
- Go to https://supabase.com
- Create a new project
- Save your project URL and anon key

### 2) Create database tables and policies
Run the SQL from the project documentation or a Supabase SQL editor. This includes:
- `songs` table
- indexes
- RLS policies
- play and download counter functions

### 3) Create storage buckets
Create two buckets:
- `music`
- `covers`

Set read access for public visitors and authenticated upload/update/delete access for admin users.

### 4) Create an admin auth user
- Open Supabase Auth
- Add a user with email/password
- Use that account to log in at `login.html`

### 5) Deploy the website
You can deploy this static site to Netlify, Vercel, or GitHub Pages.

## Local preview
Open `index.html` in a browser after filling in your Supabase config values.

## Deployment steps
1. Push this repo to GitHub.
2. Import the repo into Netlify.
3. Use the repository root as the publish directory.
4. Deploy.
5. Visit `/login.html` to manage songs.

## Admin workflow
1. Open `/login.html`
2. Log in with the Supabase admin account
3. Upload MP3 and cover
4. Song is saved to the database and online storage
5. Public site updates automatically

## Security notes
- Only the public anon key is used in the browser.
- Service-role keys are never exposed.
- Row Level Security controls what public visitors and administrators can do.

## Recommended next step
After you create your Supabase project, replace the placeholders in `js/config.js` and deploy.
