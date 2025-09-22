/*
  YouTube Data API service utilities.
  - Separates API logic from the Next.js route and UI.
  - Uses process.env.YOUTUBE_DATA_API_KEY at runtime.
*/

export type YoutubeThumbnail = {
  url: string
  width?: number
  height?: number
}

export type YoutubeVideo = {
  id: string
  url: string
  title: string
  description: string
  publishedAt: string
  channelId: string
  channelTitle: string
  thumbnails: Record<string, YoutubeThumbnail>
  duration: string
  tags?: string[]
  statistics?: {
    viewCount?: number
    likeCount?: number
    commentCount?: number
  }
  channel?: {
    id: string
    title: string
    description?: string
    thumbnails?: Record<string, YoutubeThumbnail>
    subscriberCount?: number
    videoCount?: number
  }
}

const YT_API_BASE = "https://www.googleapis.com/youtube/v3"

export function extractVideoId(input: string): string | null {
  try {
    // If already an 11-char YouTube ID pattern, accept as-is
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input

    const url = new URL(input)
    const host = url.hostname.replace(/^www\./, "")

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      // https://www.youtube.com/watch?v=VIDEOID
      const v = url.searchParams.get("v")
      if (v) return v

      // Shorts: https://www.youtube.com/shorts/VIDEOID
      const parts = url.pathname.split("/").filter(Boolean)
      const idx = parts.indexOf("shorts")
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1]

      // Embed: https://www.youtube.com/embed/VIDEOID
      const embedIdx = parts.indexOf("embed")
      if (embedIdx !== -1 && parts[embedIdx + 1]) return parts[embedIdx + 1]
    }

    if (host === "youtu.be") {
      // https://youtu.be/VIDEOID
      const parts = url.pathname.split("/").filter(Boolean)
      if (parts[0]) return parts[0]
    }

    return null
  } catch {
    // Not a URL, maybe it's an ID-like string
    return /^[a-zA-Z0-9_-]{11}$/.test(input) ? input : null
  }
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

export async function getVideoById(videoId: string): Promise<YoutubeVideo | null> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY
  if (!apiKey) {
    throw new Error("Missing YOUTUBE_DATA_API_KEY in environment")
  }

  // videos.list for details
  const parts = ["snippet", "contentDetails", "statistics"].join(",")
  const url = `${YT_API_BASE}/videos?part=${parts}&id=${encodeURIComponent(videoId)}&key=${apiKey}`

  type VideosResponse = {
    items: Array<{
      id: string
      snippet: {
        publishedAt: string
        channelId: string
        title: string
        description: string
        thumbnails: Record<string, YoutubeThumbnail>
        tags?: string[]
        channelTitle: string
      }
      contentDetails: {
        duration: string // ISO 8601
      }
      statistics?: {
        viewCount?: string
        likeCount?: string
        commentCount?: string
      }
    }>
  }

  const data = await fetchJSON<VideosResponse>(url)
  const item = data.items?.[0]
  if (!item) return null

  const base: YoutubeVideo = {
    id: item.id,
    url: `https://www.youtube.com/watch?v=${item.id}`,
    title: item.snippet.title,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    thumbnails: item.snippet.thumbnails || {},
    duration: item.contentDetails.duration,
    tags: item.snippet.tags,
    statistics: item.statistics
      ? {
          viewCount: item.statistics.viewCount ? Number(item.statistics.viewCount) : undefined,
          likeCount: item.statistics.likeCount ? Number(item.statistics.likeCount) : undefined,
          commentCount: item.statistics.commentCount ? Number(item.statistics.commentCount) : undefined,
        }
      : undefined,
  }

  // Enrich with channel info
  try {
    const channel = await getChannelById(base.channelId, apiKey)
    if (channel) base.channel = channel
  } catch {
    // Non-fatal
  }

  return base
}

async function getChannelById(channelId: string, apiKey: string) {
  const parts = ["snippet", "statistics"].join(",")
  const url = `${YT_API_BASE}/channels?part=${parts}&id=${encodeURIComponent(channelId)}&key=${apiKey}`
  type ChannelsResponse = {
    items: Array<{
      id: string
      snippet: {
        title: string
        description?: string
        thumbnails?: Record<string, YoutubeThumbnail>
      }
      statistics?: {
        subscriberCount?: string
        videoCount?: string
      }
    }>
  }
  const data = await fetchJSON<ChannelsResponse>(url)
  const item = data.items?.[0]
  if (!item) return undefined
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnails: item.snippet.thumbnails,
    subscriberCount: item.statistics?.subscriberCount ? Number(item.statistics.subscriberCount) : undefined,
    videoCount: item.statistics?.videoCount ? Number(item.statistics.videoCount) : undefined,
  }
}

export async function getVideoByInput(input: string): Promise<YoutubeVideo | null> {
  const id = extractVideoId(input)
  if (!id) return null
  return getVideoById(id)
}
