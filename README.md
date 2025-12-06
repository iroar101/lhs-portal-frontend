# Lynbrook Athletic Training Portal (Frontend)

Frontend for Lynbrook High School’s Athletic Training System. Provides secure Google authentication and a dashboard that will connect to the backend API to manage and update athlete healthcare records.

## Overview
- Built with React + Vite and styled with lightweight CSS.
- Uses Firebase Authentication (Google sign-in only) to gate access for athletic training staff and partners.
- Dashboard tiles outline upcoming modules: Injury Reports, Clearance Forms, Schedules & Coverage, Supplies & Inventory, Athlete Outreach, and Training Resources.
- Status messaging keeps users informed during sign-in/out flows and while features are still under development.

## Prerequisites
- Node.js 20+ (Vite 7 and React 19 require modern Node).
- npm (comes with Node).
- Access to a Firebase project with Google Sign-In enabled.

## Quickstart
1) Install dependencies:
   ```bash
   npm install
   ```
2) Create a `.env.local` file with your Firebase web app settings:
   ```bash
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
   ```
   Keep the `VITE_` prefix—Vite only exposes variables that start with it.
3) Start the dev server:
   ```bash
   npm run dev
   ```
   By default the app runs at http://localhost:5173.

## Firebase setup checklist
1) In Firebase Console, create a project (or reuse an existing one).
2) Add a Web App to get the API keys above.
3) Authentication → Sign-in method → enable Google.
4) Authentication → Settings → add your local dev origin (`http://localhost:5173`) and production domain to the authorized domains list.

## Available scripts
- `npm run dev` — start Vite dev server with hot reload.
- `npm run build` — production build to `dist/`.
- `npm run preview` — serve the production build locally.
- `npm run lint` — run ESLint across the project.

## Project structure (high level)
```
src/
  App.jsx        # Auth flow + dashboard tiles
  App.css        # Component-scoped styling
  firebase.js    # Firebase app + auth instance
  main.jsx       # React entrypoint
  index.css      # Global styles and font imports
public/          # Static assets served as-is
```

## How authentication works
- On load, the app initializes Firebase and listens for auth state changes.
- Users sign in with Google via `signInWithPopup`; status text reflects progress or errors.
- Once authenticated, the dashboard greets the user, shows a profile chip, and lists the future feature areas. Clicking a tile currently shows a “coming soon” status message.
- “Sign out” clears the session via Firebase Auth.

## Deployment notes
- Build artifacts are written to `dist/`; serve that folder with any static host (Firebase Hosting, Netlify, Vercel, S3 + CloudFront, etc.).
- Ensure production environment variables are set in your hosting platform with the same `VITE_` names.
- Confirm your production domain is whitelisted in Firebase Authentication authorized domains.

## Roadmap and integration points
- Wire dashboard tiles to backend API endpoints for injury reports, clearance workflows, schedules, inventory, outreach, and resources.
- Add role-based access (e.g., trainers, coaches, admins) once backend supports authorization.
- Connect to real data storage (Firestore/REST API) and surface read/write flows.
- Expand audit/logging to track access to athlete healthcare records.
