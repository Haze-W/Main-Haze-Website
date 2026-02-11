import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0d0f12] text-[#e6edf3] px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#8b949e] hover:text-white mb-12"
        >
          ← Back
        </Link>
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-[#8b949e] text-sm mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-[#8b949e] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              1. Information We Collect
            </h2>
            <p>
              We collect information you provide directly, such as your email
              address and name when you create an account. We also collect usage
              data to improve our service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              2. How We Use Your Information
            </h2>
            <p>
              We use your information to provide and improve Render, communicate
              with you, and ensure the security of our service. We do not sell
              your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              3. Data Security
            </h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect your personal data against unauthorized access,
              alteration, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              4. Your Rights
            </h2>
            <p>
              You may access, correct, or delete your personal information at any
              time through your account settings or by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Contact</h2>
            <p>
              For privacy-related questions, contact us at{" "}
              <a href="mailto:privacy@render.app" className="text-[#58a6ff] hover:underline">
                privacy@render.app
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[#30363d]">
          <Link
            href="/terms"
            className="text-[#58a6ff] hover:underline text-sm"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
