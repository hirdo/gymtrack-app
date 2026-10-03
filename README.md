# gymtrack-app

Expo (React Native) mobile companion to [gymtrack-web](https://github.com/hirdo/gymtrack-web).

- Auth: Keycloak OIDC (PKCE) via `expo-auth-session`, same realm as the web app.
- Data: Firebase Firestore (same project as web), Cloudinary for image uploads.
- Navigation: Expo Router.
- Styling: NativeWind, tokens ported from the web app's Tailwind theme.

## Development

This app is developed through Claude Code, not a local machine. Day-to-day testing works via:
1. Push to a PR branch.
2. EAS Workflows (`.eas/workflows/`) automatically publishes an OTA preview update and comments a QR code on the PR.
3. Scan the QR with the installed Dev Client build on your phone.

Environment variables (`EXPO_PUBLIC_*`) are managed in the Expo Dashboard under Project → Environment Variables, not in this repo.
