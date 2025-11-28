# Deployment Guide

## Quick Deployment Checklist

### Before Pushing to GitHub

- [x] `.gitignore` is configured (excludes `.env.local`, `node_modules`, `dist`)
- [x] `netlify.toml` is created with build settings and redirect rules
- [x] All sensitive data is excluded from repository

### GitHub Setup

1. Initialize git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub

3. Push to GitHub:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

### Netlify Deployment

#### Method 1: Via Netlify Dashboard (Recommended)

1. Go to [Netlify](https://app.netlify.com) and sign in
2. Click "Add new site" → "Import an existing project"
3. Select "GitHub" and authorize Netlify
4. Choose your repository
5. Netlify will auto-detect settings from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
6. **Important:** Add environment variable:
   - Go to Site settings → Environment variables
   - Add `GEMINI_API_KEY` with your actual API key
7. Click "Deploy site"

#### Method 2: Via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site (first time only)
netlify init

# Set environment variable
netlify env:set GEMINI_API_KEY your_api_key_here

# Deploy
netlify deploy --prod
```

### Environment Variables

**Local Development:**
- Create `.env.local` file with: `GEMINI_API_KEY=your_key_here`

**Netlify:**
- Set `GEMINI_API_KEY` in Netlify dashboard under Site settings → Environment variables
- This will be available during build and runtime

### Redirect Rules

The `netlify.toml` includes SPA redirect rules:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

This ensures all routes are handled by the React app for client-side routing.

### Build Verification

Test the production build locally:
```bash
npm run build
npm run preview
```

Visit `http://localhost:4173` to verify the build works correctly.

### Troubleshooting

**Build fails:**
- Check Node.js version (should be 18+)
- Verify all dependencies are in `package.json`
- Check Netlify build logs

**API key not working:**
- Verify `GEMINI_API_KEY` is set in Netlify environment variables
- Check that the variable name matches exactly (case-sensitive)
- Rebuild the site after adding environment variables

**Routes not working:**
- Verify `netlify.toml` redirect rules are present
- Check that `status = 200` (not 301/302) for SPA routing

