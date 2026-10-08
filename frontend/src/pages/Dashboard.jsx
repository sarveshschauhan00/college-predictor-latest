import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, CheckCircle2, Circle, MessageSquare, Sparkles, Target } from "lucide-react";
import { api, fmtDate, daysLeft } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PredictionCard } from "@/components/CollegeCard";
import { ErrorState } from "@/components/ui-bits";

const QUESTIONS = ["Which college should I choose?", "Can I get IIT with my rank?", "Should I choose CSE or ECE?", "Which colleges have the best placements?", "What should be my backup colleges?"];
const greet = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

export default function Dashboard() {
  const { user } = useAuth(); const nav = useNavigate();
  const [d, setD] = useState(null); const [err, setErr] = useState(null);
  const load = () => api.get("/dashboard").then((r) => setD(r.data)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!d) return <div className="space-y-4"><div className="skeleton h-24" /><div className="grid gap-4 lg:grid-cols-3"><div className="skeleton h-64" /><div className="skeleton h-64" /><div className="skeleton h-64" /></div></div>;
  const pc = d.prediction_counts;
  return (
    <div className="space-y-8">
      <div className="fade-up flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div><h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900" data-testid="dashboard-greeting">{greet()}, {user.name.split(" ")[0]} 👋</h1><p className="mt-1.5 text-slate-600">Here's your college admission journey.</p></div>
        {!user.onboarded && <Link to="/onboarding" className="btn-primary" data-testid="dashboard-complete-profile-btn">Complete your profile<ArrowRight size={16} /></Link>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-soft p-6 fade-up delay-1" data-testid="readiness-card">
          <div className="flex items-start justify-between"><div><p className="eyebrow">Admission readiness</p><p className="font-display text-4xl font-extrabold text-slate-900 mt-2" data-testid="readiness-percent">{d.readiness}% <span className="text-base font-semibold text-slate-500">Ready</span></p></div><Target className="text-indigo-500" /></div>
          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-indigo-600 transition-[width] duration-700" style={{ width: `${d.readiness}%` }} /></div>
          <ul className="mt-5 space-y-2.5">{d.checklist.map((c) => <li key={c.label} className="flex items-center gap-2.5 text-sm" data-testid="readiness-item">{c.done ? <CheckCircle2 size={17} className="text-emerald-500" /> : <Circle size={17} className="text-slate-300" />}<span className={c.done ? "text-slate-700" : "text-slate-500"}>{c.label}</span></li>)}</ul>
        </div>
        <div className="card-soft p-6 fade-up delay-2" data-testid="predictions-card">
          <p className="eyebrow">My predictions</p>
          {pc.total === undefined && !d.recommended.length ? <div className="mt-4"><p className="text-sm text-slate-600">Add your exam score to see Dream, Target and Safe colleges.</p><Link to="/predictor" className="btn-primary mt-4" data-testid="dashboard-predict-btn">Run predictor</Link></div> : <>
            <p className="font-display text-4xl font-extrabold text-slate-900 mt-2">{pc.total ?? d.saved_count} <span className="text-base font-semibold text-slate-500">colleges</span></p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">{[["Dream", pc.dream, "text-rose-600 bg-rose-50"], ["Target", pc.target, "text-amber-600 bg-amber-50"], ["Safe", pc.safe, "text-emerald-600 bg-emerald-50"]].map(([l, v, c]) => <div key={l} className={`rounded-xl p-3 ${c.split(" ")[1]}`}><p className={`font-display text-2xl font-extrabold ${c.split(" ")[0]}`}>{v}</p><p className="text-xs text-slate-600">{l}</p></div>)}</div>
            <Link to="/predictions" className="btn-outline w-full mt-5" data-testid="dashboard-view-predictions-btn">View all predictions</Link></>}
        </div>
        <div className="card-soft p-6 fade-up delay-3" data-testid="deadlines-card">
          <div className="flex items-center justify-between"><p className="eyebrow">Upcoming deadlines</p><Calendar size={18} className="text-indigo-500" /></div>
          <ul className="mt-4 space-y-3">{[...d.applications.filter((a) => a.deadline).map((a) => ({ title: a.title, date: a.deadline, mine: true })), ...d.deadlines.map((x) => ({ title: x.title, date: x.date }))].slice(0, 5).map((x, i) => { const dl = daysLeft(x.date); return <li key={i} className="flex items-center gap-3 text-sm" data-testid="deadline-item"><span className={`pill ${dl < 0 ? "bg-slate-100 text-slate-500" : dl <= 7 ? "bg-red-50 text-red-700" : "bg-indigo-50 text-indigo-700"}`}>{dl < 0 ? "Past" : `${dl}d`}</span><div className="min-w-0"><p className="font-medium text-slate-800 truncate">{x.title}</p><p className="text-xs text-slate-500">{fmtDate(x.date)}{x.mine && " · tracked"}</p></div></li>; })}</ul>
          <Link to="/tracker" className="btn-ghost mt-4 !text-sm">Open tracker <ArrowRight size={14} /></Link>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 fade-up delay-4 relative overflow-hidden" data-testid="ai-counselor-card">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-600/40 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1"><p className="eyebrow !text-indigo-300">AI Counselor</p><h2 className="font-display text-2xl font-extrabold mt-1">Ask anything about your college journey.</h2><p className="text-slate-300 text-sm mt-1">Personalized with your {d.profile?.exam_id?.toUpperCase() || "profile"} score, category and preferences.</p>
            <div className="mt-4 flex flex-wrap gap-2">{QUESTIONS.map((q) => <button key={q} onClick={() => nav("/ai-counselor", { state: { prefill: q } })} className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium hover:bg-white/15 transition-colors" data-testid="ai-example-question">{q}</button>)}</div></div>
          <Link to="/ai-counselor" className="btn-primary !bg-white !text-slate-900 hover:!bg-indigo-50 shrink-0" data-testid="dashboard-ask-ai-btn"><MessageSquare size={16} />Open AI Counselor</Link>
        </div>
      </div>

      <section>
        <div className="flex items-end justify-between mb-4"><div><p className="eyebrow">Recommended for you</p><h2 className="font-display text-xl font-extrabold text-slate-900 mt-1">Colleges that fit your profile</h2></div><Link to="/predictions" className="btn-ghost !text-sm">See all <ArrowRight size={14} /></Link></div>
        {d.recommended.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{d.recommended.map((r, i) => <PredictionCard key={r.college_id + r.course_id} r={r} delay={i * 60} />)}</div> : <div className="card-soft p-8 text-center"><Sparkles className="mx-auto text-indigo-500" /><p className="mt-3 font-semibold text-slate-800">Run the predictor to get recommendations</p><Link to="/predictor" className="btn-primary mt-4">Predict My Colleges</Link></div>}
      </section>
    </div>
  );
}
