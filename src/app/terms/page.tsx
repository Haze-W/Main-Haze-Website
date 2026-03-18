import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0d0f12] text-[#e6edf3] px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#8b949e] hover:text-white mb-12"
        >
          ← Back
        </Link>
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <p className="text-[#8b949e] text-sm mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-[#8b949e] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Agreement</h2>
            <p>
              By accessing or using Haze, you agree to be bound by these Terms
              of Service. If you disagree with any part of the terms, you may not
              access the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              2. Use of Service
            </h2>
            <p>
              Haze provides a visual desktop app builder. You may use the
              service to design and export Tauri applications. You are
              responsible for ensuring your use complies with applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              3. Intellectual Property
            </h2>
            <p>
              The Haze platform and its original content, features, and
              functionality are owned by Haze. Content you create using Haze
              remains yours. By using Haze, you grant us limited rights to
              provide and improve the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              4. Limitation of Liability
            </h2>
            <p>
              Haze is provided &quot;as is.&quot; We are not liable for any
              indirect, incidental, or consequential damages arising from your
              use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Contact</h2>
            <p>
              For questions about these terms, contact us at{" "}
              <a href="mailto:legal@haze.app" className="text-[#58a6ff] hover:underline">
                legal@haze.app
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[#30363d]">
          <Link
            href="/privacy"
            className="text-[#58a6ff] hover:underline text-sm"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
