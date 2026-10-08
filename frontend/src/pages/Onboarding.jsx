import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { api, CATEGORIES, STATES, metricLabel } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Brand } from "@/components/Layout";

const STEPS = ["Academic", "Exam", "Preferences", "Goals", "Results"];
const COURSE_OPTS = ["Computer Science", "Electronics", "Electrical", "Mechanical", "Civil", "AI & ML", "Data Science", "Medicine", "Law", "Management", "Design", "Commerce", "Economics", "Science"];
const PRIORITIES = ["Placements", "Reputation", "Low fees", "Campus life", "Close to home", "Research"];
const Chips = ({ opts, value = [], onChange, multi = true, testPrefix }) => (
  <div className="flex flex-wrap gap-2">{opts.map((o) => { const on = multi ? value.includes(o) : value === o; return <button type="button" key={o} data-testid={`${testPrefix}-${o.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} onClick={() => onChange(multi ? (on ? value.filter((v) => v !== o) : [...value, o]) : o)} className={`chip ${on ? "chip-on" : "chip-off"}`}>{o}</button>; })}</div>
);

export default function Onboarding() {
  const { user, refresh } = useAuth(); const nav = useNavigate();
  const [step, setStep] = useState(0); const [exams, setExams] = useState([]); const [busy, setBusy] = useState(false); const [result, setResult] = useState(null);
  const [p, setP] = useState({ class_year: "Class 12 (2026)", state: "", city: "", home_state: "", exam_id: "", rank: "", percentile: "", score: "", category: "General", gender: "", preferred_courses: [], college_type: "Any", budget: 300000, hostel_required: true, preferred_states: [], priorities: [], career_goal: "" });
  useEffect(() => { api.get("/exams").then((r) => setExams(r.data)); api.get("/profile").then((r) => r.data?.exam_id && setP((x) => ({ ...x, ...r.data }))).catch(() => {}); }, []);
  const exam = exams.find((e) => e.id === p.exam_id);
  const label = metricLabel(exam);
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const valid = [p.class_year && p.state, p.exam_id && (p.rank || p.percentile || p.score), true, true][step] ?? true;

  const finish = async () => {
    setBusy(true);
    try {
      const body = { ...p, home_state: p.home_state || p.state, rank: p.rank ? Number(p.rank) : null, percentile: p.percentile ? Number(p.percentile) : null, score: p.score ? Number(p.score) : null, budget: Number(p.budget) };
      const isRank = exam && exam.metric_type !== "score";
      if (isRank) body.score = null; else { body.rank = null; body.percentile = null; }
      await api.put("/profile", body);
      const { data } = await api.get("/predictions/mine");
      setResult(data); await refresh(); setStep(4);
    } catch (e) { toast.error(e.response?.data?.detail || "Could not save profile"); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <header className="h-16 flex items-center px-5 sm:px-8 border-b border-slate-100 bg-white"><Brand /><span className="ml-auto text-sm text-slate-500">Hi {user?.name?.split(" ")[0]} 👋</span></header>
      <div className="mx-auto max-w-2xl px-5 py-10">
        <ol className="flex items-center gap-2 mb-10" data-testid="onboarding-progress">{STEPS.map((s, i) => <li key={s} className="flex items-center gap-2 flex-1"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i < step ? "bg-emerald-500 text-white" : i === step ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"}`}>{i < step ? <Check size={14} /> : i + 1}</span><span className={`hidden sm:block text-xs font-semibold ${i === step ? "text-slate-900" : "text-slate-400"}`}>{s}</span>{i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < step ? "bg-emerald-400" : "bg-slate-200"}`} />}</li>)}</ol>

        <div className="card-soft p-6 sm:p-8 fade-up" key={step} data-testid={`onboarding-step-${step + 1}`}>
          {step === 0 && <>
            <h2 className="font-display text-2xl font-extrabold text-slate-900">Tell us about your academics</h2><p className="text-sm text-slate-500 mt-1">We use this to personalize everything.</p>
            <div className="mt-6 space-y-5">
              <div><label className="label-soft">Class / year</label><Chips multi={false} opts={["Class 10", "Class 11", "Class 12 (2026)", "Dropper / Gap year", "Graduate (PG aspirant)"]} value={p.class_year} onChange={(v) => set("class_year", v)} testPrefix="class" /></div>
              <div className="grid sm:grid-cols-2 gap-4"><div><label className="label-soft">Home state</label><select value={p.state} onChange={(e) => set("state", e.target.value)} className="input-soft" data-testid="onboarding-state-select"><option value="">Select state</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></div><div><label className="label-soft">City</label><input value={p.city} onChange={(e) => set("city", e.target.value)} className="input-soft" placeholder="Jaipur" data-testid="onboarding-city-input" /></div></div>
              <div className="grid sm:grid-cols-2 gap-4"><div><label className="label-soft">Category</label><select value={p.category} onChange={(e) => set("category", e.target.value)} className="input-soft" data-testid="onboarding-category-select">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div><div><label className="label-soft">Gender <span className="text-slate-400 font-normal">(for supernumerary seats)</span></label><select value={p.gender} onChange={(e) => set("gender", e.target.value)} className="input-soft" data-testid="onboarding-gender-select"><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option></select></div></div>
            </div></>}
          {step === 1 && <>
            <h2 className="font-display text-2xl font-extrabold text-slate-900">Which exam are you targeting?</h2><p className="text-sm text-slate-500 mt-1">You can add more exams later from your profile.</p>
            <div className="mt-6 space-y-5">
              <div><label className="label-soft">Exam</label><div className="flex flex-wrap gap-2">{exams.map((e) => <button type="button" key={e.id} onClick={() => set("exam_id", e.id)} className={`chip ${p.exam_id === e.id ? "chip-on" : "chip-off"}`} data-testid={`exam-chip-${e.slug}`}>{e.short_name}</button>)}</div></div>
              {exam && <div className="grid sm:grid-cols-2 gap-4">
                {exam.metric_type === "score" ? <div><label className="label-soft">{label}</label><input type="number" value={p.score} onChange={(e) => set("score", e.target.value)} className="input-soft" placeholder="e.g. 650" data-testid="onboarding-score-input" /></div> : <>
                  <div><label className="label-soft">Percentile</label><input type="number" step="0.01" max="100" value={p.percentile} onChange={(e) => set("percentile", e.target.value)} className="input-soft" placeholder="e.g. 96.2" data-testid="onboarding-percentile-input" /></div>
                  <div><label className="label-soft">or Rank (AIR / CRL)</label><input type="number" value={p.rank} onChange={(e) => set("rank", e.target.value)} className="input-soft" placeholder="e.g. 47500" data-testid="onboarding-rank-input" /></div></>}
              </div>}
              <p className="text-xs text-slate-500">Don't have your result yet? Enter an expected score — you can update it anytime.</p>
            </div></>}
          {step === 2 && <>
            <h2 className="font-display text-2xl font-extrabold text-slate-900">Your preferences</h2>
            <div className="mt-6 space-y-5">
              <div><label className="label-soft">Preferred courses</label><Chips opts={COURSE_OPTS} value={p.preferred_courses} onChange={(v) => set("preferred_courses", v)} testPrefix="course" /></div>
              <div><label className="label-soft">College type</label><Chips multi={false} opts={["Any", "Government", "Private", "Deemed"]} value={p.college_type} onChange={(v) => set("college_type", v)} testPrefix="type" /></div>
              <div><label className="label-soft">Annual budget: <span className="font-mono text-indigo-700">₹{(p.budget / 100000).toFixed(1)}L</span></label><input type="range" min={25000} max={1500000} step={25000} value={p.budget} onChange={(e) => set("budget", Number(e.target.value))} className="w-full accent-indigo-600" data-testid="onboarding-budget-slider" /></div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"><span className="text-sm font-medium text-slate-800">I need a hostel</span><button type="button" onClick={() => set("hostel_required", !p.hostel_required)} className={`h-6 w-11 rounded-full transition-colors relative ${p.hostel_required ? "bg-indigo-600" : "bg-slate-300"}`} data-testid="onboarding-hostel-toggle"><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${p.hostel_required ? "translate-x-5" : "translate-x-0.5"}`} /></button></div>
            </div></>}
          {step === 3 && <>
            <h2 className="font-display text-2xl font-extrabold text-slate-900">What matters most to you?</h2>
            <div className="mt-6 space-y-5">
              <div><label className="label-soft">Priorities</label><Chips opts={PRIORITIES} value={p.priorities} onChange={(v) => set("priorities", v)} testPrefix="priority" /></div>
              <div><label className="label-soft">Career goal (optional)</label><textarea value={p.career_goal} onChange={(e) => set("career_goal", e.target.value)} rows={3} className="input-soft" placeholder="e.g. Software engineer at a product company, or civil services after law" data-testid="onboarding-goal-input" /></div>
            </div></>}
          {step === 4 && result && <div className="text-center" data-testid="onboarding-results">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Sparkles size={26} /></span>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-slate-900">You have {result.total} colleges matching your profile</h2>
            <p className="text-sm text-slate-500 mt-1">Based on {exam?.short_name} historical cutoffs for the {p.category} category.</p>
            <div className="mt-6 grid grid-cols-3 gap-3">{[["Dream", result.dream.length, "text-rose-600"], ["Target", result.target.length, "text-amber-600"], ["Safe", result.safe.length, "text-emerald-600"]].map(([l, v, c]) => <div key={l} className="rounded-2xl bg-slate-50 p-4"><p className={`font-display text-3xl font-extrabold ${c}`}>{v}</p><p className="text-xs text-slate-500">{l}</p></div>)}</div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"><button onClick={() => nav("/predictions")} className="btn-primary" data-testid="onboarding-view-predictions-btn">View my predictions<ArrowRight size={16} /></button><button onClick={() => nav("/dashboard")} className="btn-outline" data-testid="onboarding-go-dashboard-btn">Go to dashboard</button></div>
          </div>}

          {step < 4 && <div className="mt-8 flex items-center justify-between">
            <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0} className="btn-ghost !text-sm" data-testid="onboarding-back-btn"><ArrowLeft size={16} />Back</button>
            {step < 3 ? <button type="button" disabled={!valid} onClick={() => setStep(step + 1)} className="btn-primary" data-testid="onboarding-next-btn">Continue<ArrowRight size={16} /></button> : <button type="button" disabled={busy} onClick={finish} className="btn-primary" data-testid="onboarding-finish-btn">{busy ? "Predicting…" : "See my colleges"}<Sparkles size={16} /></button>}
          </div>}
        </div>
      </div>
    </div>
  );
}
