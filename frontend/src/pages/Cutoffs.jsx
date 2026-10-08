import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, CATEGORIES } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AIMarkdown, EmptyState, PageHeader } from "@/components/ui-bits";

export default function Cutoffs() {
  const [sp] = useSearchParams(); const { user } = useAuth();
  const [exams, setExams] = useState([]); const [colleges, setColleges] = useState([]); const [courses, setCourses] = useState([]);
  const [f, setF] = useState({ exam: sp.get("exam") || "jee-main", college: sp.get("college") || "", course: "", category: "General", round: "", quota: "AI" });
  const [rows, setRows] = useState(null); const [insight, setInsight] = useState(""); const [busy, setBusy] = useState(false); const [studentValue, setStudentValue] = useState("");
  useEffect(() => { api.get("/exams").then((r) => setExams(r.data)); api.get("/colleges", { params: { limit: 50 } }).then((r) => setColleges(r.data.items)); api.get("/courses").then((r) => setCourses(r.data)); if (user) api.get("/profile").then((r) => { const p = r.data; if (p?.exam_id === f.exam) setStudentValue(p.rank || p.score || ""); }).catch(() => {}); }, [user]); // eslint-disable-line
  useEffect(() => { setRows(null); setInsight(""); api.get("/cutoffs", { params: Object.fromEntries(Object.entries(f).filter(([, v]) => v)) }).then((r) => setRows(r.data)); }, [f]);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const filteredColleges = colleges.filter((c) => !f.exam || c.exams.includes(f.exam));
  const series = useMemo(() => {
    if (!rows) return [];
    const final = rows.filter((r) => f.round ? true : r.round >= 5);
    const byYear = {};
    final.forEach((r) => { const k = `${r.college_name} · ${r.course_name}`; byYear[r.year] = byYear[r.year] || { year: r.year }; byYear[r.year][k] = Math.round(r.closing); });
    return Object.values(byYear).sort((a, b) => a.year - b.year);
  }, [rows, f.round]);
  const keys = useMemo(() => [...new Set(series.flatMap((s) => Object.keys(s).filter((k) => k !== "year")))].slice(0, 6), [series]);
  const metric = rows?.[0]?.metric || "rank";
  const explain = async () => {
    setBusy(true);
    try { const { data } = await api.post("/ai/cutoff-insight", { series: series.map((s) => ({ ...s })), metric, exam: f.exam, college: f.college, course: f.course, category: f.category, student_value: studentValue || null }); setInsight(data.insight); }
    catch (e) { toast.error(e.response?.data?.detail || "AI unavailable"); } finally { setBusy(false); }
  };
  const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9", "#8B5CF6"];
  return (
    <div>
      <PageHeader eyebrow="Cutoff explorer" title="Explore historical cutoffs" subtitle="Final-round closing ranks/scores from 2023–2025 by exam, college, course and category." />
      <div className="card-soft p-4 mb-6 grid sm:grid-cols-2 lg:grid-cols-6 gap-3 fade-up delay-1" data-testid="cutoff-filters">
        <select value={f.exam} onChange={(e) => setF({ ...f, exam: e.target.value, college: "", course: "" })} className="input-soft" data-testid="cutoff-exam-select">{exams.map((e) => <option key={e.id} value={e.id}>{e.short_name}</option>)}</select>
        <select value={f.college} onChange={(e) => set("college", e.target.value)} className="input-soft" data-testid="cutoff-college-select"><option value="">All colleges</option>{filteredColleges.map((c) => <option key={c.id} value={c.id}>{c.short_name}</option>)}</select>
        <select value={f.course} onChange={(e) => set("course", e.target.value)} className="input-soft" data-testid="cutoff-course-select"><option value="">All courses</option>{courses.filter((c) => c.exams.includes(f.exam)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={f.category} onChange={(e) => set("category", e.target.value)} className="input-soft" data-testid="cutoff-category-select">{["General", "EWS", "OBC-NCL", "SC", "ST"].map((c) => <option key={c}>{c}</option>)}</select>
        <select value={f.round} onChange={(e) => set("round", e.target.value)} className="input-soft" data-testid="cutoff-round-select"><option value="">Final round</option><option value="1">Round 1</option><option value="5">Round 5+</option></select>
        <input type="number" value={studentValue} onChange={(e) => setStudentValue(e.target.value)} placeholder={metric === "rank" ? "Your rank" : "Your score"} className="input-soft font-mono" data-testid="cutoff-student-value-input" />
      </div>
      {!rows ? <div className="skeleton h-80" /> : series.length === 0 ? <EmptyState title="No cutoff data for this combination" text="Try another college, course or category." testId="cutoff-empty" /> : <>
        <div className="card-soft p-5 fade-up" data-testid="cutoff-chart">
          <p className="text-sm font-semibold text-slate-700 mb-2">{metric === "rank" ? "Closing rank (lower is more competitive)" : "Closing score (higher is more competitive)"}{keys.length === 6 && " · showing first 6 series — narrow by college/course"}</p>
          <div className="h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={series} margin={{ left: 8, right: 16, top: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="year" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v) => v.toLocaleString("en-IN")} /><Tooltip formatter={(v) => v.toLocaleString("en-IN")} contentStyle={{ borderRadius: 12, fontSize: 12 }} />{studentValue && <ReferenceLine y={Number(studentValue)} stroke="#0F172A" strokeDasharray="4 4" label={{ value: "You", fontSize: 11, position: "right" }} />}{keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ r: 4 }} />)}</LineChart></ResponsiveContainer></div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">{keys.map((k, i) => <span key={k} className="flex items-center gap-1.5 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{k}</span>)}</div>
        </div>
        <div className="mt-4 card-soft p-5 fade-up delay-1"><div className="flex items-center justify-between gap-3"><h2 className="font-display font-bold flex items-center gap-2"><Sparkles size={17} className="text-indigo-600" />AI explanation</h2><button onClick={explain} disabled={busy} className="btn-primary !py-2" data-testid="cutoff-ai-explain-btn">{busy ? "Analysing…" : "Explain this trend"}</button></div>{insight ? <AIMarkdown text={insight} className="mt-3" /> : <p className="mt-2 text-sm text-slate-500">e.g. “The cutoff has become more competitive over the last 3 years.”</p>}</div>
        <div className="mt-4 card-soft overflow-x-auto fade-up delay-2"><table className="w-full text-sm min-w-[700px]"><thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><th className="p-3">College</th><th className="p-3">Course</th><th className="p-3">Year</th><th className="p-3">Round</th><th className="p-3">Opening</th><th className="p-3">Closing</th></tr></thead><tbody>{rows.slice(0, 60).map((r) => <tr key={r.id} className="border-t border-slate-100" data-testid="cutoff-row"><td className="p-3 font-semibold">{r.college_name}</td><td className="p-3">{r.course_name}</td><td className="p-3">{r.year}</td><td className="p-3">{r.round}</td><td className="p-3 font-mono">{r.opening ? Math.round(r.opening).toLocaleString("en-IN") : "—"}</td><td className="p-3 font-mono font-semibold">{Math.round(r.closing).toLocaleString("en-IN")}</td></tr>)}</tbody></table>{rows.length > 60 && <p className="p-3 text-xs text-slate-500">Showing 60 of {rows.length} rows — narrow your filters.</p>}</div></>}
    </div>
  );
}
