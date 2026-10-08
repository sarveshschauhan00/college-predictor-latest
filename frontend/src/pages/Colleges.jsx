import { useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { api, STATES } from "@/lib/api";
import { CollegeCard } from "@/components/CollegeCard";
import { EmptyState, ErrorState, PageHeader, SkeletonCards } from "@/components/ui-bits";

export default function Colleges() {
  const [f, setF] = useState({ q: "", state: "Any", type: "Any", exam: "", course: "", max_fee: "", min_package: "", sort: "ranking", page: 1 });
  const [data, setData] = useState(null); const [err, setErr] = useState(null); const [exams, setExams] = useState([]); const [courses, setCourses] = useState([]); const [open, setOpen] = useState(false);
  useEffect(() => { api.get("/exams").then((r) => setExams(r.data)); api.get("/courses").then((r) => setCourses(r.data)); }, []);
  useEffect(() => {
    setData(null); setErr(null);
    const t = setTimeout(() => api.get("/colleges", { params: Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v !== "Any")) }).then((r) => setData(r.data)).catch((e) => setErr(e.message)), 200);
    return () => clearTimeout(t);
  }, [f]);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v, page: k === "page" ? v : 1 }));
  return (
    <div>
      <PageHeader eyebrow="College search" title="Discover colleges" subtitle="Search and filter by exam, course, state, fees and placements." />
      <div className="card-soft p-4 mb-6 fade-up delay-1">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Search by college name or city…" className="input-soft !pl-10" data-testid="colleges-search-input" /></div>
          <select value={f.sort} onChange={(e) => set("sort", e.target.value)} className="input-soft md:w-48" data-testid="colleges-sort-select"><option value="best_match">Best match</option><option value="ranking">Ranking</option><option value="fees">Fees: low to high</option><option value="fees_desc">Fees: high to low</option><option value="placement">Placement</option><option value="name">Name</option></select>
          <button onClick={() => setOpen(!open)} className="btn-outline md:w-auto" data-testid="colleges-filter-toggle"><SlidersHorizontal size={15} />Filters</button>
        </div>
        {open && <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 border-t border-slate-100 pt-4 fade-up" data-testid="colleges-filters">
          <select value={f.state} onChange={(e) => set("state", e.target.value)} className="input-soft" data-testid="filter-state"><option>Any</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
          <select value={f.type} onChange={(e) => set("type", e.target.value)} className="input-soft" data-testid="filter-type"><option>Any</option><option>Government</option><option>Private</option><option>Deemed</option></select>
          <select value={f.exam} onChange={(e) => set("exam", e.target.value)} className="input-soft" data-testid="filter-exam"><option value="">Any exam</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.short_name}</option>)}</select>
          <select value={f.course} onChange={(e) => set("course", e.target.value)} className="input-soft" data-testid="filter-course"><option value="">Any course</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={f.max_fee} onChange={(e) => set("max_fee", e.target.value)} className="input-soft" data-testid="filter-fee"><option value="">Any fee</option><option value="50000">Under ₹50K/yr</option><option value="150000">Under ₹1.5L/yr</option><option value="300000">Under ₹3L/yr</option><option value="600000">Under ₹6L/yr</option></select>
        </div>}
      </div>
      {err ? <ErrorState message={err} /> : !data ? <SkeletonCards n={6} h="h-80" /> : data.items.length === 0 ? <EmptyState title="No colleges found" text="Try removing a filter or searching a different name." action={<button onClick={() => setF({ q: "", state: "Any", type: "Any", exam: "", course: "", max_fee: "", min_package: "", sort: "ranking", page: 1 })} className="btn-outline" data-testid="colleges-clear-filters">Clear filters</button>} testId="colleges-empty" /> : <>
        <p className="text-sm text-slate-500 mb-4" data-testid="colleges-count">{data.total} colleges found</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.items.map((c, i) => <CollegeCard key={c.id} c={c} delay={i * 40} />)}</div>
        {data.pages > 1 && <div className="mt-8 flex items-center justify-center gap-2" data-testid="colleges-pagination">{Array.from({ length: data.pages }).map((_, i) => <button key={i} onClick={() => set("page", i + 1)} className={`h-9 w-9 rounded-full text-sm font-semibold ${f.page === i + 1 ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>{i + 1}</button>)}</div>}</>}
    </div>
  );
}
