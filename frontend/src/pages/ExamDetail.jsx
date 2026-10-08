import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Target } from "lucide-react";
import { api, fmtNum, metricLabel } from "@/lib/api";
import { CollegeCard } from "@/components/CollegeCard";
import { ErrorState } from "@/components/ui-bits";

export default function ExamDetail() {
  const { slug } = useParams(); const nav = useNavigate();
  const [e, setE] = useState(null); const [err, setErr] = useState(null);
  useEffect(() => { setE(null); api.get(`/exams/${slug}`).then((r) => { setE(r.data); document.title = `${r.data.name} 2026 — Colleges, Cutoffs & Predictor | CollegePredict AI`; }).catch((x) => setErr(x.response?.status === 404 ? "Exam not found" : x.message)); }, [slug]);
  if (err) return <ErrorState message={err} />;
  if (!e) return <div className="skeleton h-64" />;
  return (
    <div>
      <nav className="text-xs text-slate-500 flex items-center gap-1 mb-4" data-testid="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={12} /><span>Exams</span><ChevronRight size={12} /><span className="text-slate-800 font-medium">{e.short_name}</span></nav>
      <div className="card-soft p-6 sm:p-8 fade-up">
        <span className="pill bg-indigo-50 text-indigo-700">{e.conducting_body} · {e.streams.join(", ")}</span>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3" data-testid="exam-name">{e.name}</h1>
        <p className="mt-2 text-slate-600 max-w-2xl">{e.description}</p>
        <div className="mt-5 grid sm:grid-cols-3 gap-3">{[["Candidates (approx.)", fmtNum(e.total_candidates)], ["Score input", metricLabel(e)], ["Colleges in our database", e.colleges.length]].map(([l, v]) => <div key={l} className="rounded-xl bg-slate-50 p-4"><p className="text-[11px] uppercase tracking-wider text-slate-500">{l}</p><p className="font-display text-lg font-extrabold text-slate-900">{v}</p></div>)}</div>
        <div className="mt-5 flex flex-wrap gap-3"><button onClick={() => nav("/predictor")} className="btn-primary" data-testid="exam-predict-btn"><Target size={16} />Predict colleges with {e.short_name}</button><Link to={`/cutoffs?exam=${e.id}`} className="btn-outline">Explore cutoffs</Link></div>
      </div>
      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="card-soft p-6 fade-up delay-1"><h2 className="font-display text-lg font-bold">Important dates (2026)</h2><dl className="mt-3 space-y-2 text-sm">{Object.entries(e.important_dates).map(([k, v]) => <div key={k} className="flex justify-between border-b border-slate-100 py-2"><dt className="text-slate-600">{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl><p className="mt-3 text-xs text-slate-400">Tentative — verify on the official website.</p></div>
        <div className="card-soft p-6 fade-up delay-2 lg:col-span-2"><h2 className="font-display text-lg font-bold">Courses you can pursue</h2><div className="mt-3 flex flex-wrap gap-2">{e.courses.map((c) => <Link key={c.id} to={`/course/${c.slug}`} className="pill bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">{c.name}</Link>)}</div></div>
      </div>
      <section className="mt-10"><h2 className="font-display text-xl font-extrabold text-slate-900 mb-4">Colleges accepting {e.short_name}</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{e.colleges.map((c, i) => <CollegeCard key={c.id} c={c} delay={i * 30} />)}</div></section>
    </div>
  );
}
