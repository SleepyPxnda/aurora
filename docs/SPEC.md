# Spec

## Rooms

- `POST /api/rooms` needs a login session and returns 401 without one (no room is written). It creates a room and returns `{ roomId, adminToken }`. Both values are random, 128 bits each, base64url-encoded. This is the only response that contains the admin token.
- The start page `/` shows, without a session, "Zum Anlegen eines Raums meldest du dich an. Zum Mitmachen reicht der Raum-Link." and an "Anmelden" button to `/api/auth/login`. With a session it shows "Raum anlegen" and "Abmelden" (`clear()` of `useUserSession()`). `?login=failed` shows "Anmeldung fehlgeschlagen. Versuch es noch einmal." A 401 on "Raum anlegen" shows "Melde dich an, um einen Raum anzulegen." and switches to the logged-out state. After creation it shows the room link and the admin link, each with a "Kopieren" button, the note "Behalte den Admin-Link für dich. Er lässt sich nicht wiederherstellen." and "Raum öffnen", which opens the admin link. If creation fails, it shows "Der Raum konnte nicht angelegt werden. Versuch es noch einmal."
- Login is needed only to create a room. There is no room list. Whoever has the room link reads and writes the room as a guest, without a session; room pages and `/api/rooms/:roomId…` never use the login.
- Login uses `nuxt-auth-utils` (>= 0.5.33) with `defineOAuthOidcEventHandler` at `GET /api/auth/login` (authorization code flow with PKCE, `state`, `nonce`, scope `openid`). The same route starts the flow and receives the callback, so the redirect URI is `<origin>/api/auth/login`. Success redirects to `/`; a rejected callback, a provider error or a missing `sub` redirects to `/?login=failed` and creates no session.
- Assumption (`server/utils/auth.ts`): `sub` is taken from the userinfo response and must be a non-empty string. The ID token is not used, because the module decodes it without checking signature, `iss`, `aud` or `exp`. The session holds only `{ user: { sub } }` (sealed `HttpOnly` cookie, `SameSite=Lax`, max age 12 hours). No tokens, e-mail or name are stored. The module's `/api/_auth/session` returns at most `user.sub` and the technical session `id`; the UI never shows `sub`.
- Config via env, read at runtime: `NUXT_OAUTH_OIDC_CLIENT_ID`, `NUXT_OAUTH_OIDC_CLIENT_SECRET`, `NUXT_OAUTH_OIDC_OPENID_CONFIG` (discovery URL, `https://`, or `http://localhost` in dev), `NUXT_SESSION_PASSWORD` (at least 32 characters) and optionally `NUXT_OAUTH_OIDC_REDIRECT_URL`. If a required value is missing or invalid, `GET /api/auth/login` returns 503 and `POST /api/rooms` returns 401.
- A lost admin link cannot be recovered or rotated.

## Links

- Room link: `<origin>/r/<roomId>`
- Admin link: `<origin>/r/<roomId>#admin=<adminToken>`
- The admin token sits in the URL fragment. Browsers do not send the fragment in requests or in the `Referer` header. The room page reads the token from the fragment and sends it to the server only in the `x-admin-token` header.
- Valid room IDs are 22 to 64 characters from `A-Z`, `a-z`, `0-9`, `_` and `-`. Any other value is treated as an unknown room.

## Admin

- `POST /api/rooms/:roomId/admin` with a valid `x-admin-token` header returns 204. A missing or wrong token returns 403.
- The server compares the SHA-256 hash of the token with the stored hash using `timingSafeEqual`.
- On opening an admin link, the room page calls this endpoint and shows the label "Moderation" only after a 204.
- If the token is rejected, the page shows "Admin-Link ungültig. Du bist als Teilnehmer:in im Raum." and the person continues as a participant. The label is text, not color alone.

## Display name

- On a room page, a browser without a valid stored name sees the prompt "Dein Anzeigename" with a "Weiter" button. The room is not shown until a name is saved.
- Leading and trailing spaces are trimmed. The name must be 1 to 40 characters. Otherwise the field shows "Bitte gib 1 bis 40 Zeichen ein."
- The name is stored in `localStorage` under `aurora.displayName`. Once saved, the prompt is skipped for every room in that browser.
- The display name is stored in claims and votes as `author` (see below). Room metadata contains no names. Nothing stores IP addresses, user agents or browser identifiers.
- Below the name field the prompt says "Mit demselben Namen findest du deine Stimmen und Claims wieder, auch auf einem anderen Gerät."

## Room state

- `GET /api/rooms/:roomId` returns `{ roomId, docs }`. `docs` maps each collection to its documents by `docId`: `{ [collection]: { [docId]: body } }`. Only documents that have been written appear.
- `PUT /api/rooms/:roomId/docs/:collection/:docId` with a JSON object as body stores that object as one document and returns 204. Writes are last-writer-wins per document. Other documents are not changed.
- `PATCH` on the same path merges a JSON object into the document (plain objects recursively, everything else replaces; a missing document is created) with the same checks as PUT, applied to the merged result. `DELETE` removes one document and returns 204, also when it does not exist. Merges are not serialized: two PATCHes to the same document at the same moment can lose one change.
- Collections: `review`, `claims`, `votes`, `goals`, `risks`, `notes`. The list is defined in one place on the server.
- `docId` matches `^[A-Za-z0-9_-]{1,64}$`.
- Room page: the field "Name des Systems" is stored as document `review/main` under the key `system`. It is saved through PATCH when the field loses focus. While the field has focus, incoming changes do not overwrite the text.
- The room page polls `GET /api/rooms/:roomId` every 3 seconds, so a change saved in one browser shows up in another browser on the same room within 5 seconds.

