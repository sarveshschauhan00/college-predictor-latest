import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, MessageSquare, Sparkles, Target } from "lucide-react";
import { api } from "@/lib/api";
import { CollegeCard } from "@/components/CollegeCard";
import { ErrorState } from "@/components/ui-bits";

export default function CourseDetail() {
  const { slug } = useParams(); const nav = useNavigate();
  const [c, setC] = useState(null); const [err, setErr] = useState(null);
  useEffect(() => { setC(null); api.get(`/courses/${slug}`).then((r) => { setC(r.data); document.title = `${r.data.name} — Careers, Salary, Top Colleges | CollegePredict AI`; }).catch((e) => setErr(e.response?.status === 404 ? "Course not found" : e.message)); window.scrollTo(0, 0); }, [slug]);
  if (err) return <ErrorState message={err} />;
  if (!c) return <div className="space-y-4"><div className="skeleton h-40" /><div className="skeleton h-72" /></div>;
  return (
    <div>
      <nav className="text-xs text-slate-500 flex items-center gap-1 mb-4" data-testid="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={12} /><Link to="/courses">Courses</Link><ChevronRight size={12} /><span className="text-slate-800 font-medium">{c.name}</span></nav>
      <div className="card-soft p-6 sm:p-8 fade-up">
        <span className="pill bg-indigo-50 text-indigo-700">{c.stream} · {c.degree} · {c.duration_years} years</span>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3" data-testid="course-name">{c.name}</h1>
        <div className="mt-5 grid sm:grid-cols-3 gap-3">{[["Average salary", `₹${c.avg_salary_lpa} LPA`], ["Difficulty", c.difficulty], ["Entrance exams", c.exam_details.map((e) => e.short_name).join(", ")]].map(([l, v]) => <div key={l} className="rounded-xl bg-slate-50 p-4"><p className="text-[11px] uppercase tracking-wider text-slate-500">{l}</p><p className="font-display text-lg font-extrabold text-slate-900">{v}</p></div>)}</div>
        <div className="mt-5 flex flex-wrap gap-3"><button onClick={() => nav("/predictor")} className="btn-primary" data-testid="course-check-chances-btn"><Target size={16} />Check My Chances</button><button onClick={() => nav("/ai-counselor", { state: { prefill: `Is ${c.name} a good choice for me? Compare it with alternatives and tell me career prospects.` } })} className="btn-outline" data-testid="course-ask-ai-btn"><MessageSquare size={16} />Ask AI about this course</button></div>
      </div>
      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {[["What you study", c.what_you_study], ["Future scope", c.future_scope]].map(([t, d]) => <div key={t} className="card-soft p-6 fade-up"><h2 className="font-display text-lg font-bold">{t}</h2><p className="mt-2 text-slate-600 leading-relaxed">{d}</p></div>)}
          <div className="card-soft p-6 fade-up grid sm:grid-cols-2 gap-6"><div><h2 className="font-display text-lg font-bold">Career options</h2><ul className="mt-2 space-y-1.5">{c.careers.map((x) => <li key={x} className="text-sm text-slate-700 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />{x}</li>)}</ul></div><div><h2 className="font-display text-lg font-bold">Skills required</h2><div className="mt-2 flex flex-wrap gap-2">{c.skills.map((s) => <span key={s} className="pill bg-slate-100 text-slate-700">{s}</span>)}</div></div></div>
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl bg-slate-900 text-white p-6 fade-up delay-2"><p className="eyebrow !text-indigo-300 flex items-center gap-1"><Sparkles size={13} />AI recommendation</p><p className="mt-2 text-sm leading-relaxed">{c.ai_recommendation}</p></div>
          <div className="card-soft p-6 fade-up delay-3"><h2 className="font-display text-lg font-bold">Entrance exams</h2><ul className="mt-2 space-y-2">{c.exam_details.map((e) => <li key={e.id}><Link to={`/exams/${e.slug}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"><span className="font-semibold">{e.name}</span><ChevronRight size={14} /></Link></li>)}</ul></div>
        </div>
      </div>
      <section className="mt-10"><h2 className="font-display text-xl font-extrabold text-slate-900 mb-4">Top colleges for {c.name}</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{c.top_colleges.slice(0, 8).map((s, i) => <CollegeCard key={s.id} c={s} delay={i * 40} />)}</div></section>
    </div>
  );
}
