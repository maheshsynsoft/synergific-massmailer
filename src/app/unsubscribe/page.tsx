"use client";

import { useEffect, useState } from "react";

type State = "working" | "done" | "error";

export default function UnsubscribePage() {
  const [state, setState] = useState<State>("working");
  const [email, setEmail] = useState("");

  useEffect(() => {
    // Read params from the URL on the client. We POST (never unsubscribe on a
    // plain GET) so link-scanners that pre-fetch the page can't unsubscribe people.
    const sp = new URLSearchParams(window.location.search);
    const e = sp.get("e") || "";
    const t = sp.get("t") || "";
    setEmail(e);
    if (!e || !t) {
      setState("error");
      return;
    }
    fetch(`/api/unsubscribe?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}`, {
      method: "POST",
    })
      .then((r) => setState(r.ok ? "done" : "error"))
      .catch(() => setState("error"));
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 460,
          width: "100%",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 40,
          textAlign: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {state === "working" && (
          <p style={{ color: "#6b7280", fontSize: 15 }}>Processing your request…</p>
        )}

        {state === "done" && (
          <>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
              You&apos;ve been unsubscribed
            </h1>
            <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {email ? <strong>{email}</strong> : "This address"} will no longer receive
              marketing emails from Synergific Software Pvt. Ltd. We&apos;re sorry to see you go.
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
              This link is invalid or expired
            </h1>
            <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              We couldn&apos;t process this unsubscribe request. Please email{" "}
              <a href="mailto:cloud@synergificsoftware.com" style={{ color: "#2563eb" }}>
                cloud@synergificsoftware.com
              </a>{" "}
              and we&apos;ll remove you right away.
            </p>
          </>
        )}

        <p style={{ color: "#9ca3af", fontSize: 11, marginTop: 28 }}>
          Synergific Software Pvt. Ltd. · Bengaluru, India
        </p>
      </div>
    </div>
  );
}
