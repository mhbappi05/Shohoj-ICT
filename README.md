# Shohoj ICT

Interactive visual learning platform for the Bangladesh HSC ICT curriculum.

## Run

    npm install
    cp .env.example .env     # optional: add your PostHog key
    npm run dev

## Structure

    src/
      lib/            pure logic (no React) - number systems, later: gates, SQL, C interpreter
      components/     shared UI (BitRow, LanguageToggle)
      modules/        one folder per HSC chapter module
      locales/        en.json (primary), bn.json
      analytics.js    PostHog wrapper, no-op without a key
      i18n.js         i18next + localStorage persistence

## Roadmap status

- [x] Phase 1: setup, i18n, analytics hook, base converter, 2's complement
- [ ] Phase 2: logic gates and circuits
- [ ] Phase 3: HTML sandbox and SQL
- [ ] Phase 4: flowcharts and C visualizer
