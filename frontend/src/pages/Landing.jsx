import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Award, BarChart3, Bookmark, BookOpen, Calculator, ClipboardList, GitCompare, GraduationCap, LineChart, MessageSquare, Search, Sparkles, Target, TrendingUp, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { Brand } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";

const FEATURES = [
  [Target, "College Predictor", "Dream, Target & Safe colleges from your rank or percentile."], [Sparkles, "AI Counselor", "Personalized answers grounded in real cutoff data."], [Search, "College Search", "Filter 40+ colleges by exam, fees, state and placements."],
  [GitCompare, "College Comparison", "Side-by-side on fees, packages, cutoffs and more."], [LineChart, "Cutoff Explorer", "3-year cutoff trends for every course and category."], [BookOpen, "Course Explorer", "What you study, careers, salaries and top colleges."],
  [Award, "Scholarship Finder", "Match scholarships to your category, income & state."], [Calculator, "Fee & ROI Calculator", "Total degree cost vs expected salary."], [TrendingUp, "Placement Insights", "Average, highest packages and recruiters."],
  [ClipboardList, "Admission Tracker", "Deadlines, counselling rounds and documents."], [Bookmark, "Personalized Shortlist", "Drag colleges between Dream, Target and Safe."], [BarChart3, "Admission Readiness", "A living checklist from profile to allotment."],
];
const STEPS = ["Enter your exam & score", "Tell us your preferences", "Get personalized college predictions", "Compare colleges", "Make your admission plan"];
const DEMO = [["IIT Delhi", "B.Tech CSE", 18, "dream"], ["NIT Trichy", "B.Tech CSE", 52, "target"], ["IIIT Delhi", "B.Tech AI & ML", 64, "target"], ["DTU", "B.Tech IT", 86, "safe"]];
const C = { dream: "bg-rose-50 text-rose-700", target: "bg-amber-50 text-amber-700", safe: "bg-emerald-50 text-emerald-700" };

