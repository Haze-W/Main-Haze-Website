"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createProject } from "@/lib/projects";
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
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

interface PreferenceResponse {
  onboardingCompleted: boolean;
  preferredRuntime: string | null;
  preferredLanguage: string | null;
}

const TEMPLATE_NAMES: Record<string, string> = {
  blank: "Blank App",
  dashboard: "Desktop Dashboard",
  utility: "Utility App",
  custom: "Custom Layout",
};

export default function NewProjectPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [runtime, setRuntime] = useState<RuntimeOption | null>(null);
  const [language, setLanguage] = useState<LanguageOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = params.get("template") ?? "blank";
  const projectTitle = useMemo(
    () => `New ${TEMPLATE_NAMES[template] ?? "Project"}`,
    [template]
  );

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
        if (isRuntimeOption(data.preferredRuntime)) setRuntime(data.preferredRuntime);
        if (isLanguageOption(data.preferredLanguage)) setLanguage(data.preferredLanguage);
      } catch {
        // Ignore and keep manual choice flow.
      }
    })();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async () => {
    if (!runtime || !language) {
      setError("Choose both runtime and language before continuing.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const project = createProject(projectTitle, template, {
        runtimeTarget: runtime,
        languageTarget: language,
      });
      router.replace(`/editor?project=${project.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingWizard
      heading="Project setup"
      description={`Configure defaults for ${projectTitle}. You can override these per project now and keep account defaults for later projects.`}
      runtimeOptions={RUNTIME_WIZARD_OPTIONS}
      languageOptions={LANGUAGE_WIZARD_OPTIONS}
      runtimeValue={runtime}
      languageValue={language}
      saving={saving}
      error={error}
      submitLabel="Create project"
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
