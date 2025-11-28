5# OAuth Setup Guide

This guide will help you set up OAuth authentication for Google and GitHub in your Chat App.

## Prerequisites

- A GitHub account
- A Google account
- Your application running locally or deployed

## 1. Google OAuth Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Chat App")
5. Click "Create"

### Step 2: Enable Google+ API

1. In your project, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

### Step 3: Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" for user type
   - Fill in the required fields (App name, User support email, Developer contact)
   - Click "Save and Continue" through the scopes and test users pages
4. Back in Create OAuth client ID:
   - Application type: "Web application"
   - Name: "Chat App Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for local development)
     - `https://your-production-domain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://your-production-domain.com/api/auth/callback/google`
5. Click "Create"
6. Copy the **Client ID** and **Client Secret**

### Step 4: Add to Environment Variables

Add to your `.env.local` file:
```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

---

## 2. GitHub OAuth Setup

### Step 1: Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "OAuth Apps" in the left sidebar
3. Click "New OAuth App"

### Step 2: Configure the OAuth App

Fill in the form:
- **Application name**: Chat App
- **Homepage URL**: 
  - `http://localhost:3000` (for development)
  - `https://your-production-domain.com` (for production)
- **Application description**: (optional) A real-time chat application
- **Authorization callback URL**: 
  - `http://localhost:3000/api/auth/callback/github`
  - For production: `https://your-production-domain.com/api/auth/callback/github`

### Step 3: Generate Client Secret

1. Click "Register application"
2. Copy the **Client ID**
3. Click "Generate a new client secret"
4. Copy the **Client Secret** (you won't be able to see it again)

### Step 4: Add to Environment Variables

Add to your `.env.local` file:
```env
GITHUB_ID=your-github-client-id-here
GITHUB_SECRET=your-github-client-secret-here
```

---

## 3. NextAuth Configuration

### Generate NextAuth Secret

Run this command in your terminal:
```bash
openssl rand -base64 32
```

Add to your `.env.local` file:
```env
NEXTAUTH_SECRET=generated-secret-here
NEXTAUTH_URL=http://localhost:3000
```

For production, change `NEXTAUTH_URL` to your production domain.

---

## 4. Complete Environment Variables

Your `.env.local` file should look like this:

```env
# Database
DATABASE_URL=your-database-url

# NextAuth
NEXTAUTH_SECRET=your-generated-secret
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret

# Other services (Pusher, OpenAI, etc.)
```

---

## 5. Testing OAuth

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to your sign-in page
3. Try signing in with Google or GitHub
4. You should be redirected to the respective OAuth provider
5. After authorizing, you'll be redirected back to your app

---

## Production Deployment

When deploying to production (Vercel, etc.):

1. **Update OAuth redirect URIs** in both Google and GitHub to include your production URL
2. **Set environment variables** in your hosting platform:
   - Go to your project settings
   - Add all the environment variables from your `.env.local`
   - Update `NEXTAUTH_URL` to your production domain

### Vercel Deployment

1. Go to your project on Vercel
2. Navigate to "Settings" > "Environment Variables"
3. Add each variable:
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (e.g., `https://your-app.vercel.app`)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GITHUB_ID`
   - `GITHUB_SECRET`
   - `DATABASE_URL`
   - Other required variables

4. Redeploy your application

---

## Troubleshooting

### Common Issues

1. **"Redirect URI mismatch" error**
   - Verify that your redirect URIs in Google/GitHub match exactly
   - Include both `http://localhost:3000` and production URLs
   - Don't forget `/api/auth/callback/google` or `/api/auth/callback/github`

2. **"Invalid client" error**
   - Double-check your Client ID and Client Secret
   - Make sure there are no extra spaces
   - Regenerate secrets if needed

3. **OAuth works locally but not in production**
   - Verify production environment variables are set
   - Check that production URLs are added to OAuth providers
   - Ensure `NEXTAUTH_URL` matches your production domain

4. **Session not persisting**
   - Verify `NEXTAUTH_SECRET` is set
   - Check that cookies are enabled in browser
   - Ensure domain settings are correct

---

## Security Best Practices

1. **Never commit `.env.local` to git** - Use `.env.example` as a template
2. **Rotate secrets regularly** - Especially in production
3. **Use different OAuth apps** for development and production
4. **Enable 2FA** on your Google and GitHub accounts
5. **Monitor OAuth app usage** in your provider dashboards
6. **Restrict OAuth scopes** to only what you need

---

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
