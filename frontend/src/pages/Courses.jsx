import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, SkeletonCards, EmptyState } from "@/components/ui-bits";

const STREAMS = ["All", "Engineering", "Medicine", "Law", "Management", "Design", "Commerce", "Arts", "Science"];
const DIFF = { "Very High": "bg-rose-50 text-rose-700", High: "bg-amber-50 text-amber-700", Medium: "bg-emerald-50 text-emerald-700" };

export default function Courses() {
  const [stream, setStream] = useState("All"); const [q, setQ] = useState(""); const [items, setItems] = useState(null);
  useEffect(() => { setItems(null); api.get("/courses", { params: { stream, q: q || undefined } }).then((r) => setItems(r.data)); }, [stream, q]);
  return (
    <div>
      <PageHeader eyebrow="Course explorer" title="Explore courses & careers" subtitle="What you'll study, where it leads, what it pays — and which exams get you there." />
      <div className="flex flex-col sm:flex-row gap-3 mb-6 fade-up delay-1"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses…" className="input-soft sm:max-w-xs" data-testid="courses-search-input" /><div className="flex gap-2 overflow-x-auto hide-scroll">{STREAMS.map((s) => <button key={s} onClick={() => setStream(s)} className={`chip whitespace-nowrap ${stream === s ? "chip-on" : "chip-off"}`} data-testid={`courses-stream-${s.toLowerCase()}`}>{s}</button>)}</div></div>
      {!items ? <SkeletonCards n={6} /> : items.length === 0 ? <EmptyState title="No courses found" text="Try a different stream or search term." /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((c, i) => (
        <Link key={c.id} to={`/course/${c.slug}`} className="card-soft card-hover p-5 fade-up block" style={{ animationDelay: `${i * 30}ms` }} data-testid={`course-card-${c.slug}`}>
          <div className="flex items-center justify-between"><span className="pill bg-indigo-50 text-indigo-700">{c.stream}</span><span className={`pill ${DIFF[c.difficulty] || "bg-slate-100 text-slate-700"}`}>{c.difficulty}</span></div>
          <h3 className="font-display font-bold text-slate-900 mt-3 leading-tight">{c.name}</h3><p className="text-xs text-slate-500 mt-0.5">{c.degree} · {c.duration_years} years</p>
          <p className="text-sm text-slate-600 mt-3 line-clamp-2">{c.what_you_study}</p>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-600"><span className="flex items-center gap-1 text-emerald-700 font-semibold"><TrendingUp size={13} />₹{c.avg_salary_lpa} LPA avg</span><span className="flex items-center gap-1"><Clock size={13} />{c.exams.slice(0, 3).map((e) => e.toUpperCase()).join(", ")}</span></div>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">Explore <ArrowRight size={14} /></span>
        </Link>))}</div>}
    </div>
  );
}
