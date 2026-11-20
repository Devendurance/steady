import { useState } from "react";
import type { ReactNode } from "react";
import type { Route } from "../App";
import { MAINNET } from "../lib/mainnet";
import { shortHex } from "../lib/format";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <a className={`logo ${small ? "logo-small" : ""}`} href="#/" aria-label="Steady home">
      <span className="logo-mark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="logo-word">Steady</span>
    </a>
  );
}

export function Nav({ route }: { route: Route }) {
  const active = (name: Route["name"]) => (route.name === name ? "nav-link active" : "nav-link");
  return (
    <header className="nav">
      <div className="shell nav-inner">
        <Logo />
        <nav className="nav-links" aria-label="Primary">
          <a className={active("dashboard")} href="#/demo">
            Demo
          </a>
          <a className={active("public")} href="#/public">
            Public runway
          </a>
          <a className={active("mainnet")} href="#/mainnet">
            Mainnet proof
          </a>
          <a className="nav-link nav-github" href="https://github.com/Devendurance/steady" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
        <a className="btn btn-small btn-primary nav-cta" href="#/demo">
          Open demo
        </a>
      </div>
    </header>
  );
}

export function Footer() {
  const published = Boolean(MAINNET.contract);
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo small />
            <p>Private payroll with a public runway. Built on Tari Ootle.</p>
            <p className="mono faint">
              {published ? shortHex(MAINNET.contract, 14, 8) : "Mainnet publish pending"}
            </p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="#/demo">Employer demo</a>
            <a href="#/public">Public runway</a>
            <a href="#/mainnet">Mainnet proof</a>
          </div>
          <div className="footer-col">
            <h4>Build</h4>
            <a href="https://github.com/Devendurance/steady" target="_blank" rel="noreferrer">
              Source (MIT)
            </a>
            <a href="https://github.com/Devendurance/steady/blob/main/README.md" target="_blank" rel="noreferrer">
              README
            </a>
            <a href="https://github.com/Devendurance/steady/blob/main/JUDGES.md" target="_blank" rel="noreferrer">
              Guide for judges
            </a>
          </div>
          <div className="footer-col">
            <h4>Contest</h4>
            <a href="https://community.tari.com/t/november-build-contest-thread-mvp/520" target="_blank" rel="noreferrer">
              November MVP
            </a>
            <a href="https://community.tari.com/t/november-bonus-contest-first-to-launch/521" target="_blank" rel="noreferrer">
              First to Launch
            </a>
            <a href="https://ootle.tari.com" target="_blank" rel="noreferrer">
              Tari Ootle
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>MIT licensed · Built for the Tari November Build Contest</span>
          <span className="mono">No salaries on chain. Ever.</span>
        </div>
      </div>
    </footer>
  );
}

export function RunwayStrip({
  months,
  released,
  funded,
  compact = false,
}: {
  months: number;
  released: number;
  funded: number;
  compact?: boolean;
}) {
  const segments = Array.from({ length: months }, (_, i) => {
    if (i < released) return "released";
    if (i < released + funded) return "locked";
    return "empty";
  });
  return (
    <div className={`runway ${compact ? "runway-compact" : ""}`} style={{ ["--n" as string]: months }}>
      {segments.map((state, i) => (
        <span
          key={i}
          className={`seg ${state}`}
          style={{ ["--i" as string]: i }}
          title={
            state === "released"
              ? `Month ${i + 1}: released`
              : state === "locked"
                ? `Month ${i + 1}: funded, locked`
                : `Month ${i + 1}: not funded`
          }
        />
      ))}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${accent ? "accent" : ""}`}>{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Copy({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  return (
    <button className="copy" onClick={copy} type="button" title={`${label}: ${text}`}>
      {copied ? "Copied" : label}
    </button>
  );
}

export function Chip({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "lime" | "warn" }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

export function Arrow({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    </svg>
  );
}

export function Lock({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3.2" y="7" width="9.6" height="6.2" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.6 7V5.4a2.4 2.4 0 014.8 0V7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function Eye({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1.6 8s2.3-4 6.4-4 6.4 4 6.4 4-2.3 4-6.4 4S1.6 8 1.6 8z" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="1.7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function Check({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.4l3.1 3.1L13 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="section-label">{children}</p>;
}

export function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const text = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return <span className="initials">{text.toUpperCase()}</span>;
}
