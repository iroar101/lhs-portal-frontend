# LHS Portal - Production

This folder is the production build target for portal.lhsathletictraining.org.

## Environment
Populate `.env.production` with your production Firebase + API settings before building.

## Build
```
npm install
npm run build
```

## Deploy to Firebase Hosting
```
firebase deploy --only hosting
```

Hosting is configured to serve `dist` as a single-page app with all routes rewriting to `index.html`.
