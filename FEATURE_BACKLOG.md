# Conduit — Feature Backlog

> Features to consider after the core 10-phase build. Prioritize based on user feedback.

---

## High Priority (Post-MVP)

- [ ] **Multi-tenant support** — Tenant switcher, agency dashboard, per-tenant billing
- [ ] **Email notifications** — Resend/SendGrid for approval alerts, weekly digests
- [ ] **Push notifications** — Web push for real-time alerts
- [ ] **Bulk operations** — Bulk approve, bulk schedule, bulk delete drafts
- [ ] **Content templates** — Save and reuse high-performing post templates
- [ ] **Draft versioning** — Track edit history per draft with diff view
- [ ] **Export reports** — PDF/CSV export for analytics data

## Medium Priority

- [ ] **Content recycling** — AI suggests repurposing old high-performers
- [ ] **Hashtag analytics** — Track hashtag performance over time
- [ ] **Best time to post ML** — Learn from own analytics, not just platform defaults
- [ ] **Content scoring** — AI predicts engagement before publishing
- [ ] **Brand consistency checker** — AI validates draft against Brand Manifesto
- [ ] **Multi-language support** — Generate content in multiple languages
- [ ] **Dark mode toggle** — User preference for theme
- [ ] **Keyboard shortcuts** — Power user navigation
- [ ] **Activity log** — Full audit trail of all user actions

## Lower Priority

- [ ] **Pinterest support** — Pin creation + scheduling
- [ ] **TikTok support** — Video posting via API
- [ ] **YouTube Community posts** — Text/image posting
- [ ] **RSS feed integration** — Auto-generate posts from blog RSS
- [ ] **Webhook integrations** — Zapier/Make.com compatible webhooks
- [ ] **Custom branding** — White-label for agencies
- [ ] **Comment management** — Monitor and reply to comments from dashboard
- [ ] **Sentiment analysis** — Track audience sentiment trends
- [ ] **AI chat assistant** — Natural language interface for managing content
- [ ] **Mobile app** — React Native companion app

## Technical Debt & Infrastructure

- [ ] **Rate limiting** — API endpoint protection
- [ ] **Error monitoring** — Sentry integration
- [ ] **Database backups** — Automated backup strategy
- [ ] **CI/CD pipeline** — GitHub Actions for lint, test, deploy
- [ ] **Unit tests** — Vitest + React Testing Library
- [ ] **E2E tests** — Playwright for critical flows
- [ ] **API documentation** — OpenAPI/Swagger spec
- [ ] **Database indexes** — Optimize query performance as tables grow
- [ ] **Image optimization** — Sharp/next-image pipeline for uploaded media
- [ ] **CDN caching** — Edge caching strategy for static assets
