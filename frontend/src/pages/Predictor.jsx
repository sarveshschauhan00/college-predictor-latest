import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { api, CATEGORIES, STATES, metricLabel } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/ui-bits";

const COURSE_KW = ["Computer", "Electronics", "Electrical", "Mechanical", "Civil", "Artificial", "Data", "Information", "MBBS", "Law", "Management", "Design", "Commerce", "Economics"];

export default function Predictor() {
  const { user } = useAuth(); const nav = useNavigate(); const loc = useLocation();
  const [exams, setExams] = useState([]); const [busy, setBusy] = useState(false); const [showPrefs, setShowPrefs] = useState(false);
  const [f, setF] = useState({ exam_id: "jee-main", rank: "", percentile: "", score: "", category: "General", home_state: "", gender: "", course_keywords: [], college_type: "Any", state: "Any", budget: "", placement_priority: false });
  useEffect(() => {
    api.get("/exams").then((r) => setExams(r.data));
    if (user) api.get("/profile").then((r) => { const p = r.data; if (p?.exam_id) setF((x) => ({ ...x, exam_id: p.exam_id, rank: p.rank ?? "", percentile: p.percentile ?? "", score: p.score ?? "", category: p.category || "General", home_state: p.home_state || "", gender: p.gender || "" })); }).catch(() => {});
    const q = loc.state?.query?.toLowerCase() || "";
    const pct = q.match(/(\d{2}(\.\d+)?)\s*(percentile|%)/); const rk = q.match(/(?:rank|air)\s*(\d+)/);
    if (q.includes("neet")) setF((x) => ({ ...x, exam_id: "neet" })); else if (q.includes("advanced")) setF((x) => ({ ...x, exam_id: "jee-advanced" })); else if (q.includes("cuet")) setF((x) => ({ ...x, exam_id: "cuet" })); else if (q.includes("clat")) setF((x) => ({ ...x, exam_id: "clat" }));
    if (pct) setF((x) => ({ ...x, percentile: pct[1] })); if (rk) setF((x) => ({ ...x, rank: rk[1] }));
  }, [user, loc.state]);
  const exam = exams.find((e) => e.id === f.exam_id); const isScore = exam?.metric_type === "score";
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    if (isScore ? !f.score : !(f.rank || f.percentile)) return toast.error(isScore ? "Enter your marks / score" : "Enter your rank or percentile");
    if (!isScore && f.percentile && (Number(f.percentile) > 100 || Number(f.percentile) < 0)) return toast.error("Percentile must be between 0 and 100");
    setBusy(true);
    try {
      const body = { exam_id: f.exam_id, rank: !isScore && f.rank ? Number(f.rank) : null, percentile: !isScore && f.percentile ? Number(f.percentile) : null, score: isScore ? Number(f.score) : null, category: f.category, home_state: f.home_state || null, gender: f.gender || null, save_to_profile: !!user, prefs: { course_keywords: f.course_keywords, college_type: f.college_type, state: f.state, budget: f.budget ? Number(f.budget) : null, placement_priority: f.placement_priority } };
      const { data } = await api.post("/predict", body);
      sessionStorage.setItem("cp_last_prediction", JSON.stringify(data));
      nav("/predictions");
    } catch (err) { toast.error(err.response?.data?.detail || "Prediction failed. Please check your inputs."); }
    finally { setBusy(false); }
  };
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="College Predictor" title="Predict your colleges" subtitle="Enter your exam and score. We'll match it against 3 years of cutoff data and classify colleges as Dream, Target or Safe." />
      <form onSubmit={submit} className="card-soft p-6 sm:p-8 space-y-7 fade-up delay-1" data-testid="predictor-form">
        <div><label className="label-soft">Exam</label><div className="flex flex-wrap gap-2">{exams.map((e) => <button type="button" key={e.id} onClick={() => set("exam_id", e.id)} className={`chip ${f.exam_id === e.id ? "chip-on" : "chip-off"}`} data-testid={`predictor-exam-${e.slug}`}>{e.short_name}</button>)}</div>{exam && <p className="mt-2 text-xs text-slate-500">{exam.description}</p>}</div>
        <div className="grid sm:grid-cols-2 gap-5">
          {isScore ? <div><label className="label-soft">{metricLabel(exam)}</label><input type="number" step="0.01" value={f.score} onChange={(e) => set("score", e.target.value)} className="input-soft font-mono" placeholder="e.g. 650" data-testid="predictor-score-input" /></div> : <>
            <div><label className="label-soft">Percentile</label><input type="number" step="0.01" value={f.percentile} onChange={(e) => set("percentile", e.target.value)} className="input-soft font-mono" placeholder="e.g. 96.2" data-testid="predictor-percentile-input" /></div>
            <div><label className="label-soft">or Rank (AIR / CRL)</label><input type="number" value={f.rank} onChange={(e) => set("rank", e.target.value)} className="input-soft font-mono" placeholder="e.g. 47500" data-testid="predictor-rank-input" /></div></>}
          <div><label className="label-soft">Category</label><select value={f.category} onChange={(e) => set("category", e.target.value)} className="input-soft" data-testid="predictor-category-select">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label-soft">Home state / domicile</label><select value={f.home_state} onChange={(e) => set("home_state", e.target.value)} className="input-soft" data-testid="predictor-state-select"><option value="">Select state</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label-soft">Gender <span className="font-normal text-slate-400">(female supernumerary seats)</span></label><select value={f.gender} onChange={(e) => set("gender", e.target.value)} className="input-soft" data-testid="predictor-gender-select"><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option></select></div>
        </div>
        <button type="button" onClick={() => setShowPrefs(!showPrefs)} className="text-sm font-semibold text-indigo-600" data-testid="predictor-toggle-prefs-btn">{showPrefs ? "Hide" : "Add"} preferences (branch, location, budget) {showPrefs ? "↑" : "↓"}</button>
        {showPrefs && <div className="space-y-5 border-t border-slate-100 pt-5 fade-up">
          <div><label className="label-soft">Branch / course keywords</label><div className="flex flex-wrap gap-2">{COURSE_KW.map((k) => <button type="button" key={k} onClick={() => set("course_keywords", f.course_keywords.includes(k) ? f.course_keywords.filter((x) => x !== k) : [...f.course_keywords, k])} className={`chip ${f.course_keywords.includes(k) ? "chip-on" : "chip-off"}`} data-testid={`predictor-course-${k.toLowerCase()}`}>{k}</button>)}</div></div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="label-soft">College type</label><select value={f.college_type} onChange={(e) => set("college_type", e.target.value)} className="input-soft">{["Any", "Government", "Private", "Deemed"].map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="label-soft">Preferred state</label><select value={f.state} onChange={(e) => set("state", e.target.value)} className="input-soft"><option>Any</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label className="label-soft">Max annual fee (₹)</label><input type="number" value={f.budget} onChange={(e) => set("budget", e.target.value)} className="input-soft font-mono" placeholder="300000" data-testid="predictor-budget-input" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={f.placement_priority} onChange={(e) => set("placement_priority", e.target.checked)} className="accent-indigo-600" />Prioritise placements over admission probability in sorting</label>
        </div>}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2"><button disabled={busy} className="btn-primary !py-3 !px-7" data-testid="predictor-submit-btn"><Sparkles size={16} />{busy ? "Analysing cutoffs…" : "Predict My Colleges"}</button><p className="text-xs text-slate-500">Estimates based on historical trends — not a guarantee of admission.</p></div>
      </form>
    </div>
  );
}
