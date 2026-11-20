import { useEffect, useState } from "react";
import type { Payroll } from "./data";
import { rosterHash } from "./roster";

export function useRosterHash(p: Payroll): string {
  const [hash, setHash] = useState("");
  useEffect(() => {
    let alive = true;
    rosterHash(p)
      .then((h) => {
        if (alive) setHash(h);
      })
      .catch(() => {
        if (alive) setHash("");
      });
    return () => {
      alive = false;
    };
  }, [p]);
  return hash;
}
