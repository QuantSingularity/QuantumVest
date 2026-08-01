# QuantumVest Mobile

React Native (Expo) mobile client for the QuantumVest portfolio management
platform, sharing the same backend and brand as the web frontend.

## Screens

- **Home** - public landing screen (shown before sign in)
- **Login / Register / Forgot Password** - authentication
- **Dashboard** - portfolio summary, performance chart, recent activity
- **Portfolios** - list, create, delete
- **Portfolio Detail** - holdings, 90-day performance chart, transactions, AI
  optimization (premium accounts)
- **Watchlist** - multiple watchlists, asset search, add/remove items
- **Risk Analytics** - Value-at-Risk (historical/parametric/Monte Carlo),
  CVaR, Sharpe/Sortino, max drawdown, skewness/kurtosis
- **AI Predictions** - honestly shows a "coming soon" state; the backend
  does not yet expose a live inference endpoint, so this screen does not
  fabricate forecasts
- **Profile** - personal info, risk tolerance, investment experience,
  password change, compliance status
- **Settings** - theme, local notification preferences, links to legal pages

## Getting started

```bash
npm install
cp .env.example .env   # set API_BASE_URL for your environment
npm start              # expo start
```

By default the app points at `http://localhost:5000/api/v1`. When running
on a physical device or emulator, update `API_BASE_URL` in `.env`:

- Android emulator: `http://10.0.2.2:5000/api/v1`
- iOS simulator: `http://localhost:5000/api/v1`
- Physical device: `http://<your-machine-LAN-IP>:5000/api/v1`

## Testing

```bash
npm test        # Jest unit tests
npm run lint    # ESLint
npm run test:e2e:build && npm run test:e2e   # Detox (requires a simulator)
```

## Architecture notes

- `src/services/api.js` - axios client matching the backend's `/api/v1`
  contract exactly, with automatic access-token refresh.
- `src/context/AuthContext.js` - session state, verified against
  `/auth/profile` on launch rather than trusting a cached token blindly.
- `src/theme/tokens.js` - brand colors shared conceptually with the web
  frontend's CSS variables, for a consistent look across both apps.
- `src/navigation/RootNavigator.js` - public stack (Home/Login/Register/
  Forgot Password) when signed out, bottom-tab app (`AppNavigator.js`) plus
  stacked detail screens when signed in.

## Known limitations

- Password reset (`/auth/forgot-password`) is not implemented on the
  backend yet; the screen detects this and shows an honest message rather
  than pretending an email was sent.
- AI Predictions has no live backend endpoint yet - see the Predictions
  screen for the research roadmap.
- Two-factor authentication is modeled in the data layer but has no
  enrollment flow yet.
