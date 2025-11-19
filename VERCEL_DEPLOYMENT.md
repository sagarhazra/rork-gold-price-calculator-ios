# Deploy to Vercel

Your Gold Price Calculator app is now ready to be deployed to Vercel! Follow these steps:

## Prerequisites
- A Vercel account (free) at https://vercel.com
- Git repository (GitHub, GitLab, or Bitbucket)

## Step-by-Step Deployment

### 1. Push to Git Repository
First, push your code to a Git repository:

```bash
git init
git add .
git commit -m "Initial commit - Gold Price Calculator"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### 2. Connect to Vercel

#### Option A: Deploy via Vercel Dashboard (Easiest)
1. Go to https://vercel.com and sign in
2. Click "New Project"
3. Import your Git repository
4. Configure your project:
   - **Framework Preset**: Other
   - **Build Command**: `npm install && npx expo export --platform web`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Add environment variables if needed (optional)
6. Click "Deploy"

#### Option B: Deploy via Vercel CLI
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

### 3. Manual Build Command (if needed)

If you need to build manually before deployment:

```bash
# Install dependencies
npm install

# Export for web
npx expo export --platform web
```

This will create a `dist` folder with your web build.

### 4. Vercel Configuration

A `vercel.json` file has been created with the following configuration:

```json
{
  "buildCommand": "npm run export",
  "outputDirectory": "dist",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 5. Custom Domain (Optional)

After deployment, you can:
1. Use the free `.vercel.app` domain
2. Add your custom domain in Project Settings → Domains

## Important Notes

### Web Compatibility
Your app uses the following features that work on web:
- ✅ AsyncStorage (works with @react-native-async-storage/async-storage)
- ✅ Linear Gradient (expo-linear-gradient supports web)
- ✅ Lucide Icons (lucide-react-native works on web)
- ✅ Safe Area Context (works on web)
- ⚠️ Haptics (disabled on web via Platform.OS check - this is handled correctly in your code)
- ⚠️ DateTimePicker (has web fallback)

### Build Issues?

If you encounter build issues, update package.json scripts manually:

1. Open `package.json`
2. Add to the `scripts` section:
   ```json
   "export": "expo export --platform web",
   "build": "expo export --platform web"
   ```
3. Save and commit

### Testing Web Build Locally

To test your web build locally before deploying:

```bash
# Install serve globally
npm install -g serve

# Build for web
npx expo export --platform web

# Serve the dist folder
serve dist
```

Then open http://localhost:3000 in your browser.

## Troubleshooting

### Build Fails
- Make sure all dependencies are in `package.json`
- Try building locally first to catch errors
- Check Vercel build logs for specific errors

### Routing Issues
- The `vercel.json` rewrite rule handles client-side routing
- All routes will redirect to `/index.html` for the SPA to handle

### Performance
- Your app will load faster on web compared to mobile
- All calculations are client-side (no server needed)
- Data is stored in browser's AsyncStorage equivalent

## Next Steps

After successful deployment:
1. ✅ Test all features on the live site
2. ✅ Test on different browsers (Chrome, Firefox, Safari)
3. ✅ Test on mobile browsers
4. ✅ Share your app URL!

## Need Help?

If you encounter any issues:
1. Check Vercel deployment logs
2. Build locally first to debug: `npx expo export --platform web`
3. Verify all features work in development: `npm run start-web`

Your app URL will be: `https://your-project-name.vercel.app`
