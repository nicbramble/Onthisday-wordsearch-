# On-This-Day Word Search (Web)

A Next.js 14 site that shows a new, date-seeded word search every day. Each found word unlocks a short historical blurb from Wikipedia's On-This-Day feed.

## Quick start
```bash
npm i
npm run dev
# open http://localhost:3000
```

## Deploy (Vercel)
1. Push this repo to GitHub.
2. Import the repo in Vercel → Framework: **Next.js**.
3. No special env vars required.
4. Deploy. The API route caches results for 24h.

## Attribution
Data from Wikipedia via the Wikimedia Feed API (`/feed/v1/wikipedia/en/onthisday`). Content is under CC-BY-SA; include attribution in the footer.

## Notes
- Daily rollover uses America/New_York.
- Puzzles are deterministic by date key (`YYYY-MM-DD`).
- Streak is stored in localStorage.
- Code is purposely simple; swap inline styles for Tailwind/CSS Modules if you prefer.

## Roadmap
- Touch drag support + mobile polish
- Difficulty options (grid size, directions)
- Archive past dates
- Login + cloud-synced streaks (Supabase)