export default function Landing() {
  const [stats, setStats] = useState(null); const [q, setQ] = useState(""); const nav = useNavigate(); const { user } = useAuth();
  useEffect(() => { api.get("/stats").then((r) => setStats(r.data)).catch(() => {}); }, []);
  const go = () => nav(user ? "/predictor" : "/predictor", { state: { query: q } });
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 h-16 flex items-center justify-between">
          <Brand />
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <Link to="/predictor" className="hover:text-slate-900" data-testid="nav-link-predictor">Predictor</Link><Link to="/colleges" className="hover:text-slate-900" data-testid="nav-link-colleges">Colleges</Link><Link to="/courses" className="hover:text-slate-900">Courses</Link><Link to="/cutoffs" className="hover:text-slate-900">Cutoffs</Link><Link to="/scholarships" className="hover:text-slate-900">Scholarships</Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? <Link to="/dashboard" className="btn-primary !py-2" data-testid="landing-dashboard-btn">Dashboard</Link> : <><Link to="/login" className="btn-ghost hidden sm:inline-flex !text-sm" data-testid="landing-login-btn">Log in</Link><Link to="/login?mode=signup" className="btn-primary !py-2" data-testid="landing-signup-btn">Get started</Link></>}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden grid-dots">
        <div className="absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 fade-up">
            <span className="pill bg-indigo-50 text-indigo-700 border border-indigo-100"><Sparkles size={13} />AI-powered admissions for India</span>
            <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.05]">Which colleges can <span className="text-indigo-600">you</span> get into?</h1>
            <p className="mt-5 text-base md:text-lg text-slate-600 max-w-xl">Predict your admission chances, discover the best colleges for your score, compare courses, and get personalized guidance from AI.</p>
            <div className="mt-7 card-soft p-2 flex flex-col sm:flex-row gap-2 max-w-xl">
              <div className="relative flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="Enter your exam, rank or percentile…" className="input-soft !pl-10 !border-0 !bg-transparent focus:!ring-0" data-testid="hero-search-input" /></div>
              <button onClick={go} className="btn-primary" data-testid="hero-predict-btn">Predict My Colleges<ArrowRight size={16} /></button>
            </div>
            <p className="mt-2 text-xs text-slate-400 font-mono">e.g. JEE Main 2026 • 95 percentile</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/ai-counselor" className="btn-outline" data-testid="hero-counselor-btn"><MessageSquare size={16} />Talk to AI Counselor</Link>
              <Link to="/colleges" className="btn-ghost !text-sm">Explore colleges <ArrowRight size={14} /></Link>
            </div>
          </div>
          <div className="lg:col-span-6 relative fade-up delay-2">
            <div className="card-soft p-5 sm:p-6 float-y" data-testid="hero-demo-dashboard">
              <div className="flex items-center justify-between"><div><p className="eyebrow">Sample prediction</p><p className="font-display font-bold text-slate-900 mt-1">JEE Main · 96.2 percentile · General</p></div><span className="pill bg-emerald-50 text-emerald-700">40 matches</span></div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">{[["Dream", 6, "text-rose-600"], ["Target", 6, "text-amber-600"], ["Safe", 28, "text-emerald-600"]].map(([l, v, c]) => <div key={l} className="rounded-xl bg-slate-50 py-3"><p className={`font-display text-2xl font-extrabold ${c}`}>{v}</p><p className="text-xs text-slate-500">{l}</p></div>)}</div>
              <div className="mt-4 space-y-2">{DEMO.map(([n, c, p, b]) => <div key={n} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5"><span className="h-9 w-9 rounded-lg bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">{n.split(" ").map((w) => w[0]).join("").slice(0, 3)}</span><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{n}</p><p className="text-xs text-slate-500">{c}</p></div><span className={`pill ${C[b]}`}>{p}%</span></div>)}</div>
              <p className="mt-3 text-[11px] text-slate-400">Demo data · estimates only, not a guarantee of admission</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-6" data-testid="trust-stats">
          {[["Colleges analyzed", stats ? `${stats.colleges}+` : "40+"], ["Courses covered", stats ? `${stats.courses}+` : "30+"], ["Students helped", stats ? `${(stats.students_helped / 1000).toFixed(1)}K+` : "12K+"], ["Exams supported", stats ? `${stats.exams}` : "18"]].map(([l, v]) => <div key={l}><p className="font-display text-3xl sm:text-4xl font-extrabold">{v}</p><p className="text-sm text-slate-400 mt-1">{l}</p></div>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-20">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-slate-900">From score to admission plan in five steps</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-5">{STEPS.map((s, i) => <li key={s} className={`card-soft p-5 fade-up delay-${i + 1}`} data-testid={`how-step-${i + 1}`}><span className="font-mono text-xs text-indigo-600">0{i + 1}</span><p className="mt-2 font-display font-bold text-slate-900">{s}</p></li>)}</ol>
      </section>

      <section className="bg-[#FAFAFC] border-y border-slate-100">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-20">
          <p className="eyebrow">Everything you need</p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-slate-900 max-w-xl">Google Maps for admissions, ChatGPT for counselling.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{FEATURES.map(([Icon, t, d], i) => <div key={t} className="card-soft card-hover p-5" data-testid={`feature-${t.toLowerCase().replace(/[^a-z]+/g, "-")}`}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon size={19} /></span><p className="mt-4 font-display font-bold text-slate-900">{t}</p><p className="mt-1 text-sm text-slate-500">{d}</p></div>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-20">
        <div className="rounded-3xl bg-indigo-600 text-white p-8 sm:p-12 flex flex-col lg:flex-row lg:items-center gap-8 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
          <div className="flex-1"><h2 className="font-display text-2xl sm:text-3xl font-extrabold">Start predicting colleges in under 2 minutes.</h2><p className="mt-2 text-indigo-100 max-w-lg">Enter your profile once and we personalize predictions, shortlists, scholarships and deadlines everywhere.</p>
            <ul className="mt-4 grid sm:grid-cols-2 gap-2 text-sm text-indigo-50">{["Free basic predictions", "18 entrance exams supported", "Guest exploration — no login needed", "Delete your data anytime"].map((t) => <li key={t} className="flex items-center gap-2"><CheckCircle2 size={15} />{t}</li>)}</ul></div>
          <div className="flex flex-col sm:flex-row gap-3"><Link to="/predictor" className="btn-primary !bg-white !text-indigo-700 hover:!bg-indigo-50" data-testid="cta-predict-btn">Predict My Colleges</Link><Link to="/ai-counselor" className="btn-outline !border-indigo-300 !bg-transparent !text-white hover:!bg-indigo-500" data-testid="cta-counselor-btn">Talk to AI Counselor</Link></div>
        </div>
      </section>

      <footer className="border-t border-slate-100"><div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500"><Brand /><p>Your AI-powered path to the right college. Predictions are estimates, not guarantees.</p><div className="flex gap-4"><Link to="/exams/jee-main">JEE Main</Link><Link to="/exams/neet">NEET</Link><Link to="/exams/cuet">CUET</Link><Link to="/exams/clat">CLAT</Link></div></div></footer>
    </div>
  );
}
