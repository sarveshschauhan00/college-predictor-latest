import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, MessageSquare, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PredictionCard } from "@/components/CollegeCard";
import { Disclaimer, EmptyState, SkeletonCards, BUCKET } from "@/components/ui-bits";

const TABS = [["all", "All"], ["dream", "Dream"], ["target", "Target"], ["safe", "Safe"]];
const DESC = { dream: "Low probability · highly competitive", target: "Realistic admission possibilities", safe: "High probability options" };

export default function Predictions() {
  const { user } = useAuth();
  const [res, setRes] = useState(null); const [loading, setLoading] = useState(true); const [tab, setTab] = useState("all");
  useEffect(() => {
    const cached = sessionStorage.getItem("cp_last_prediction");
    if (cached) { setRes(JSON.parse(cached)); setLoading(false); return; }
    if (user) api.get("/predictions/mine").then((r) => setRes(r.data)).finally(() => setLoading(false)); else setLoading(false);
  }, [user]);
  if (loading) return <SkeletonCards n={6} h="h-72" />;
  if (!res || res.needs_profile || (!res.total && !res.exam)) return <EmptyState title="No predictions yet" text="Run the predictor with your exam score to see Dream, Target and Safe colleges." action={<Link to="/predictor" className="btn-primary" data-testid="predictions-run-btn">Run predictor</Link>} testId="predictions-empty" />;
  const all = [...res.safe, ...res.target, ...res.dream];
  const list = tab === "all" ? all : res[tab];
  const inp = res.input || {};
  return (
    <div>
      <div className="fade-up flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div><p className="eyebrow">Prediction results · {res.exam?.short_name}</p><h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2" data-testid="predictions-heading">You have {res.total} colleges matching your profile.</h1>
          <p className="mt-2 text-sm text-slate-600 font-mono">{inp.metric === "rank" ? `AIR ${inp.rank?.toLocaleString("en-IN")}${inp.percentile ? ` · ${inp.percentile} percentile` : ""}` : `${inp.score} marks`} · {res.category} · Data {res.data_updated}</p></div>
        <div className="flex gap-2"><Link to="/predictor" className="btn-outline" data-testid="predictions-refine-btn"><SlidersHorizontal size={15} />Refine</Link><Link to="/shortlist" className="btn-primary" data-testid="predictions-build-shortlist-btn"><Bookmark size={15} />Build My Shortlist</Link></div>
      </div>
      {res.total === 0 ? <EmptyState title="No colleges found for these inputs" text={res.message || "Try widening preferences, changing category, or checking your rank/score."} action={<Link to="/predictor" className="btn-primary">Adjust inputs</Link>} testId="predictions-none" /> : <>
        <div className="grid grid-cols-3 gap-3 mb-6 fade-up delay-1">{["dream", "target", "safe"].map((b) => <button key={b} onClick={() => setTab(tab === b ? "all" : b)} className={`card-soft p-4 text-left transition-[box-shadow,border-color] ${tab === b ? "ring-2 ring-indigo-500 border-transparent" : ""}`} data-testid={`bucket-summary-${b}`}><span className={`pill border ${BUCKET[b].cls}`}>{BUCKET[b].label}</span><p className="font-display text-3xl font-extrabold text-slate-900 mt-2">{res[b].length}</p><p className="text-xs text-slate-500 hidden sm:block">{DESC[b]}</p></button>)}</div>
        <div className="flex items-center gap-2 mb-5 overflow-x-auto hide-scroll">{TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`chip ${tab === k ? "chip-on" : "chip-off"}`} data-testid={`predictions-tab-${k}`}>{l} {k !== "all" && `(${res[k].length})`}</button>)}
          <Link to="/ai-counselor" state={{ prefill: "Review my predicted colleges and tell me which ones to prioritise." }} className="btn-ghost ml-auto whitespace-nowrap" data-testid="predictions-ask-ai-btn"><MessageSquare size={14} />Ask AI to review</Link></div>
        {list.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((r, i) => <PredictionCard key={r.college_id + r.course_id} r={r} delay={Math.min(i, 8) * 50} />)}</div> : <EmptyState title={`No ${tab} colleges`} text="Try another bucket or refine your preferences." />}
        <Disclaimer text={res.disclaimer} /></>}
    </div>
  );
}
