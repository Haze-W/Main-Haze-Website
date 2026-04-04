import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#0d0d0f",
        color: "#f5f5f7",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "4rem", fontWeight: 700, margin: 0 }}>404</h1>
      <p style={{ fontSize: "1.125rem", color: "#8e8e93", margin: "12px 0 24px" }}>
        Page not found
      </p>
      <Link
        href="/dashboard"
        style={{
          padding: "10px 20px",
          background: "linear-gradient(180deg, #3a3a3e 0%, #2a2a2e 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          color: "#fff",
          textDecoration: "none",
          fontSize: "0.875rem",
          fontWeight: 600,
        }}
      >
        Back to Home
      </Link>
    </div>
  );
}
