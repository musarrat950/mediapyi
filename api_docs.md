# YouTube Video Inspector Public API Documentation

This document describes the public HTTP API provided by the YouTube Video Inspector app. It allows developers to retrieve normalized metadata for a YouTube video (title, description, thumbnails, statistics, channel details) using a YouTube URL or a video ID.

- Base path: `/api/youtube`
- Formats: JSON over HTTP
- CORS: Enabled for all origins (`Access-Control-Allow-Origin: *`)
- Auth: None required (server side still uses its own YouTube Data API key)
- Rate limits: None at the app level. Usage is still subject to the upstream YouTube Data API quota associated with the server.

---

## Overview

- Provide a YouTube URL or 11-character video ID.
- The API extracts the video ID, calls `videos.list` and enriches with `channels.list` from YouTube Data API v3.
- Returns a normalized `video` object.

Example inputs supported:
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`
- `https://www.youtube.com/shorts/dQw4w9WgXcQ`
- `dQw4w9WgXcQ` (11-char ID)

---

## Environments

- Local development base URL: `http://localhost:3000`
- Production base URL: Replace with your deployed domain, e.g. `https://your-domain.example`

---

## Endpoints

### GET /api/youtube

Retrieve video details by query string.

Query parameters (aliases supported):
- `input` (string) — YouTube URL or video ID
- `url` (string) — Alias of `input`
- `id` (string) — Alias of `input`
- `videoId` (string) — Alias of `input`

Example:
```
GET /api/youtube?input=https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Responses:
- 200 OK — `{ "video": <Video> }`
- 400 Bad Request — `{ "error": "Missing input (YouTube URL or videoId)" }`
- 404 Not Found — `{ "error": "Unable to resolve a video from the provided input" }`
- 500 Internal Server Error — `{ "error": "..." }`

CORS headers are present on all responses.

### POST /api/youtube

Retrieve video details by JSON body.

Request body:
```json
{
  "input": "<YouTube URL or video ID>"
}
```

Responses:
- 200 OK — `{ "video": <Video> }`
- 400 Bad Request — `{ "error": "Missing input (YouTube URL or videoId)" }`
- 404 Not Found — `{ "error": "Unable to resolve a video from the provided input" }`
- 500 Internal Server Error — `{ "error": "..." }`

CORS headers are present on all responses.

### OPTIONS /api/youtube

CORS preflight handler.
- Returns `204 No Content` with CORS headers.

---

## Data Model

### Video object
```ts
interface YoutubeThumbnail {
  url: string
  width?: number
  height?: number
}

interface VideoStatistics {
  viewCount?: number
  likeCount?: number
  commentCount?: number
}

interface ChannelInfo {
  id: string
  title: string
  description?: string
  thumbnails?: Record<string, YoutubeThumbnail>
  subscriberCount?: number
  videoCount?: number
}

interface Video {
  id: string
  url: string
  title: string
  description: string
  publishedAt: string // ISO date (e.g., 2009-10-25T06:57:33Z)
  channelId: string
  channelTitle: string
  thumbnails: Record<string, YoutubeThumbnail>
  duration: string // ISO 8601 duration (e.g., PT4M13S)
  tags?: string[]
  statistics?: VideoStatistics
  channel?: ChannelInfo
}
```

Notes:
- `thumbnails` may contain keys like `default`, `medium`, `high`, `standard`, `maxres`.
- The `duration` field is ISO 8601 (e.g., `PT1H2M10S`).

---

## Examples

### curl

GET:
```bash
curl "http://localhost:3000/api/youtube?input=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

POST:
```bash
curl -X POST "http://localhost:3000/api/youtube" \
  -H "Content-Type: application/json" \
  -d '{"input":"dQw4w9WgXcQ"}'
```

### JavaScript (fetch)

```js
async function fetchVideo(input) {
  const res = await fetch(`http://localhost:3000/api/youtube?input=${encodeURIComponent(input)}`)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  const data = await res.json()
  return data.video
}

fetchVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  .then(console.log)
  .catch(console.error)
```

### JavaScript (axios)

```js
import axios from 'axios'

async function fetchVideo(input) {
  const { data } = await axios.get('http://localhost:3000/api/youtube', {
    params: { input },
  })
  return data.video
}
```

### TypeScript (typed response)

```ts
interface ApiResponse { video?: Video; error?: string }

