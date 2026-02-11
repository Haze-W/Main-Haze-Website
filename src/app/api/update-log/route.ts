import { NextResponse } from "next/server";
import { parseUpdateLog } from "@/lib/update-log";

const UPDATE_LOG_PATH = process.env.UPDATE_LOG_GITHUB_PATH || "update-log.json";
const BRANCH = process.env.UPDATE_LOG_GITHUB_BRANCH || "main";
const OWNER = process.env.UPDATE_LOG_GITHUB_OWNER;
const REPO = process.env.UPDATE_LOG_GITHUB_REPO;
const TOKEN = process.env.UPDATE_LOG_GITHUB_TOKEN;

function getRawUrl() {
  if (!OWNER || !REPO) return null;
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${UPDATE_LOG_PATH}`;
}

export async function GET() {
  const rawUrl = getRawUrl();

  if (!rawUrl) {
    return NextResponse.json(
      {
        entries: [],
        error:
          "Missing UPDATE_LOG_GITHUB_OWNER or UPDATE_LOG_GITHUB_REPO environment variables.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const response = await fetch(rawUrl, {
      headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          entries: [],
          error: `GitHub update log fetch failed with status ${response.status}.`,
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const data = await response.json();
    const entries = parseUpdateLog(data);

    return NextResponse.json(
      { entries },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { entries: [], error: "Failed to load update log." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
