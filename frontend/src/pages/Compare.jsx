import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MessageSquare, Plus, Sparkles, X } from "lucide-react";
import { api, compareStore, fmtMoney, fmtLPA } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AIMarkdown, EmptyState, Logo, PageHeader } from "@/components/ui-bits";

export default function Compare() {
  const [slugs, setSlugs] = useState(compareStore.get()); const [cols, setCols] = useState([]); const [all, setAll] = useState([]); const [summary, setSummary] = useState(""); const [busy, setBusy] = useState(false); const [decision, setDecision] = useState("");
  const { user } = useAuth(); const nav = useNavigate();
  useEffect(() => { const f = () => setSlugs(compareStore.get()); window.addEventListener("cp-compare", f); return () => window.removeEventListener("cp-compare", f); }, []);
  useEffect(() => { api.get("/colleges", { params: { limit: 50 } }).then((r) => setAll(r.data.items)); }, []);
  useEffect(() => { if (slugs.length) api.post("/compare", { slugs }).then((r) => setCols(r.data)); else setCols([]); setSummary(""); setDecision(""); }, [slugs]);
  const add = (slug) => slug && compareStore.toggle(slug);
  const ask = async (mode) => {
    if (mode === "choose" && !user) { toast("Login to use Help me choose"); return nav("/login"); }
    setBusy(true);
    try { const { data } = await api.post(mode === "choose" ? "/ai/help-me-choose" : "/ai/compare-summary", { slugs }); mode === "choose" ? setDecision(data.analysis) : setSummary(data.summary); }
    catch (e) { toast.error(e.response?.data?.detail || "AI unavailable right now"); }
    finally { setBusy(false); }
  };
  const bestIdx = (key, high = true) => { const vals = cols.map((c) => c[key] ?? (high ? -Infinity : Infinity)); const best = high ? Math.max(...vals) : Math.min(...vals); return vals.indexOf(best); };
  const rows = [
    ["NIRF ranking", (c) => `#${c.nirf_rank}`, bestIdx("nirf_rank", false)], ["Annual fee", (c) => fmtMoney(c.fee_annual), bestIdx("fee_annual", false)], ["Average package", (c) => fmtLPA(c.avg_package), bestIdx("avg_package")], ["Highest package", (c) => fmtLPA(c.highest_package), bestIdx("highest_package")], ["Placement rate", (c) => `${c.placement_rate}%`, bestIdx("placement_rate")],
    ["Courses", (c) => `${c.courses.length} programmes`], ["Top cutoff (2025, Gen)", (c) => { const x = c.cutoffs?.find?.(() => true); return x ? x.closing : "See profile"; }], ["Hostel", (c) => `${fmtMoney(c.hostel_fee)}/yr · ${c.hostel?.rooms}`], ["Location", (c) => `${c.city}, ${c.state}`], ["Campus", (c) => `${c.campus_acres} acres`], ["Type", (c) => c.type], ["Scholarships", (c) => c.scholarships.join(", ")],
  ];
  return (
    <div>
      <PageHeader eyebrow="College comparison" title="Compare colleges side by side" subtitle="Add up to 4 colleges. Highlighted cells show the best value in each row." />
      <div className="card-soft p-4 mb-6 fade-up delay-1 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex flex-wrap gap-2 flex-1">{slugs.map((s) => <span key={s} className="pill bg-indigo-50 text-indigo-700 border border-indigo-100" data-testid={`compare-chip-${s}`}>{cols.find((c) => c.slug === s)?.short_name || s}<button onClick={() => compareStore.toggle(s)} className="ml-1 hover:text-red-600" data-testid={`compare-remove-${s}`}><X size={12} /></button></span>)}{slugs.length === 0 && <span className="text-sm text-slate-500">No colleges selected yet.</span>}</div>
        {slugs.length < 4 && <select onChange={(e) => { add(e.target.value); e.target.value = ""; }} className="input-soft sm:w-64" defaultValue="" data-testid="compare-add-select"><option value="" disabled>+ Add a college</option>{all.filter((c) => !slugs.includes(c.slug)).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>}
      </div>
      {cols.length < 2 ? <EmptyState icon={Plus} title="Add at least 2 colleges to compare" text="Use the Compare button on any college card, or pick from the dropdown above." action={<Link to="/colleges" className="btn-primary">Browse colleges</Link>} testId="compare-empty" /> : <>
        <div className="card-soft overflow-x-auto fade-up" data-testid="compare-table"><table className="w-full text-sm min-w-[640px]"><thead><tr className="border-b bg-slate-50"><th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500 w-44">Category</th>{cols.map((c) => <th key={c.slug} className="p-4 text-left"><Link to={`/college/${c.slug}`} className="flex items-center gap-2 hover:text-indigo-700"><Logo text={c.logo} size="h-9 w-9 text-[10px]" /><span className="font-display font-bold leading-tight">{c.short_name}</span></Link></th>)}</tr></thead>
          <tbody>{rows.map(([label, fn, best]) => <tr key={label} className="border-b border-slate-100" data-testid="compare-row"><td className="p-4 font-semibold text-slate-700">{label}</td>{cols.map((c, i) => <td key={c.slug} className={`p-4 ${best === i ? "bg-emerald-50 text-emerald-900 font-semibold" : "text-slate-700"}`}>{fn(c)}</td>)}</tr>)}</tbody></table></div>
        <div className="mt-6 grid lg:grid-cols-2 gap-4">
          <div className="card-soft p-6 fade-up"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold flex items-center gap-2"><Sparkles size={18} className="text-indigo-600" />AI summary</h2><button onClick={() => ask("summary")} disabled={busy} className="btn-primary !py-2" data-testid="compare-ai-summary-btn"><MessageSquare size={14} />{busy ? "Thinking…" : "Ask AI Which Is Better"}</button></div>
            {summary ? <AIMarkdown text={summary} className="mt-4" /> : <p className="mt-3 text-sm text-slate-500">Get a personalized verdict based on your profile and priorities.</p>}</div>
          <div className="card-soft p-6 fade-up delay-1"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Help me choose</h2><button onClick={() => ask("choose")} disabled={busy} className="btn-outline !py-2" data-testid="compare-help-choose-btn">{busy ? "Evaluating…" : "Run decision mode"}</button></div>
            {decision ? <AIMarkdown text={decision} className="mt-4" /> : <p className="mt-3 text-sm text-slate-500">Best fit · Best ROI · Safest · Best placement · Best overall — with reasoning. There is never one objectively correct choice.</p>}</div>
        </div></>}
    </div>
  );
}
