# Section 1 Runtime Verification Checklist

Use this checklist to validate Section 1 platform integrations end-to-end after setup.

## Global Preflight

- [ ] Run from `/Users/uvaischudesra/Documents/Code/Conduit/Conduit-section1-roadmap`
- [ ] Run `npm run typecheck`
- [ ] Run `npm run test`
- [ ] Set `ENCRYPTION_KEY` (recommended)
- [ ] Set `OAUTH_STATE_SECRET` (or `META_APP_SECRET` fallback)

## Meta (Instagram + Facebook)

### Required env

- [ ] `META_APP_ID`
- [ ] `META_APP_SECRET`
- [ ] `META_WEBHOOK_VERIFY_TOKEN`

### OAuth and scopes

- [ ] Start URLs:
  - [ ] `/api/platforms/oauth/meta/start?platform=instagram`
  - [ ] `/api/platforms/oauth/meta/start?platform=facebook`
- [ ] Callback configured: `/api/platforms/oauth/meta/callback`
- [ ] Scopes granted:
  - [ ] `pages_show_list`
  - [ ] `pages_read_engagement`
  - [ ] `pages_manage_posts`
  - [ ] `instagram_basic`
  - [ ] `instagram_content_publish`
  - [ ] `business_management`

### Runtime checks

- [ ] Both connections appear in Settings > Platforms
- [ ] Instagram publish returns real `platformPostId` (no `sim_` / `ig_`)
- [ ] Facebook publish returns real `platformPostId` (no `sim_` / `fb_`)
- [ ] Analytics collect shows live source where available
- [ ] `GET /api/webhooks/meta` challenge succeeds with valid verify token
- [ ] `POST /api/webhooks/meta` accepts valid `x-hub-signature-256`

## LinkedIn

### Required env

- [ ] `LINKEDIN_CLIENT_ID`
- [ ] `LINKEDIN_CLIENT_SECRET`
- [ ] Optional `LINKEDIN_API_BASE_URL`
- [ ] Optional `LINKEDIN_WEBHOOK_SECRET`

### Runtime checks

- [ ] OAuth connect: `/api/platforms/oauth/linkedin/start`
- [ ] Callback configured: `/api/platforms/oauth/linkedin/callback`
- [ ] Connection stores `platformUserId`
- [ ] Publish returns real `platformPostId` (no synthetic prefix)
- [ ] Import path (`/api/platforms/analyse`) pulls LinkedIn posts when access allows
- [ ] Metrics collection attempts live LinkedIn metrics
- [ ] `POST /api/platforms/refresh-tokens` refreshes near-expiry token
- [ ] `POST /api/webhooks/linkedin` verifies signature and ingests event

## X (Twitter)

### Required env

- [ ] `X_CLIENT_ID`
- [ ] `X_CLIENT_SECRET`
- [ ] Optional `X_API_BASE_URL`
- [ ] Optional `X_WEBHOOK_SECRET`

### Runtime checks

- [ ] OAuth connect: `/api/platforms/oauth/x/start`
- [ ] Callback configured: `/api/platforms/oauth/x/callback`
- [ ] Connection stores `platformUserId`
- [ ] Publish returns real tweet id in `platformPostId`
- [ ] Import path (`/api/platforms/analyse`) pulls tweets when access allows
- [ ] Metrics collection attempts live tweet metrics
- [ ] `POST /api/platforms/refresh-tokens` refreshes near-expiry token
- [ ] `POST /api/webhooks/x` verifies signature and ingests event

## Google Business Profile (GBP)

### Required env

- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] Optional `GBP_API_BASE_URL`
- [ ] Optional `GBP_POSTS_BASE_URL`

### Runtime checks

- [ ] OAuth connect: `/api/platforms/oauth/gbp/start`
- [ ] Callback configured: `/api/platforms/oauth/gbp/callback`
- [ ] Connection stores account + location (`platformUserId`, `platformPageId`)
- [ ] Publish returns real GBP local post resource name
- [ ] Import path attempts real GBP posts
- [ ] Metrics collection attempts live GBP metrics
- [ ] `POST /api/platforms/refresh-tokens` refreshes near-expiry token
- [ ] `POST /api/webhooks/gbp` ingests event payloads

## Cross-Section 1 Acceptance

- [ ] **1.1 Publish:** connected platforms do not return synthetic IDs
- [ ] **1.2 OAuth lifecycle:** all five connect via OAuth and refresh flow runs
- [ ] **1.3 Metrics:** live metrics attempted for all five with valid scopes
- [ ] **1.4 Import:** real imports attempted for all five, fallback only when needed
- [ ] **1.5 Webhooks:** receiver routes exist and process normalized events
- [ ] **1.6 Connection health:** settings shows expiry + refresh diagnostics
- [ ] **1.7 Live vs simulated:** analytics surfaces display source labeling consistently
