# BYOK Release Review

This note collects pre-release recommendations for the Hiring Agent web app and summarizes common patterns used by open-source BYOK ("bring your own key") projects.

## Current context

- The app is a Vercel-hosted Next.js web app.
- Users bring their own OpenRouter API key.
- GitHub enrichment uses GitHub OAuth.
- The current app can remember the OpenRouter key in browser storage for convenience.

## Main product decision

There are two fundamentally different trust models for user API keys:

1. Browser-only BYOK
   - The server never receives the OpenRouter key.
   - The browser calls OpenRouter directly.
   - Billing is clearly on the user.

2. Server-assisted BYOK
   - The key is sent to the app backend.
   - The server may store or proxy it, ideally encrypted.
   - This can improve UX and centralize orchestration, but increases secret-handling responsibility.

For this project, if the goal is to minimize your own exposure to usage charges and secret custody, the cleanest model is browser-only BYOK.

## Release recommendations

### Recommended before public launch

1. Make BYOK billing responsibility explicit in the UI
   - Tell users that all model charges are billed to their own OpenRouter account.
   - State that costs depend on selected model and usage volume.

2. Explain that a run makes multiple model calls
   - This pipeline is not a single completion.
   - Users should know a single scoring run may issue several OpenRouter requests.

3. Default to a low-cost, fast model
   - Keep an inexpensive model selected by default.
   - Label other models as potentially higher cost.

4. Add backend abuse controls
   - File size limits
   - Request rate limits
   - Basic anti-abuse throttling

5. Decide on one key-handling policy and document it clearly
   - Browser-only, no server key access
   - Or server-assisted with encrypted storage
   - Avoid a half-explained middle ground

6. Add a short terms/privacy disclaimer before launch
   - Clarify that the tool uses the user's own OpenRouter account.
   - Clarify whether keys stay client-side or touch the backend.
   - Clarify what resume/GitHub data is processed server-side.

7. Revisit "remember my key" UX before public release
   - Convenience is useful, but key storage behavior should be explicit.
   - Shared computers should be warned against persistent storage.

### Nice to have

1. Show an approximate cost/usage warning
   - Example: "This run may make multiple model calls."

2. Add a "forget saved key" control that is obvious
   - Make it easy for users to clear remembered credentials.

3. Add a release checklist for domain and OAuth consistency
   - Stable domain
   - Callback URL
   - Vercel env vars
   - Redeploy after config changes

## Architecture choices

### Option A: Browser-only OpenRouter

How it works:
- Browser holds the OpenRouter key.
- Browser calls OpenRouter directly.
- Backend handles PDF extraction, GitHub enrichment, validation, and non-LLM orchestration.

Pros:
- Your server never receives the OpenRouter key.
- OpenRouter charges land on the user.
- Lower server-side secret liability.

Cons:
- Browser-side orchestration becomes more complex.
- The browser environment has more exposure to the raw key.
- Prompt and pipeline internals become more inspectable client-side.

Best when:
- Your top priority is "the server must never see user model keys."

### Option B: Server-encrypted httpOnly cookie

How it works:
- User submits a key once.
- Server encrypts it and stores it in an httpOnly cookie.
- Server decrypts it for future scoring requests.

Pros:
- Better protection against casual browser JS access.
- Smoother remembered-key UX.
- Consistent with server-managed session patterns.

Cons:
- The server necessarily sees the key.
- This is not compatible with a strict "server never receives the key" requirement.

Best when:
- Your top priority is safer remembered storage rather than zero server exposure.

### Important incompatibility

You cannot fully combine:

- browser-direct LLM calls, and
- server-encrypted httpOnly remembered storage for the same key,

without the server seeing the key at some point.

That is because httpOnly protects secrets from browser JavaScript, while direct browser LLM calls require browser JavaScript to possess the raw key.

## What other BYOK open-source projects commonly do

The ecosystem mostly falls into three buckets.

### 1. Local browser storage only

Common pattern:
- Store key in localStorage, sessionStorage, or IndexedDB.
- Browser or frontend runtime uses the key directly.
- Server either never sees the key or only receives it transiently in headers.

