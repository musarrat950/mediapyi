import { NextRequest, NextResponse } from "next/server"
import { getVideoByInput } from "@/api/youtube"

function withCORS(init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  headers.set("Access-Control-Allow-Origin", "*")
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  headers.set("Access-Control-Max-Age", "86400")
  return { ...init, headers }
}

function jsonCORS(body: any, init?: ResponseInit) {
  return NextResponse.json(body, withCORS(init))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const input = (body?.input ?? "").toString().trim()

    if (!input) {
      return jsonCORS({ error: "Missing input (YouTube URL or videoId)" }, { status: 400 })
    }

    const video = await getVideoByInput(input)
    if (!video) {
      return jsonCORS({ error: "Unable to resolve a video from the provided input" }, { status: 404 })
    }

    return jsonCORS({ video })
  } catch (err: any) {
    const message = err?.message || "Internal Server Error"
    return jsonCORS({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    // Accept multiple aliases for developer convenience
    const input = (
      searchParams.get("input") ||
      searchParams.get("url") ||
      searchParams.get("id") ||
      searchParams.get("videoId") ||
      ""
    )
      .toString()
      .trim()

    if (!input) {
      return jsonCORS({ error: "Missing input (YouTube URL or videoId)" }, { status: 400 })
    }

    const video = await getVideoByInput(input)
    if (!video) {
      return jsonCORS({ error: "Unable to resolve a video from the provided input" }, { status: 404 })
    }

    return jsonCORS({ video })
  } catch (err: any) {
    const message = err?.message || "Internal Server Error"
    return jsonCORS({ error: message }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, withCORS({ status: 204 }))
}
