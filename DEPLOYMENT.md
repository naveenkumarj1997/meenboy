# Deploying MEENBOY

This guide explains how to push your code to GitHub and deploy the MERN stack application. The frontend will be hosted on **Vercel**, and the backend on **Railway**.

## Step 1: Push to GitHub
1. Open your terminal in the root `meenboy2` directory.
2. Initialize and commit your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
3. Create a new repository on [GitHub](https://github.com/), and push your code:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

*(Note: Sensitive files like `.env` and `server/uploads` are safely ignored by `.gitignore`)*

---

## Step 2: Deploy Backend to Railway
Railway is perfect for Node.js backends.

1. Go to [Railway.app](https://railway.app/) and log in with GitHub.
2. Click **New Project** > **Deploy from GitHub repo**.
3. Select your MEENBOY repository.
4. **Important**: Since this is a monorepo, Railway will detect multiple folders. When configuring the deployment:
   - Set the **Root Directory** to `/server`.
   - The `railway.toml` file we created will automatically tell Railway how to build and start your Node API.
5. Go to the **Variables** tab in Railway and add the following from your local `server/.env` file:
   - `PORT` = `5000`
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = `your_mongodb_connection_string`
   - `JWT_SECRET` = `a_long_secure_random_string`
   - `CLIENT_URL` = (Leave blank for now, we will update this after deploying Vercel)
6. Go to the **Settings** tab > **Networking** > **Generate Domain**. Copy this public URL (e.g., `https://meenboy-api-production.up.railway.app`).

---

## Step 3: Deploy Frontend to Vercel
Vercel is optimized for React/Vite frontends.

1. Go to [Vercel.com](https://vercel.com/) and log in with GitHub.
2. Click **Add New** > **Project**.
3. Import your MEENBOY repository.
4. In the configuration screen:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
5. Open the **Environment Variables** section and add:
   - `VITE_API_URL` = `https://your-railway-url.up.railway.app/api` (Use the URL generated in Step 2, ensuring `/api` is at the end).
6. Click **Deploy**.

---

## Step 4: Final Link
Now that Vercel is live, you need to tell your Railway backend to accept traffic from it.

1. Copy your new Vercel domain (e.g., `https://meenboy.vercel.app`).
2. Go back to your **Railway Dashboard** > Variables.
3. Update `CLIENT_URL` to your Vercel domain.
4. Railway will automatically redeploy the backend with the new CORS settings.

Your site is now fully live!

> **Warning regarding File Uploads:**
> Railway uses an ephemeral filesystem. If a user uploads a PDF or Image, it will be deleted the next time Railway redeploys the server. For a permanent production solution, you should attach a persistent volume in Railway, or modify `uploadRoutes.js` to upload files directly to AWS S3 or Cloudinary.