Why projects choose it:
- Simple
- Cheap
- Clear BYOK story
- Good for personal tools and open-source demos

Tradeoff:
- Easier for in-browser JavaScript or XSS to access the key.

Examples found during review:
- AOSSIE-Org/BringYourOwnKey: browser-side storage, localStorage-focused BYOK helper
- JustBYOK: locally stored keys and local-first UX
- Idolon: local-first BYOK, browser-stored settings and keys

### 2. Client-side encrypted local storage

Common pattern:
- Encrypt key in the browser before storing it.
- Unlock with passphrase, Web Crypto, or passkey-style flow.

Why projects choose it:
- Better "at rest" protection than plaintext localStorage
- No need for a server secret vault

Tradeoff:
- The browser still eventually sees the raw key to make calls.
- Complexity is higher than plain localStorage.

Examples found during review:
- Aether-Key: supports remembered keys and client-side encrypted storage modes
- passkey-secret-demo style projects: encrypt local secrets using Web Crypto and passkey/passphrase unlock flows

### 3. Proxy/relay with encrypted server storage

Common pattern:
- User registers key once.
- Server stores encrypted key or encrypted token mapping.
- Browser stores a token, not the raw key.
- Proxy forwards provider requests.

Why projects choose it:
- Better UX
- Centralized CORS handling
- Possible rate limiting and provider abstraction

Tradeoff:
- The server becomes part of the trust boundary.
- More operational and legal responsibility.

Examples found during review:
- byok-relay: encrypted-at-rest server-side storage, token in browser

## Practical interpretation of the ecosystem

What most open-source BYOK apps do today:

- They often choose local browser storage first.
- They prominently say "bring your own key."
- They emphasize that users pay for their own API usage.
- They accept the tradeoff that browser-side storage is less secure than a server vault.

What more security-focused BYOK projects do:

- Add browser-side encryption at rest
- Use extensions/wallet-like approaches
- Or introduce a relay/proxy with encrypted storage

## Recommendation for this project

If the goal is:

"Keep OpenRouter charges and key responsibility away from the app operator as much as possible"

then the strongest fit is:

- browser-only OpenRouter calls
- explicit billing disclosure
- cheap default models
- backend rate/file limits
- clear UI around remembered key behavior

If the goal is instead:

"Keep remembered keys safer from in-browser access"

then use:

- encrypted server-side httpOnly cookie
- and accept that the server becomes a key custodian

## Suggested UI copy before public release

- "This app uses your own OpenRouter API key."
- "All model charges are billed by OpenRouter to your account."
- "A scoring run may make multiple model calls depending on resume length and selected model."
- "Do not enable saved-key mode on a shared computer."

## Open questions to revisit before launch

1. Should OpenRouter remain server-side or move browser-direct?
2. Is remembered-key convenience worth the extra security tradeoff?
3. Do you want a true public launch, or a semi-private portfolio demo with lighter controls?
4. What minimum abuse controls should exist before public traffic?

## Finalized policy (current)

- Default path uses app-provided shared OpenRouter models:
  - `google/gemma-4-26b-a4b-it:free`
  - `meta-llama/llama-3.2-3b-instruct:free`
- Shared-path safeguards:
  - Allowlist enforcement server-side
  - 5 OpenRouter calls/minute per user
  - Shared circuit breaker: if provider 429 occurs repeatedly, disable shared models for 10 minutes
- Advanced BYOK path:
  - User-provided OpenRouter key allows broader models
  - No app-level OpenRouter limit for BYOK without GitHub OAuth
  - 25 OpenRouter calls/minute for BYOK + GitHub OAuth
- GitHub modes:
  - Public unauthenticated lookup (lower provider limits)
  - OAuth mode via server session (token hidden in httpOnly cookie)
  - Optional browser-only GitHub PAT mode (stored locally for 30 days), with no app-level GitHub limit
- Copy constraints:
  - Do not claim \"unlimited\" GitHub
  - Use: \"No app-level GitHub limit; GitHub provider limits still apply.\"
