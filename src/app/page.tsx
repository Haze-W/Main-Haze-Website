"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Layout,
  Download,
  Box,
  Sparkles,
  ChevronDown,
  Monitor,
  Zap,
  Palette,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import styles from "./landing.module.css";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "What is Render?",
      a: "Render is a visual desktop app builder. Design frames and components, then export production-ready Tauri apps with one click—no code required.",
    },
    {
      q: "Do I need to know how to code?",
      a: "No. Render lets you design visually. When you're ready, export and run the generated Tauri project. Optional: tweak the code if you want.",
    },
    {
      q: "What can I build with Render?",
      a: "IDE-style apps, dashboards, tools, utilities—any desktop application that benefits from a professional layout and component library.",
    },
  ];

  return (
    <div className={styles.landing}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>Render</span>
        </Link>
        <nav className={styles.nav}>
          <Link href="#features" className={styles.navLink}>
            Features
          </Link>
          <Link href="#faq" className={styles.navLink}>
            FAQ
          </Link>
          {isAuthenticated ? (
            <Link href="/dashboard" className={styles.navCtaPrimary}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={styles.navLinkLogin}>
                Login
              </Link>
              <Link href="/signup" className={styles.navCtaPrimary}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroBg} aria-hidden>
            <div className={styles.glow} />
            <div className={styles.gridOverlay} />
          </div>

          <div className={styles.pill}>Visual Desktop App Builder</div>
          <h1 className={styles.heroTitle}>
            Give your big idea the design it deserves
          </h1>
          <p className={styles.heroSubtitle}>
            Professionally designed blocks and templates built with React and
            Tauri. Build native desktop apps visually—no mockups, real code.
          </p>
          <div className={styles.heroCtas}>
            <Link
              href={isAuthenticated ? "/dashboard" : "/signup"}
              className={styles.primaryCta}
            >
              Get Started
              <ArrowRight size={18} strokeWidth={2} />
            </Link>
            <Link href="#features" className={styles.secondaryCta}>
              Learn More
            </Link>
          </div>

          <div className={styles.heroMockup}>
            <div className={styles.mockupFrame}>
              <div className={styles.mockupBar}>
                <span className={styles.mockupDot} />
                <span className={styles.mockupDot} />
                <span className={styles.mockupDot} />
              </div>
              <div className={styles.mockupContent}>
                <div className={styles.bento}>
                  <div className={styles.bentoLine} data-v />
                  <div className={styles.bentoLine} data-h />
                  <div className={styles.bentoCell} data-pos="tl">
                    <Layout className={styles.bentoIcon} size={18} />
                    <span className={styles.bentoLabel}>Frames</span>
                    <span className={styles.bentoValue}>IDE · App</span>
                  </div>
                  <div className={styles.bentoCell} data-pos="ml">
                    <Download className={styles.bentoIcon} size={18} />
                    <span className={styles.bentoLabel}>Export</span>
                    <span className={styles.bentoValue}>Tauri</span>
                  </div>
                  <div className={styles.bentoCell} data-pos="tr">
                    <Box className={styles.bentoIcon} size={18} />
                    <span className={styles.bentoLabel}>Components</span>
                    <span className={styles.bentoValue}>100+</span>
                  </div>
                  <div className={styles.bentoCell} data-pos="mr">
                    <Sparkles className={styles.bentoIcon} size={18} />
                    <span className={styles.bentoLabel}>Icons</span>
                    <span className={styles.bentoValue}>1.2k</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.stats}>
          <div className={styles.statsInner}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>100+</span>
              <span className={styles.statLabel}>Components</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>1.2k</span>
              <span className={styles.statLabel}>Icons</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>1-click</span>
              <span className={styles.statLabel}>Tauri Export</span>
            </div>
          </div>
        </section>

        <section className={styles.features} id="features">
          <h2 className={styles.sectionTitle}>Everything you need</h2>
          <p className={styles.sectionSubtitle}>
            Built for Render. Nothing you don&apos;t.
          </p>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Layout size={24} strokeWidth={1.5} />
              </div>
              <h3>Visual Canvas</h3>
              <p>
                Drag frames, components, and icons. Snap guides and alignment.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Box size={24} strokeWidth={1.5} />
              </div>
              <h3>Real Components</h3>
              <p>Buttons, inputs, panels—configurable and export-ready.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Download size={24} strokeWidth={1.5} />
              </div>
              <h3>One-Click Export</h3>
              <p>
                Generate a Tauri project. Run <code>npm run tauri dev</code>.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Monitor size={24} strokeWidth={1.5} />
              </div>
              <h3>Desktop-First</h3>
              <p>Optimized for native apps. IDE, App, and Desktop frame types.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Palette size={24} strokeWidth={1.5} />
              </div>
              <h3>Easy to Customize</h3>
              <p>Change colors, spacing, and layout. Full control over design.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Zap size={24} strokeWidth={1.5} />
              </div>
              <h3>Production Ready</h3>
              <p>Export real React + Tauri code. No lock-in, no black boxes.</p>
            </div>
          </div>
        </section>

        <section className={styles.faq} id="faq">
          <h2 className={styles.sectionTitle}>Frequently asked questions</h2>
          <div className={styles.faqList}>
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ""}`}
              >
                <button
                  className={styles.faqQuestion}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {faq.q}
                  <ChevronDown size={18} />
                </button>
                <div className={styles.faqAnswer}>
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.ctaSection}>
          <h2>Start building with Render</h2>
          <p>
            {isAuthenticated
              ? "Head to your dashboard to create projects."
              : "Create your account and design your first app in minutes."}
          </p>
          <Link
            href={isAuthenticated ? "/dashboard" : "/signup"}
            className={styles.primaryCta}
          >
            Get Started
            <ArrowRight size={18} strokeWidth={2} />
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>Render</div>
          <div className={styles.footerLinks}>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign up</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>
            © {new Date().getFullYear()} Render. Visual Tauri GUI Builder.
          </span>
          <span className={styles.footerLegal}>
            <Link href="/terms">Terms</Link>
            {" · "}
            <Link href="/privacy">Privacy</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
