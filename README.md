# 🎬 Film Rater

A live film rating app where users can add films, rate them, and post reviews — all updating in real time across browser tabs.

**This codebase is part of a code review exercise.** Spend 20 minutes using the app and reading the code, then you'll discuss it as a group.

---

## Try it first

Open it in two browser tabs side by side. Add a film in one tab and watch it appear in the other. Rate a film and watch the score update everywhere simultaneously. That's WebSockets in action.

---

## Then read the code

There are two files to read:

| File | What it is |
|------|-----------|
| `backend/server.js` | The Express + WebSocket backend |
| `frontend/index.html` | The HTML/JS frontend — one file, no build step |

**Read in this order:**

1. Skim `server.js` top to bottom — get a feel for the shape before reading details
2. Find the three helper functions at the top — understand what each one does
3. Read each route — what does it accept, what does it do, what does it respond?
4. Read the WebSocket server section
5. Read `index.html` — focus on `ws.onmessage` and `renderFilms()`

---

## While you read, write down

- **Things that look wrong or broken** — bugs you can see
- **Things that smell off** — code that works but feels bad
- **Things you don't understand** — questions to ask the group
- **Things that look good** — don't only look for problems

You'll share these with the group. One observation each, no discussion yet — just get everything on the board first.

---

## Some questions to keep in mind

- How does a film rating made in one browser end up on another browser's screen?
- Can you trace the exact journey of a single click through the whole codebase?
- Are the WebSocket messages from the server consistent? Look carefully.
- Is there any code that does the same thing more than once?
- Is there anything the code does that it doesn't need to?
- Would you be comfortable adding a new feature to this codebase? Why or why not?

---

## Run it locally

```bash
# Backend
cd backend
npm install
npm start
# → listening on http://localhost:3000

# Frontend
# Open frontend/index.html directly in your browser
# or serve it with: npx serve frontend
```

The frontend connects to `http://localhost:3000` by default. Open multiple tabs to see the real-time updates.

---

## Tech used

- **Backend:** Node.js, Express, [`websocket`](https://www.npmjs.com/package/websocket) npm package
- **Frontend:** Plain HTML, CSS, vanilla JS — no framework, no build step
- **Real-time:** WebSockets for live updates across all connected clients
- **Data:** In-memory only — restarts reset everything

---

*Built for [Migracode Barcelona](https://migracode.org) — Decomposition Module Sprint 3*
