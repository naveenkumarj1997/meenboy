# The Ultimate MERN Stack Playbook
**A step-by-step guide on how we built and deployed the MEENBOY web application.**

Use this playbook as a master reference for all your future full-stack projects!

---

## Phase 1: Project Initialization (The Monorepo)
Instead of creating two separate repositories, we kept everything in one main folder (a monorepo).
1. **Create the Root Folder:** `mkdir my-project` & `cd my-project`
2. **Create the Backend:** `mkdir server` & `cd server` & `npm init -y`
3. **Create the Frontend:** Open a new terminal in the root and run `npm create vite@latest client -- --template react-ts`
4. **Setup Git:** Run `git init` in the root folder, and create a root `.gitignore` file to ignore `node_modules` and `.env` files.

---

## Phase 2: Building the Backend (Express & MongoDB)
1. **Install Dependencies:** Inside the `server` folder, install core packages:
   ```bash
   npm install express mongoose cors dotenv jsonwebtoken bcryptjs multer
   ```
2. **Connect to Database:** 
   - Created a free cluster on MongoDB Atlas.
   - Wrote a connection script (`src/config/db.js`) using `mongoose.connect()`.
3. **Design the Models:**
   - Created Mongoose schemas (e.g., `User.js`, `Order.js`) to define exactly what data looks like.
4. **Build the API Routes & Controllers:**
   - Separated the logic into `controllers` (the brain) and `routes` (the doors).
   - E.g., `authController.js` handles passwords (using `bcryptjs`) and generates tokens (using `jsonwebtoken`).
5. **Security (CORS):**
   - Configured `cors()` in `app.js` to only accept requests from our specific frontend URL.

---

## Phase 3: Building the Frontend (React & Vite)
1. **Install UI Dependencies:** Inside the `client` folder:
   ```bash
   npm install react-router-dom lucide-react framer-motion recharts
   ```
2. **State Management (Context API):**
   - We used React's `createContext` (e.g., `AuthContext.tsx`, `CartContext.tsx`) to store global data like the logged-in user and shopping cart, so any page can access them without passing props manually.
3. **API Integration:**
   - Created a central `src/lib/api.ts` file using `fetch()`. This ensures every request automatically attaches the JWT token for authentication.
4. **Routing & Dashboards:**
   - Used `react-router-dom` to create pages.
   - Built a `DashboardShell` component so the sidebar and navigation are consistent across Admin, Delivery, and Customer views.
5. **Micro-Animations (The Wow Factor):**
   - Used `framer-motion` for smooth page transitions and the custom trailing fish cursor (`CustomCursor.tsx`) using physics-based `useSpring` hooks.

---

## Phase 4: Pre-Deployment Checklist (Crucial Step)
Before pushing to GitHub, we had to prepare the code for the cloud servers.
1. **Frontend Routing Fix (`vercel.json`):**
   - React SPAs throw 404 errors on refresh in Vercel. We added a `vercel.json` file in the `client` folder with a rewrite rule pointing everything to `index.html`.
2. **Backend Engine Fix (`railway.toml` & `package.json`):**
   - Added an `engines` block in the backend `package.json` to force Node version 18+.
   - Added a `railway.toml` file to explicitly tell Railway how to build and start the server.
3. **Environment Variables:**
   - Created `.env.example` files so we know exactly what secrets the production servers need, while keeping the real `.env` files hidden via `.gitignore`.
4. **Strict TypeScript Compilation:**
   - Ran `npm run build` locally to catch unused variables and missing imports, ensuring Vercel wouldn't fail the build.

---

## Phase 5: Deployment (The Cloud)
1. **Push to GitHub:**
   - Pushed the entire monorepo to a single GitHub repository.
2. **Deploy Backend (Railway or Render):**
   - Imported the GitHub repo.
   - Set the Root Directory to `/server`.
   - Added Environment Variables (`PORT`, `MONGODB_URI`, `JWT_SECRET`).
   - Generated the live public domain.
3. **Deploy Frontend (Vercel):**
   - Imported the GitHub repo.
   - Set the Root Directory to `client` and framework to Vite.
   - Added the `VITE_API_URL` environment variable (pointing to the Railway domain with `/api` at the end).
4. **The Final Link (CORS):**
   - Once Vercel generated the frontend domain, we went back to Railway and set the `CLIENT_URL` variable to exactly match the Vercel domain. This unlocked the CORS security, allowing the two servers to communicate perfectly!

*(Note: If ISPs block Railway domains, the backend can easily be moved to Render.com using the exact same steps!)*