## Storage

- Rooms and documents live in the Nitro storage mount `rooms` (driver `fs`).
- The base directory is the runtime config `dataDir`, set by the environment variable `NUXT_DATA_DIR`. The default is `.data`. The value is read when the server runs, not at build time.
- Keys:
  - `<roomId>:meta` holds `{ id, adminTokenHash, createdAt, ownerSub }`. `ownerSub` is the creator's `sub`; no endpoint returns it and it grants no rights. `adminTokenHash` is the hex SHA-256 of the admin token. The token itself is never stored.
  - `<roomId>:docs:<collection>:<docId>` holds one document body. No key holds the whole room state.
- Rooms and their documents survive a server restart.

## Limits and errors

- A document, serialized as JSON, is at most 16 KB. A larger body returns 400 and nothing is written.
- A raw request body above about 17 KB (16 KB plus a 1 KB margin for whitespace) returns 413 before it is parsed.
- A room holds at most 2000 documents. A write that would add a 2001st document returns 413. Overwriting an existing document is still allowed.
- A write returns 400 and stores nothing when the collection is not in the list, the `docId` does not match the pattern, or the body is not a JSON object. Arrays, primitive values and invalid JSON all count as not an object.
- Every endpoint under `/api/rooms/:roomId` returns 404 with the same message for an unknown or malformed room ID. It does not reveal which of the two applies.
- The room page for an unknown room shows "Diesen Raum gibt es nicht. Prüf den Link." with a link "Neuen Raum anlegen" to `/`. It does not ask for a display name.

## Fonts

- Geist and Geist Mono are served from aurora's own origin. Pages load no font from a third-party host, so the browser sends no request to `fonts.googleapis.com` or `fonts.gstatic.com`.
- The fonts are the variable woff2 files of the pinned `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` packages (OFL-1.1), imported in `main.css`. The build bundles them unchanged, so the copyright and license notices in the font files stay with them.
- Body text uses `--font-sans` (`Geist Variable`, then a system sans-serif stack). Numbers with `font-mono` use `--font-mono` (`Geist Mono Variable`, then a system monospace stack).
- Fonts load with `font-display: swap`: text shows in the fallback font until the font file arrives.

## Step 1 Mission Statement

- `review/main` holds `system`, `inScope`, `outScope` (text) and `mscheck.q1` to `mscheck.q7` (booleans). Each field is saved through PATCH, so the other keys stay unchanged. Incoming changes do not overwrite a focused frame field.
- The browser stops `inScope` and `outScope` at 2000 characters. The server checks only the general limits (16 KB per document).
- `claims/<id>` is `{ text, at, author }`: `text` is 1 to 140 characters after trimming, `at` is an ISO timestamp. `votes/<id>` is `{ claimId, author }`. `author` is the trimmed display name (1 to 40 characters). IDs are random, at least 128 bits. The 1 to 140 check runs in the browser only. Documents without a string `author` (older ones) count in vote totals but belong to no one.
- Claims are listed oldest first by `at`, with the ID as tie-breaker.
- The "Löschen" button shows only on own claims (see below). The server does not check who deletes. Deleting a claim also deletes every vote with its `claimId`, whoever cast it. The browser sends these deletes one after another.
- Each claim shows its vote count. Votes whose `claimId` points to no claim are left out of every count and of the remaining-votes count.
- A display name has at most one vote per claim. Its remaining votes are 3 minus its active votes. At 0, every "Stimme geben" button is disabled and the page shows "Du hast alle 3 Stimmen vergeben."
- Top claims: claims with at least one vote, sorted by vote count. A claim is a top claim if its count reaches the count of the claim in 4th place, so ties at 4th place are all included and more than 4 claims can be marked. Top claims carry the text label "Top 4".
- Results (vote counts, top claims) are computed, never stored. Assumptions in `app/lib/mission.ts`: 3 votes per person, top group of 4 with ties included, one vote per claim per display name.
- A claim or vote is own when its `author`, trimmed and lower-cased, equals the current display name, trimmed and lower-cased. Nothing about ownership is stored in the browser. The same name in another browser shows the same remaining votes, "Stimme zurücknehmen" and "Löschen".
- Known limit (accepted): ownership is matched by display name only, case-insensitively. Anyone in the room who enters the same name is treated as that person. They see the same own votes and can take them back, use the remaining votes and delete that person's claims. This is a deliberate trade-off for keeping only free display names. It is not fixed with browser, device or account identifiers. The vote limit is still enforced in the browser only.
- If a save, a delete or adding a claim or vote fails, the page shows "Speichern fehlgeschlagen. Versuch es noch einmal."
- The checklist shows seven questions, each with a checkbox. Ticking one stores its `mscheck.qn` through PATCH. Below the list: "Fragen frei formuliert nach LASR, CC BY-SA 4.0."
