"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type ApiVideo = {
  id: string
  url: string
  title: string
  description: string
  publishedAt: string
  channelId: string
  channelTitle: string
  thumbnails: Record<string, { url: string; width?: number; height?: number }>
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
    thumbnails?: Record<string, { url: string; width?: number; height?: number }>
    subscriberCount?: number
    videoCount?: number
  }
}

export default function Home() {
  const [input, setInput] = useState("")
  const [video, setVideo] = useState<ApiVideo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const bestThumb = useMemo(() => {
    if (!video?.thumbnails) return null
    const variants = Object.values(video.thumbnails || {})
    if (!variants.length) return null
    // pick the largest by area
    return variants
      .slice()
      .sort((a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0))[0]
  }, [video])

  const channelThumb = useMemo(() => {
    const thumbs = video?.channel?.thumbnails
    if (!thumbs) return null
    const variants = Object.values(thumbs)
    if (!variants.length) return null
    return variants
      .slice()
      .sort((a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0))[0]
  }, [video])

  // Update URL with channelId parameter when a video is loaded
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!video?.channelId) return
    const url = new URL(window.location.href)
    url.searchParams.set("channelId", video.channelId)
    window.history.replaceState(null, "", url.toString())
  }, [video?.channelId])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setVideo(null)
    const trimmed = input.trim()
    if (!trimmed) {
      setError("Please enter a YouTube URL or video ID.")
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: trimmed }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data?.error || "Failed to fetch video info")
          return
        }
        setVideo(data.video as ApiVideo)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Network error"
        setError(message)
      }
    })
  }

  return (
    <div className="min-h-screen w-full font-sans bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <main className="mx-auto max-w-3xl p-6 sm:p-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">YouTube Video Inspector</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Enter a YouTube link or video ID to view details.</p>
        </div>

        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <Input
            placeholder="https://www.youtube.com/watch?v=... or 11-char ID"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          />
          <Button type="submit" disabled={isPending} className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300">
            {isPending ? "Fetching..." : "Fetch"}
          </Button>
        </form>

        {error && (
          <div className="mt-4">
            <Alert className="border-neutral-200 dark:border-neutral-800">
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription className="text-neutral-600 dark:text-neutral-400">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="mt-6">
          {isPending && !video ? (
            <Card className="border-neutral-200 dark:border-neutral-800">
              <CardHeader>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent className="grid gap-4">
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ) : video ? (
            <Card className="border-neutral-200 dark:border-neutral-800">
              <CardHeader>
                <CardTitle className="text-neutral-900 dark:text-neutral-100">{video.title}</CardTitle>
                <CardDescription className="text-neutral-600 dark:text-neutral-400">
                  <a
                    href={`https://www.youtube.com/channel/${video.channel?.id ?? video.channelId}?utm_source=mediapyi`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 hover:underline text-neutral-700 dark:text-neutral-300"
                    title={video.channel?.title ?? video.channelTitle}
                  >
                    <Avatar className="h-6 w-6">
                      {channelThumb?.url ? (
                        <AvatarImage src={channelThumb.url} alt={video.channel?.title ?? video.channelTitle} />
                      ) : null}
                      <AvatarFallback>
                        {(video.channel?.title ?? video.channelTitle)
                          .split(" ")
                          .map((s) => s[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{video.channel?.title ?? video.channelTitle}</span>
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {bestThumb ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
                    <Image src={bestThumb.url} alt={video.title} fill className="object-contain" sizes="(max-width: 768px) 100vw, 800px" />
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <Badge variant="secondary" className="bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">{new Date(video.publishedAt).toLocaleString()}</Badge>
                  {video.statistics?.viewCount !== undefined && (
                    <Badge variant="outline" className="border-neutral-300 dark:border-neutral-700">{video.statistics.viewCount.toLocaleString()} views</Badge>
                  )}
                  {video.statistics?.likeCount !== undefined && (
                    <Badge variant="outline" className="border-neutral-300 dark:border-neutral-700">{video.statistics.likeCount.toLocaleString()} likes</Badge>
                  )}
                  {video.statistics?.commentCount !== undefined && (
                    <Badge variant="outline" className="border-neutral-300 dark:border-neutral-700">{video.statistics.commentCount.toLocaleString()} comments</Badge>
                  )}
                  <Badge variant="outline" className="border-neutral-300 dark:border-neutral-700">{video.duration}</Badge>
                </div>

                {video.tags && video.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {video.tags.slice(0, 12).map((t) => (
                      <Badge key={t} variant="secondary" className="bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">#{t}</Badge>
                    ))}
                  </div>
                )}

                <Separator className="bg-neutral-200 dark:bg-neutral-800" />

                <div className="space-y-2">
                  <div className="text-sm text-neutral-500">Description</div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
                    {video.description || "No description"}
                  </p>
                </div>

                {video.channel && (
                  <div className="space-y-2">
                    <div className="text-sm text-neutral-500">Channel</div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                      <Badge variant="outline" className="border-neutral-300 dark:border-neutral-700">{video.channel.title}</Badge>
                      {video.channel.subscriberCount !== undefined && (
                        <Badge variant="outline" className="border-neutral-300 dark:border-neutral-700">{video.channel.subscriberCount.toLocaleString()} subscribers</Badge>
                      )}
                      {video.channel.videoCount !== undefined && (
                        <Badge variant="outline" className="border-neutral-300 dark:border-neutral-700">{video.channel.videoCount.toLocaleString()} videos</Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button asChild variant="outline" className="border-neutral-300 text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900">
                  <a href={video.url} target="_blank" rel="noreferrer">Open on YouTube</a>
                </Button>
              </CardFooter>
            </Card>
          ) : null}
        </div>
      </main>
    </div>
  )
}
