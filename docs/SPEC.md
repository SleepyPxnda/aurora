# Spec

## Rooms

- `POST /api/rooms` creates a room and returns `{ roomId, adminToken }`. Both values are random, 128 bits each, base64url-encoded. This is the only response that contains the admin token.
- The start page `/` has a "Raum anlegen" button. After creation it shows the room link and the admin link, each with a "Kopieren" button, the note "Behalte den Admin-Link für dich. Er lässt sich nicht wiederherstellen." and "Raum öffnen", which opens the admin link. If creation fails, it shows "Der Raum konnte nicht angelegt werden. Versuch es noch einmal."
- There is no login and no room list. Whoever has the room link can read and write the room.
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
- The display name is never sent to the server. Stored documents and room metadata contain no names, IP addresses, user agents or other client identifiers.

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
  - `<roomId>:meta` holds `{ id, adminTokenHash, createdAt }`. `adminTokenHash` is the hex SHA-256 of the admin token. The token itself is never stored.
  - `<roomId>:docs:<collection>:<docId>` holds one document body. No key holds the whole room state.
- Rooms and their documents survive a server restart.

## Limits and errors

- A document, serialized as JSON, is at most 16 KB. A larger body returns 400 and nothing is written.
- A raw request body above about 17 KB (16 KB plus a 1 KB margin for whitespace) returns 413 before it is parsed.
- A room holds at most 2000 documents. A write that would add a 2001st document returns 413. Overwriting an existing document is still allowed.
- A write returns 400 and stores nothing when the collection is not in the list, the `docId` does not match the pattern, or the body is not a JSON object. Arrays, primitive values and invalid JSON all count as not an object.
- Every endpoint under `/api/rooms/:roomId` returns 404 with the same message for an unknown or malformed room ID. It does not reveal which of the two applies.
- The room page for an unknown room shows "Diesen Raum gibt es nicht. Prüf den Link." with a link "Neuen Raum anlegen" to `/`. It does not ask for a display name.

## Step 1 Mission Statement

- `review/main` holds `system`, `inScope`, `outScope` (text) and `mscheck.q1` to `mscheck.q7` (booleans). Each field is saved through PATCH, so the other keys stay unchanged. Incoming changes do not overwrite a focused frame field.
- The browser stops `inScope` and `outScope` at 2000 characters. The server checks only the general limits (16 KB per document).
- `claims/<id>` is `{ text, at }`: `text` is 1 to 140 characters after trimming, `at` is an ISO timestamp. `votes/<id>` is `{ claimId }`. IDs are random, at least 128 bits. The 1 to 140 check runs in the browser only. No document holds a participant or browser identifier.
- Claims are listed oldest first by `at`, with the ID as tie-breaker.
- The "Löschen" button shows only on claims created in this browser. The server does not check who deletes. Deleting a claim also deletes every vote with its `claimId`, whoever cast it. The browser sends these deletes one after another.
- Each claim shows its vote count. Votes whose `claimId` points to no claim are left out of every count and of the remaining-votes count.
- A browser has at most one vote per claim. Its remaining votes are 3 minus its active votes. At 0, every "Stimme geben" button is disabled and the page shows "Du hast alle 3 Stimmen vergeben."
- Top claims: claims with at least one vote, sorted by vote count. A claim is a top claim if its count reaches the count of the claim in 4th place, so ties at 4th place are all included and more than 4 claims can be marked. Top claims carry the text label "Top 4".
- Results (vote counts, top claims) are computed, never stored. Assumptions in `app/lib/mission.ts`: 3 votes per person, top group of 4 with ties included, one vote per claim per browser.
- A browser keeps the IDs of its own claims and votes in `localStorage` under `aurora.own.<roomId>`, and they survive a reload. If storage is unavailable or holds invalid data, the lists start empty and are kept in memory only. Known limit: after clearing storage or on another device a person can vote again and cannot take back or delete earlier votes and claims. The vote limit is enforced in the browser only.
- If a save, a delete or adding a claim or vote fails, the page shows "Speichern fehlgeschlagen. Versuch es noch einmal." The local lists change only after the server has confirmed the write.
- The checklist shows seven questions, each with a checkbox. Ticking one stores its `mscheck.qn` through PATCH. Below the list: "Fragen frei formuliert nach LASR, CC BY-SA 4.0."
