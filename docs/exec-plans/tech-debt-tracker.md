# Tech Debt Tracker

## Open Items

1. Add route-level performance smoke checks for heavy graph pages.
2. Add HTTPS termination or require a trusted VPN before treating public traffic
   as confidential; HTTP still exposes JWTs, prompts, documents, and answers in
   transit.
3. Add persistent SSE replay and resume identifiers (`Last-Event-ID`) if recovery
   across delivered events or backend restarts becomes a requirement.

## Closed Items

1. Runtime SSE schemas now validate every supported Chat, Deep Research, and
   Agentic event before page state is updated. Valid/invalid protocol fixtures and
   consumer tests passed in the public self-hosted P0 verification.
2. Expired-session recovery now coalesces refresh, retries once, shows one blocking
   explanation, stores only a safe relative return route, and restores that route
   after login. Session service, provider, dialog, router, and login tests passed
   in the public self-hosted P0 verification.
