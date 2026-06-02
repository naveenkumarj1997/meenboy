# MEENBOY - Full-Stack MERN Application

MEENBOY is a production-ready MERN starter with:
- React + TypeScript + Vite frontend
- Tailwind CSS + Framer Motion UI
- Node.js + Express backend
- MongoDB Atlas integration
- JWT authentication
- Role-based access for `customer`, `admin`, and `delivery_partner`

## Project Structure

```text
meenboy/
  client/
    src/
      components/
      context/
      lib/
      pages/
        dashboards/
      types/
  server/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      utils/
```

## Setup

1. Install dependencies from root:
   ```bash
   npm install
   ```
2. Configure environment variables:
   - Copy `server/.env.example` to `server/.env`
   - Copy `client/.env.example` to `client/.env`
3. Add your MongoDB Atlas URI and strong JWT secret in `server/.env`.

## Run Locally

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/customer` (customer only)
- `GET /api/dashboard/admin` (admin only)
- `GET /api/dashboard/delivery` (delivery partner only)