async function fetchVideo(input: string): Promise<Video> {
  const res = await fetch(`http://localhost:3000/api/youtube?input=${encodeURIComponent(input)}`)
  const data = (await res.json()) as ApiResponse
  if (!res.ok || !data.video) throw new Error(data.error || 'Request failed')
  return data.video
}
```

### Python (requests)

```python
import requests

def fetch_video(input: str):
    r = requests.get("http://localhost:3000/api/youtube", params={"input": input}, timeout=30)
    r.raise_for_status()
    return r.json()["video"]

print(fetch_video("dQw4w9WgXcQ"))
```

### Go (net/http)

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
)

type ApiResponse struct {
    Video map[string]any `json:"video"`
    Error string         `json:"error"`
}

func main() {
    base := "http://localhost:3000/api/youtube?input=" + url.QueryEscape("dQw4w9WgXcQ")
    resp, err := http.Get(base)
    if err != nil { panic(err) }
    defer resp.Body.Close()

    var out ApiResponse
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil { panic(err) }

    if resp.StatusCode != 200 {
        panic(out.Error)
    }
    fmt.Println(out.Video)
}
```

---

## Error Handling

- Errors return JSON with an `error` string.
- HTTP status codes indicate the error category:
  - 400 — missing or invalid input
  - 404 — video not found or unresolved
  - 500 — server-side error (e.g., upstream API error, server configuration)

---

## Headers and Content Types

- Request Content-Type for POST: `application/json`
- Response Content-Type: `application/json; charset=utf-8`
- CORS headers on all responses:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET,POST,OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`

---

## Caching

- Current behavior: responses are not explicitly cached (`cache: no-store` is used when calling YouTube). If you need caching, consider adding a reverse proxy (e.g., Vercel, Cloudflare) or server-side caching layer.

---

## Versioning

- Current version: `v1` (implicit)
- Future updates may introduce versioned routes like `/api/v1/youtube` to avoid breaking changes.

---

## Security Considerations

- No API key is required to call this endpoint; it is intended for public use.
- The server’s YouTube API key is never exposed. All calls are server-to-server.
- If you want to restrict usage, consider:
  - Adding per-caller API keys and checking them in the route handler.
  - Enforcing IP-based or token-based rate limits.

---

## Changelog

- 2025-09-22
  - Initial public API release with GET/POST, CORS, and normalized video response.

---

## OpenAPI (Preview)

```yaml
openapi: 3.0.3
info:
  title: YouTube Video Inspector API
  version: 1.0.0
servers:
  - url: http://localhost:3000
paths:
  /api/youtube:
    get:
      summary: Get video details by input
      parameters:
        - in: query
          name: input
          schema:
            type: string
          required: true
          description: YouTube URL or 11-char video ID
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  video:
                    $ref: '#/components/schemas/Video'
        '400': { description: Missing input }
        '404': { description: Unresolved or not found }
        '500': { description: Server error }
    post:
      summary: Get video details by input (JSON)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                input: { type: string }
              required: [input]
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  video:
                    $ref: '#/components/schemas/Video'
        '400': { description: Missing input }
        '404': { description: Unresolved or not found }
        '500': { description: Server error }
components:
  schemas:
    Thumbnail:
      type: object
      properties:
        url: { type: string }
        width: { type: integer, nullable: true }
        height: { type: integer, nullable: true }
    Channel:
      type: object
      properties:
        id: { type: string }
        title: { type: string }
        description: { type: string, nullable: true }
        thumbnails:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/Thumbnail'
        subscriberCount: { type: integer, nullable: true }
        videoCount: { type: integer, nullable: true }
    Statistics:
      type: object
      properties:
        viewCount: { type: integer, nullable: true }
        likeCount: { type: integer, nullable: true }
        commentCount: { type: integer, nullable: true }
    Video:
      type: object
      properties:
        id: { type: string }
        url: { type: string }
        title: { type: string }
        description: { type: string }
        publishedAt: { type: string, format: date-time }
        channelId: { type: string }
        channelTitle: { type: string }
        thumbnails:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/Thumbnail'
        duration: { type: string }
        tags:
          type: array
          items: { type: string }
        statistics:
          $ref: '#/components/schemas/Statistics'
        channel:
          $ref: '#/components/schemas/Channel'
```
