import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, Bookmark, Calculator, ClipboardList, GitCompare, GraduationCap, Home, LayoutGrid, LineChart, LogOut, MessageSquare, Search, Settings, Shield, Sparkles, Target, User, Award, BookOpen, Menu, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/predictor", label: "College Predictor", icon: Target },
  { to: "/ai-counselor", label: "AI Counselor", icon: Sparkles },
  { to: "/colleges", label: "Colleges", icon: GraduationCap },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/compare", label: "Compare", icon: GitCompare },
  { to: "/cutoffs", label: "Cutoff Explorer", icon: LineChart },
  { to: "/shortlist", label: "My Shortlist", icon: Bookmark },
  { to: "/tracker", label: "Admission Tracker", icon: ClipboardList },
  { to: "/scholarships", label: "Scholarships", icon: Award },
  { to: "/fees", label: "Fee & ROI Calculator", icon: Calculator },
];
const MOBILE = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/predictor", label: "Predict", icon: Target },
  { to: "/colleges", label: "Colleges", icon: GraduationCap },
  { to: "/ai-counselor", label: "AI", icon: Sparkles },
  { to: "/profile", label: "Profile", icon: User },
];

export const Brand = ({ dark }) => (
  <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-[0_6px_16px_-6px_rgba(79,70,229,0.7)]"><GraduationCap size={20} /></span>
    <span className={`font-display text-lg font-extrabold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>CollegePredict <span className="text-indigo-600">AI</span></span>
  </Link>
);

function GlobalSearch() {
  const [q, setQ] = useState(""); const [res, setRes] = useState(null); const [open, setOpen] = useState(false);
  const nav = useNavigate(); const box = useRef(null);
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    const t = setTimeout(async () => { try { const { data } = await api.get("/search", { params: { q } }); setRes(data); setOpen(true); } catch { setRes(null); } }, 220);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => { const f = (e) => { if (!box.current?.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, []);
  const go = (path) => { setOpen(false); setQ(""); nav(path); };
  const groups = res ? [["Colleges", res.colleges, (x) => `/college/${x.slug}`, (x) => `${x.name} · ${x.city}`], ["Courses", res.courses, (x) => `/course/${x.slug}`, (x) => x.name], ["Exams", res.exams, (x) => `/exams/${x.slug}`, (x) => x.name], ["Scholarships", res.scholarships, () => `/scholarships`, (x) => x.name]].filter(([, a]) => a?.length) : [];
  return (
    <div ref={box} className="relative w-full max-w-xl">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => res && setOpen(true)} placeholder="Search colleges, courses, exams, scholarships…" className="input-soft !pl-10 !rounded-full !bg-slate-50" data-testid="global-search-input" />
      {open && (
        <div className="absolute z-50 mt-2 w-full card-soft p-2 max-h-96 overflow-auto" data-testid="global-search-results">
          {groups.length === 0 && <p className="px-3 py-4 text-sm text-slate-500">No results for “{q}”</p>}
          {groups.map(([title, arr, path, label]) => (
            <div key={title} className="mb-1">
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
              {arr.map((x) => <button key={x.slug || x.id} onClick={() => go(path(x))} className="w-full text-left rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700" data-testid="search-result-item">{label(x)}</button>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate(); const loc = useLocation();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [loc.pathname]);
  const items = user?.role === "admin" ? [...NAV, { to: "/admin", label: "Admin", icon: Shield }] : NAV;
  return (
    <div className="min-h-screen bg-[#FAFAFC] lg:flex">
      <aside className="hidden lg:flex lg:w-64 xl:w-72 shrink-0 flex-col border-r border-slate-200/80 bg-white sticky top-0 h-screen" data-testid="desktop-sidebar">
        <div className="px-6 py-5"><Brand /></div>
        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} data-testid={`nav-${to.slice(1)}`} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/profile" className="flex items-center gap-3 min-w-0 flex-1" data-testid="sidebar-profile-link">
                {user.picture ? <img src={user.picture} alt="" className="h-9 w-9 rounded-full" /> : <span className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">{user.name?.[0]}</span>}
                <div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p><p className="text-xs text-slate-500 truncate">{user.plan === "premium" ? "Premium" : "Free plan"}</p></div>
              </Link>
              <button onClick={async () => { await logout(); nav("/"); }} className="text-slate-400 hover:text-slate-700" title="Log out" data-testid="logout-btn"><LogOut size={18} /></button>
            </div>
          ) : <Link to="/login" className="btn-primary w-full" data-testid="sidebar-login-btn">Log in / Sign up</Link>}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/80">
          <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-16">
            <div className="lg:hidden"><Brand /></div>
            <div className="hidden sm:block flex-1"><GlobalSearch /></div>
            <div className="ml-auto flex items-center gap-2">
              {user && <Link to="/notifications" className="btn-ghost !p-2 relative" data-testid="notifications-link"><Bell size={18} /></Link>}
              {!user && <Link to="/login" className="btn-primary !py-2 hidden sm:inline-flex" data-testid="header-login-btn">Log in</Link>}
              <button className="lg:hidden btn-ghost !p-2" onClick={() => setMenu(!menu)} data-testid="mobile-menu-btn">{menu ? <X size={20} /> : <Menu size={20} />}</button>
            </div>
          </div>
          <div className="sm:hidden px-4 pb-3"><GlobalSearch /></div>
          {menu && (
            <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-3 grid grid-cols-2 gap-1" data-testid="mobile-menu">
              {[...items, { to: "/profile", label: "Profile", icon: User }, { to: "/settings", label: "Settings", icon: Settings }].map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Icon size={16} />{label}</NavLink>)}
              {user ? <button onClick={async () => { await logout(); nav("/"); }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700"><LogOut size={16} />Log out</button> : <Link to="/login" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-700 font-semibold"><User size={16} />Log in</Link>}
            </div>
          )}
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 grid grid-cols-5" data-testid="mobile-bottom-nav">
        {MOBILE.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} data-testid={`bottom-nav-${label.toLowerCase()}`} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? "text-indigo-600" : "text-slate-500"}`}>
            <Icon size={20} />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
