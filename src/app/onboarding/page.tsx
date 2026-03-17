"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useAuth } from "@/lib/auth-context";
import {
  isLanguageOption,
  isRuntimeOption,
  type LanguageOption,
  type RuntimeOption,
} from "@/lib/onboarding";
import {
  LANGUAGE_WIZARD_OPTIONS,
  RUNTIME_WIZARD_OPTIONS,
} from "@/lib/onboarding-copy";

interface PreferenceResponse {
  onboardingCompleted: boolean;
  preferredRuntime: string | null;
  preferredLanguage: string | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [runtime, setRuntime] = useState<RuntimeOption | null>(null);
  const [language, setLanguage] = useState<LanguageOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/onboarding/preferences", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as PreferenceResponse;
        if (ignore) return;
        if (data.onboardingCompleted) {
          router.replace("/dashboard");
          return;
        }
        if (isRuntimeOption(data.preferredRuntime)) setRuntime(data.preferredRuntime);
        if (isLanguageOption(data.preferredLanguage)) setLanguage(data.preferredLanguage);
      } catch {
        // Ignore load errors, user can still submit onboarding.
      }
    })();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async () => {
    if (!runtime || !language) {
      setError("Please select runtime and language to continue.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredRuntime: runtime,
          preferredLanguage: language,
          onboardingCompleted: true,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save onboarding.");
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save onboarding.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingWizard
      heading="Welcome to Haze"
      description="Set your defaults once, then generate desktop app UI faster from prompts and designs."
      runtimeOptions={RUNTIME_WIZARD_OPTIONS}
      languageOptions={LANGUAGE_WIZARD_OPTIONS}
      runtimeValue={runtime}
      languageValue={language}
      saving={saving}
      error={error}
      submitLabel="Complete onboarding"
      onRuntimeChange={(value) => {
        if (isRuntimeOption(value)) setRuntime(value);
      }}
      onLanguageChange={(value) => {
        if (isLanguageOption(value)) setLanguage(value);
      }}
      onSubmit={handleSubmit}
    />
  );
}
