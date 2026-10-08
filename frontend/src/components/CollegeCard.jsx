import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, GitCompare, MapPin, MessageSquare, TrendingUp } from "lucide-react";
import { api, compareStore, fmtMoney, fmtLPA } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { BucketPill, ProbRing, Logo } from "@/components/ui-bits";

export function useCompare(slug) {
  const [on, setOn] = useState(() => compareStore.get().includes(slug));
  useEffect(() => { const f = () => setOn(compareStore.get().includes(slug)); window.addEventListener("cp-compare", f); return () => window.removeEventListener("cp-compare", f); }, [slug]);
  const toggle = () => {
    if (!on && compareStore.get().length >= 4) return toast.error("You can compare up to 4 colleges");
    const added = compareStore.toggle(slug);
    toast.success(added ? "Added to compare" : "Removed from compare");
  };
  return [on, toggle];
}

export function useSave() {
  const { user } = useAuth();
  const nav = useNavigate();
  return async (college_id, course_id, bucket = "target") => {
    if (!user) { toast("Login to save colleges"); return nav("/login"); }
    try { await api.post("/shortlist", { college_id, course_id, bucket }); toast.success("Saved to your shortlist"); }
    catch { toast.error("Could not save"); }
  };
}

export const CardActions = ({ slug, collegeId, courseId, bucket, askText }) => {
  const [cmp, toggleCmp] = useCompare(slug);
  const save = useSave();
  const nav = useNavigate();
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Link to={`/college/${slug}`} className="btn-outline !px-3.5 !py-1.5 !text-xs" data-testid={`view-college-${slug}`}>View College</Link>
      <button onClick={toggleCmp} className={`btn-ghost ${cmp ? "!bg-indigo-50 !text-indigo-700" : ""}`} data-testid={`compare-btn-${slug}`}><GitCompare size={14} />{cmp ? "In compare" : "Compare"}</button>
      <button onClick={() => save(collegeId, courseId, bucket)} className="btn-ghost" data-testid={`save-btn-${slug}`}><Bookmark size={14} />Save</button>
      <button onClick={() => nav("/ai-counselor", { state: { prefill: askText } })} className="btn-ghost" data-testid={`ask-ai-btn-${slug}`}><MessageSquare size={14} />Ask AI</button>
    </div>
  );
};

export const PredictionCard = ({ r, delay = 0 }) => (
  <div className={`card-soft card-hover p-5 fade-up`} style={{ animationDelay: `${delay}ms` }} data-testid={`prediction-card-${r.bucket}`}>
    <div className="flex items-start gap-3">
      <Logo text={r.logo} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-slate-900 leading-tight truncate">{r.college_short || r.college_name}</h3>
            <p className="text-sm text-slate-600 truncate">{r.degree} {r.course_name}</p>
          </div>
          <ProbRing value={r.probability} bucket={r.bucket} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <BucketPill bucket={r.bucket} />
          <span className="pill bg-slate-100 text-slate-600">Confidence: {r.confidence}</span>
          {r.quota === "HS" && <span className="pill bg-indigo-50 text-indigo-700">Home-state quota</span>}
        </div>
      </div>
    </div>
    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
      <div><dt className="text-xs text-slate-500">{r.latest_year} closing cutoff</dt><dd className="font-mono font-semibold text-slate-900">{r.metric === "rank" ? `AIR ${r.latest_cutoff.toLocaleString("en-IN")}` : `${r.latest_cutoff} marks`}</dd></div>
      <div><dt className="text-xs text-slate-500">Expected range</dt><dd className="font-mono font-semibold text-slate-900">{r.expected_cutoff_range[0].toLocaleString("en-IN")}–{r.expected_cutoff_range[1].toLocaleString("en-IN")}</dd></div>
      <div><dt className="text-xs text-slate-500">Est. annual fee</dt><dd className="font-semibold text-slate-900">{fmtMoney(r.fee_annual)}</dd></div>
      <div><dt className="text-xs text-slate-500">Placement</dt><dd className="font-semibold text-emerald-700 flex items-center gap-1"><TrendingUp size={13} />{fmtLPA(r.avg_package)} avg</dd></div>
    </dl>
    <p className="mt-3 text-xs text-slate-500 flex items-center gap-1"><MapPin size={12} />{r.city}, {r.state} · {r.college_type}</p>
    <p className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{r.reason}</p>
    <CardActions slug={r.college_slug} collegeId={r.college_id} courseId={r.course_id} bucket={r.bucket} askText={`Can I get ${r.course_name} at ${r.college_short}? What are my chances and alternatives?`} />
  </div>
);

export const CollegeCard = ({ c, delay = 0 }) => (
  <div className="card-soft card-hover overflow-hidden fade-up flex flex-col" style={{ animationDelay: `${delay}ms` }} data-testid={`college-card-${c.slug}`}>
    <Link to={`/college/${c.slug}`} className="block relative h-32 overflow-hidden bg-slate-100">
      <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
      <span className="absolute left-3 top-3 pill bg-white/90 backdrop-blur text-slate-800">NIRF #{c.nirf_rank}</span>
      {c.sponsored && <span className="absolute right-3 top-3 pill bg-amber-100 text-amber-800">Sponsored</span>}
    </Link>
    <div className="p-5 flex-1 flex flex-col">
      <div className="flex items-start gap-3">
        <Logo text={c.logo} size="h-10 w-10 text-xs" />
        <div className="min-w-0">
          <Link to={`/college/${c.slug}`} className="font-display font-bold text-slate-900 leading-tight hover:text-indigo-700 line-clamp-2">{c.name}</Link>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><MapPin size={11} />{c.city}, {c.state} · {c.type}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[["Fee/yr", fmtMoney(c.fee_annual)], ["Avg pkg", fmtLPA(c.avg_package)], ["Placed", `${c.placement_rate}%`]].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-slate-50 py-2"><p className="text-[10px] uppercase tracking-wider text-slate-500">{l}</p><p className="text-sm font-bold text-slate-900">{v}</p></div>
        ))}
      </div>
      <div className="mt-auto"><CardActions slug={c.slug} collegeId={c.id} courseId={c.courses?.[0]?.course_id} askText={`Tell me about ${c.short_name} — placements, fees and whether I can get in.`} /></div>
    </div>
  </div>
);

export const MiniCollegeCard = ({ c }) => (
  <Link to={`/college/${c.slug}`} className="card-soft card-hover p-3 flex items-center gap-3 min-w-[240px]" data-testid={`ai-college-card-${c.slug}`}>
    <Logo text={c.logo} size="h-10 w-10 text-xs" />
    <div className="min-w-0">
      <p className="font-display text-sm font-bold text-slate-900 truncate">{c.short_name}</p>
      <p className="text-xs text-slate-500 truncate">{c.city} · NIRF #{c.nirf_rank} · {fmtMoney(c.fee_annual)}/yr · {fmtLPA(c.avg_package)}</p>
    </div>
    <BookmarkCheck size={16} className="ml-auto text-indigo-500 shrink-0" />
  </Link>
);
