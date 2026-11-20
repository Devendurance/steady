import type { Payroll } from "./data";

export function canonicalRoster(p: Payroll): string {
  return JSON.stringify({
    version: 1,
    payroll: p.id,
    employees: p.employees.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      salary_xtm: e.salaryMicro / 1_000_000,
      address: e.address,
    })),
  });
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function rosterHash(p: Payroll): Promise<string> {
  return sha256Hex(canonicalRoster(p));
}
