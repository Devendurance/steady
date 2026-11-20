import { useEffect, useState } from "react";
import type { Payroll } from "./lib/data";
import { loadPayroll } from "./lib/data";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { PublicView } from "./pages/PublicView";
import { Claim } from "./pages/Claim";
import { Mainnet } from "./pages/Mainnet";
import { Footer, Nav } from "./components/ui";

export type Route =
  | { name: "landing" }
  | { name: "dashboard" }
  | { name: "public" }
  | { name: "claim"; id: string }
  | { name: "mainnet" };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [head, ...rest] = hash.split("/");
  switch (head) {
    case "demo":
      return { name: "dashboard" };
    case "public":
      return { name: "public" };
    case "claim":
      return { name: "claim", id: rest.join("/") || "" };
    case "mainnet":
      return { name: "mainnet" };
    default:
      return { name: "landing" };
  }
}

function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export default function App() {
  const route = useHashRoute();
  const [payroll, setPayroll] = useState<Payroll>(() => loadPayroll());

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [route.name, (route as { id?: string }).id]);

  return (
    <div className="app">
      <Nav route={route} />
      {route.name === "landing" && <Landing payroll={payroll} />}
      {route.name === "dashboard" && <Dashboard payroll={payroll} onChange={setPayroll} />}
      {route.name === "public" && <PublicView payroll={payroll} />}
      {route.name === "claim" && <Claim payroll={payroll} onChange={setPayroll} id={route.id} />}
      {route.name === "mainnet" && <Mainnet />}
      <Footer />
    </div>
  );
}
