<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/10KkmJes_iEULhuMelFmqKSCTDsp9tlUn

## Run Locally

**Prerequisites:**  Node.js (v18 or higher)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key:
   ```bash
   # Create .env.local file
   GEMINI_API_KEY=your_api_key_here
   ```
   Get your API key from: https://aistudio.google.com/app/apikey

3. Run the app:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

## Deploy to Netlify

### Option 1: Deploy via Netlify Dashboard

1. Push your code to GitHub
2. Go to [Netlify](https://app.netlify.com) and click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Netlify will auto-detect the build settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add your environment variable:
   - Go to Site settings → Environment variables
   - Add `GEMINI_API_KEY` with your API key value
6. Click "Deploy site"

### Option 2: Deploy via Netlify CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Deploy:
   ```bash
   netlify deploy --prod
   ```

4. Set environment variable in Netlify dashboard or via CLI:
   ```bash
   netlify env:set GEMINI_API_KEY your_api_key_here
   ```

### Important Notes

- The `netlify.toml` file includes SPA redirect rules to handle client-side routing
- Make sure to set `GEMINI_API_KEY` as an environment variable in Netlify (not in `.env.local` which is gitignored)
- The app uses IndexedDB for local storage, so data persists per browser

## Build for Production

```bash
npm run build
```

The production build will be in the `dist` directory.
