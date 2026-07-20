# Nexal — Staging Deploy Guide (Plan B: single Express backend)

This branch (`staging`) consolidates everything onto **one Express + MongoDB backend**.
The Next.js app is now **frontend-only** — all `/api/*` routes were removed and every call
goes to the Express server via `NEXT_PUBLIC_API_URL`. `main` (production) is untouched.

The goal of staging: prove the full loop works end-to-end before it ever touches production —
**register/login → upload → open workspace → highlight (realtime, two tabs) → AI generate.**

---

## 1. Architecture after consolidation

```
┌─────────────────────────┐         ┌──────────────────────────────────┐
│  Next.js frontend        │  HTTPS   │  Express backend                  │
│  (Vercel)                │ ───────► │  (Render)                         │
│  - pages only            │  WSS     │  - /api/auth  (JWT)               │
│  - NEXT_PUBLIC_API_URL   │ ───────► │  - /api/documents (upload+stream) │
│                          │          │  - /api/folders                   │
│                          │          │  - /api/highlights                │
│                          │          │  - /api/ai/generate (RAG + LLM)   │
│                          │          │  - Socket.io (JWT handshake)      │
└─────────────────────────┘          └───────────────┬───────────────────┘
                                                      │
                                              ┌───────▼────────┐
                                              │ MongoDB Atlas   │
                                              │ (staging DB)    │
                                              │ - users         │
                                              │ - documents     │
                                              │ - folders       │
                                              │ - highlights    │
                                              │ - embeddings    │
                                              └─────────────────┘
```

Three datastores collapsed into one: db.json (highlights) and the disk vector store
(embeddings) both moved into MongoDB. IndexedDB remains only as an offline fallback in the browser.

> **Known staging limitation — uploaded PDFs live on ephemeral disk.**
> Documents are written to the Render instance's local disk (`backend/src/uploads`).
> Render wipes that disk on every deploy/restart, so uploaded PDFs disappear (their
> Mongo metadata + embeddings survive, but the file bytes and PDF stream 404).
> Fine for smoke-testing. **Production follow-up:** move storage to S3 (your AWS keys
> are already in `.env.local`) or a Render persistent disk. Tracked, not done here.

---

## 2. Staging MongoDB (Atlas)

Keep staging data separate from production so tests can't corrupt real data.

1. In MongoDB Atlas, either create a new cluster **or** reuse the existing `Nexal` cluster
   with a **different database name**. This branch already sets the DB name to
   `nexal_staging` in the connection string, so reusing the cluster is safe — the two
   databases are isolated.
2. Under **Network Access**, allow Render's outbound IPs (or `0.0.0.0/0` for staging only —
   tighten before production).
3. Copy the SRV connection string. It must include the database name:
   ```
   mongodb+srv://<user>:<pass>@nexal.62shuqz.mongodb.net/nexal_staging?appName=Nexal
   ```

> **Rotate the committed secret.** The current `MONGO_URI` password and `GITHUB_TOKEN`
> have been present in local env files — before going to production, rotate both and set
> them only through the host's env-var UI, never in committed files.

---

## 3. Backend on Render

**Service type:** Web Service · **Root:** repo root · **Runtime:** Node 22

- **Build command:** `npm install`
- **Start command:** `npm run backend:start`  (runs `node backend/src/server.js`)

**Environment variables** (Render dashboard → Environment):

| Key            | Value                                                                 |
|----------------|-----------------------------------------------------------------------|
| `PORT`         | `5000` (Render injects its own `PORT`; the server already honors it)  |
| `MONGO_URI`    | staging SRV string from step 2 (with `/nexal_staging`)                |
| `JWT_SECRET`   | a fresh long random string (do **not** reuse the placeholder)         |
| `CLIENT_URL`   | the Vercel frontend URL, e.g. `https://nexal-staging.vercel.app`      |
| `GITHUB_TOKEN` | your GitHub Models PAT (used for embeddings **and** chat)             |

`CLIENT_URL` matters twice: it's the CORS allow-origin **and** the Socket.io CORS origin.
If it's wrong, REST calls and the websocket both fail from the browser.

---

## 4. Frontend on Vercel

**Framework preset:** Next.js · **Root:** repo root

**Environment variable:**

| Key                   | Value                                              |
|-----------------------|----------------------------------------------------|
| `NEXT_PUBLIC_API_URL` | the Render backend URL, e.g. `https://nexal-api-staging.onrender.com` |

- `NEXT_PUBLIC_*` vars are inlined at **build time** — after changing it, **redeploy**.
- No trailing slash (the frontend builds URLs as `${NEXT_PUBLIC_API_URL}/api/...`).

---

## 5. The chicken-and-egg URL step

The backend needs `CLIENT_URL` (the frontend URL) and the frontend needs
`NEXT_PUBLIC_API_URL` (the backend URL). Order that works:

1. Deploy backend once → note its Render URL.
2. Set `NEXT_PUBLIC_API_URL` on Vercel → deploy frontend → note its Vercel URL.
3. Set `CLIENT_URL` on Render to the Vercel URL → **redeploy backend** (CORS/Socket origin).

---

## 6. Smoke test (do this in order)

Run against the deployed staging URLs. Each step depends on the previous one.

- [ ] **Register** a new user at `/signup` → redirects, token stored.
- [ ] **Login** at `/login` with that user → lands on storage/home.
- [ ] **Upload** a PDF → appears in `/storage`. (Backend log shows `[RAG] Indexed N chunks`.)
- [ ] **Open workspace** for that PDF → the PDF renders (streamed from Express).
- [ ] **Highlight — realtime:** open the *same* document URL in **two browser tabs**
      (same login). Create a highlight in tab A → it appears in tab B within a second,
      and the collaborator count/active-readers updates. Delete it in A → gone in B.
- [ ] **AI generate:** select a highlight → Summarize/Explain/Flashcards → streamed
      response appears. Ask a Chat question about the doc → answer reflects PDF content
      (RAG working). No token → you'll see the "Configuration Error" message instead.

**If realtime fails:** open dev console. A socket that connects then immediately
disconnects usually means the JWT handshake was rejected — check the token is in
`localStorage` and `JWT_SECRET` matches between the token issuer and the server.

**If AI has no document context:** confirm `GITHUB_TOKEN` is set **on Render** (not just
`.env.local`), and that the upload log showed successful indexing. Re-uploading after a
Render restart is expected (ephemeral disk — see the limitation note above).

---

## 7. Local dev (unchanged)

```bash
npm run dev     # runs Express (nodemon) + Next.js together via concurrently
```

Local env files already set: `.env` (backend: MONGO_URI/JWT_SECRET/CLIENT_URL/GITHUB_TOKEN)
and `.env.local` (frontend: NEXT_PUBLIC_API_URL/GITHUB_TOKEN). Both default to localhost.

---

## 8. Deploy safety

- All work is on `staging`. As long as your Render/Vercel **production** services deploy
  from `main` (or a `prod` branch) only, staging deploys cannot affect production.
- Point the **staging** Render + Vercel services at the `staging` branch explicitly.
- Do not merge `staging` → `main` until the smoke test above is fully green.
