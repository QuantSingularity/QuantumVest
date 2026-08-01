# QuantumVest Web

React (Vite) web client for the QuantumVest portfolio management platform.

## Pages

- **Homepage** (`/`) - public landing page, default route for everyone
- **Login / Register / Forgot Password** - authentication
- **Dashboard** (`/dashboard`) - portfolio summary, performance chart, recent activity
- **Portfolios** (`/portfolios`, `/portfolios/:id`) - list, detail with holdings,
  transactions, allocation chart, and AI optimization (premium accounts)
- **Watchlist** (`/watchlist`) - multiple watchlists, asset search, add/remove items
- **Risk Analytics** (`/risk-analytics`) - VaR/CVaR calculator and a full risk
  metrics panel (Sharpe, Sortino, drawdown, skew, kurtosis)
- **AI Predictions** (`/predictions`) - honestly shows a "coming soon" state;
  no live inference endpoint exists on the backend yet
- **Profile** (`/profile`) - personal info, risk tolerance, password change
- **Settings** (`/settings`) - theme, local notification preferences, security
- **Contact / Privacy / Terms / 404** - public pages

All `/dashboard`, `/portfolios`, `/watchlist`, `/risk-analytics`,
`/predictions`, `/profile`, and `/settings` routes require sign-in and
redirect to `/login` otherwise. `/login`, `/register`, and
`/forgot-password` redirect to `/dashboard` if you're already signed in.

## Getting started

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL if the API isn't on localhost:5000
npm run dev             # http://localhost:3000
```

## Scripts

```bash
npm run build   # production build (outputs to build/)
npm test        # Jest unit tests
npm run lint    # ESLint
```

## Architecture notes

- `src/services/api.js` - axios client matching the backend's `/api/v1`
  contract exactly, with automatic access-token refresh on 401s.
- `src/contexts/AuthContext.jsx` - session state, verified against
  `/auth/profile` on load.
- `src/components/routing/{ProtectedRoute,PublicOnlyRoute}.jsx` - route guards.
- `src/styles/App.css` - the design system: color tokens (light/dark),
  typography, buttons, cards, forms, tables, badges, modals.
- Pages are code-split with `React.lazy` for a smaller initial bundle.

## Known limitations

- Password reset (`/auth/forgot-password`) is not implemented on the backend
  yet; the Forgot Password page detects this and shows an honest message
  instead of a fake "email sent" confirmation.
- Portfolio optimization requires a premium/admin role on the backend; the
  UI surfaces a clear message rather than a generic error for other accounts.
- AI Predictions has no live backend endpoint yet - see the Predictions page
  for the research roadmap.
