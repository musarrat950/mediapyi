## YouTube Video Inspector

This app lets you paste a YouTube link or video ID and view details pulled from the YouTube Data API v3, including title, description, channel info, statistics, and thumbnails.

Built with Next.js App Router, TypeScript, Tailwind, and shadcn/ui.

### Environment variables

Create a `.env` file at the project root and add your YouTube API key:

```
YOUTUBE_DATA_API_KEY=YOUR_API_KEY_HERE
```

You can obtain an API key from Google Cloud Console by enabling the YouTube Data API v3.

The server reads `process.env.YOUTUBE_DATA_API_KEY` for all API calls. The key is never exposed to the client.

### Run locally

Install dependencies and start the dev server:

```
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Project structure

- `src/api/youtube.ts` — internal backend service for talking to the YouTube Data API.
- `src/app/api/youtube/route.ts` — Next.js route handler that accepts `{ input: string }` (YouTube URL or 11-char ID) and returns `{ video }`.
- `src/app/page.tsx` — UI built with shadcn components to submit input and render video details.
- `next.config.ts` — allows `next/image` to load YouTube thumbnail domains.

### API route

POST `/api/youtube`

Request body:

```
{ "input": "https://www.youtube.com/watch?v=VIDEOID" }
```

Response (200):

```
{ "video": { /* normalized video payload incl. title, thumbnails, stats, channel */ } }
```

Errors:

- 400 — missing input
- 404 — could not resolve video
- 500 — server error (e.g. API key missing or upstream error)

### Public API for external use (CORS-enabled)

There are no app-level rate limits enforced by this endpoint. Usage is still subject to the upstream YouTube Data API quota associated with your server API key.

Production base URL: `https://mediapye.vercel.app/api/youtube`

Local dev base URL: `http://localhost:3000/api/youtube`

Methods:

- `GET /api/youtube?input=<url-or-id>`
- `POST /api/youtube` with JSON `{ "input": "<url-or-id>" }`

CORS: `Access-Control-Allow-Origin: *` is enabled so you can call this from browsers.

Examples:

```bash
# GET (prod)
curl "https://mediapye.vercel.app/api/youtube?input=https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# POST (prod)
curl -X POST "https://mediapye.vercel.app/api/youtube" \
  -H "Content-Type: application/json" \
  -d '{"input":"dQw4w9WgXcQ"}'

# GET (local)
curl "http://localhost:3000/api/youtube?input=https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# POST (local)
curl -X POST "http://localhost:3000/api/youtube" \
  -H "Content-Type: application/json" \
  -d '{"input":"dQw4w9WgXcQ"}'
```

Response:

```json
{
  "video": {
    "id": "...",
    "url": "https://www.youtube.com/watch?v=...",
    "title": "...",
    "description": "...",
    "publishedAt": "...",
    "channelId": "...",
    "channelTitle": "...",
    "thumbnails": { "maxres": { "url": "..." } },
    "duration": "PT4M13S",
    "tags": ["..."],
    "statistics": { "viewCount": 123, "likeCount": 45, "commentCount": 6 },
    "channel": {
      "id": "...",
      "title": "...",
      "thumbnails": { "default": { "url": "..." } },
      "subscriberCount": 1000,
      "videoCount": 120
    }
  }
}
```

Errors are structured as `{ "error": "message" }` with appropriate status codes.

### Notes

- Only shadcn/ui components are used for the interface, with a neutral color palette.
- Thumbnails are rendered via `next/image` and remote domains are whitelisted.
