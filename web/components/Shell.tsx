"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { useSetting } from "@/lib/store";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/longs", label: "Longs", icon: "longs" },
  { href: "/liked", label: "Liked", icon: "like" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/later", label: "Watch later", icon: "later" },
  { href: "/categories", label: "Categories", icon: "categories" },
  { href: "/playlists", label: "Playlists", icon: "playlists" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

const SHORTCUTS: [string, string][] = [
  ["/", "Search"],
  ["j / k", "Next / previous video"],
  ["Enter", "Open selected video"],
  ["l", "Like selected or current video"],
  ["w", "Watch later"],
  ["g h", "Go home"],
  ["t", "Toggle theme"],
  ["?", "Show shortcuts"],
  ["Esc", "Close"],
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (o: boolean) => setOpenOn(o ? pathname : null);
  const [collapsed, setCollapsed] = useSetting("collapsed", false);
  const [theme, setTheme] = useSetting<"dark" | "light">("theme", "dark");
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const lastKey = useRef("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (pathname === "/search" && searchRef.current) {
      searchRef.current.value = new URLSearchParams(window.location.search).get("q") ?? "";
    }
  }, [pathname]);

  const toastTimer = useRef(0);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) {
        if (e.key === "Escape") (el as HTMLElement).blur?.();
        return;
      }
      const prev = lastKey.current;
      lastKey.current = e.key;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "?") {
        setHelp((h) => !h);
      } else if (e.key === "Escape") {
        setHelp(false);
        setOpenOn(null);
      } else if (e.key === "t") {
        setTheme(theme === "dark" ? "light" : "dark");
      } else if (prev === "g" && e.key === "h") {
        router.push("/");
      } else {
        window.dispatchEvent(new CustomEvent("dt:key", { detail: e.key }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, theme, setTheme]);

  const onMenu = () => {
    if (window.matchMedia("(max-width: 1100px)").matches) setOpen(!open);
    else setCollapsed(!collapsed);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchRef.current?.value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
    searchRef.current?.blur();
  };

  return (
    <ToastCtx.Provider value={showToast}>
      <div className={`app${open ? " open" : ""}${collapsed ? " collapsed" : ""}`}>
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn" onClick={onMenu} aria-label="Menu">
              <Icon name="menu" />
            </button>
            <Link href="/" className="logo" aria-label="DesignerTube home">
              Designer<span>Tube</span>
            </Link>
          </div>
          <form className="search" role="search" onSubmit={onSearch}>
            <input ref={searchRef} name="q" placeholder="Search" aria-label="Search" autoComplete="off" />
            <button type="submit" aria-label="Search">
              <Icon name="search" />
            </button>
          </form>
          <div className="topbar-right">
            <Link href="/about" className="icon-btn hide-sm" aria-label="About">
              <Icon name="help" />
            </Link>
            <button
              className="icon-btn"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Icon name={theme === "dark" ? "moon" : "sun"} />
            </button>
          </div>
        </header>

        <nav className="sidebar" aria-label="Main">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`nav-item${active ? " active" : ""}`}>
                <Icon name={n.icon} />
                <span>{n.label}</span>
              </Link>
            );
          })}
          <hr />
          <div className="sidebar-foot">
            The YouTube videos Hacker News keeps telling designers to watch.
            <br />
            <Link href="/about">About</Link> · <a href="/data/designertube-data.zip">Data</a>
          </div>
        </nav>
        <div className="scrim" onClick={() => setOpen(false)} />

        <main>{children}</main>

        {help && (
          <div className="modal-scrim" onClick={() => setHelp(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Keyboard shortcuts">
              <h3>
                Keyboard shortcuts
                <button className="icon-btn" onClick={() => setHelp(false)} aria-label="Close">
                  <Icon name="close" />
                </button>
              </h3>
              <div className="keys">
                {SHORTCUTS.map(([k, d]) => (
                  <div key={k} style={{ display: "contents" }}>
                    <span>
                      {k.split(" ").map((p, i) => (p === "/" && k !== "/" ? " / " : <kbd key={i}>{p}</kbd>))}
                    </span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </ToastCtx.Provider>
  );
}
