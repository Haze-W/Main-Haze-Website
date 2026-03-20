import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, hasDatabase } from "@/lib/db";
import { user } from "@/lib/db/schema";
import {
  isLanguageOption,
  isRuntimeOption,
  type LanguageOption,
  type RuntimeOption,
} from "@/lib/onboarding";

async function getSessionUserId(): Promise<string | null> {
  if (!hasDatabase || !auth) return null;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user?.id ?? null;
}

export async function GET() {
  try {
    if (!hasDatabase || !db) {
      return NextResponse.json(
        { error: "Database not configured. Use demo mode to explore the app." },
        { status: 503 }
      );
    }
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [current] = await db
      .select({
        onboardingCompleted: user.onboardingCompleted,
        preferredRuntime: user.preferredRuntime,
        preferredLanguage: user.preferredLanguage,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!current) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      onboardingCompleted: current.onboardingCompleted,
      preferredRuntime: current.preferredRuntime,
      preferredLanguage: current.preferredLanguage,
    });
  } catch (error) {
    console.error("Failed to load onboarding preferences:", error);
    return NextResponse.json(
      { error: "Failed to load onboarding preferences" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    if (!hasDatabase || !db) {
      return NextResponse.json(
        { error: "Database not configured. Use demo mode to explore the app." },
        { status: 503 }
      );
    }
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const runtime = body.preferredRuntime;
    const language = body.preferredLanguage;
    const completed = body.onboardingCompleted;

    if (runtime != null && !isRuntimeOption(runtime)) {
      return NextResponse.json({ error: "Invalid runtime target" }, { status: 400 });
    }

    if (language != null && !isLanguageOption(language)) {
      return NextResponse.json({ error: "Invalid language target" }, { status: 400 });
    }

    if (completed != null && typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "Invalid onboarding completion flag" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(user)
      .set({
        preferredRuntime: (runtime ?? null) as RuntimeOption | null,
        preferredLanguage: (language ?? null) as LanguageOption | null,
        onboardingCompleted: completed ?? false,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning({
        onboardingCompleted: user.onboardingCompleted,
        preferredRuntime: user.preferredRuntime,
        preferredLanguage: user.preferredLanguage,
      });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to save onboarding preferences:", error);
    return NextResponse.json(
      { error: "Failed to save onboarding preferences" },
      { status: 500 }
    );
  }
}
