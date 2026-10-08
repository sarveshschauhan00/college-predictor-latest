import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { GripVertical, MapPin, Sparkles, Trash2 } from "lucide-react";
import { api, fmtMoney } from "@/lib/api";
import { AIMarkdown, BUCKET, EmptyState, Logo, PageHeader } from "@/components/ui-bits";

const COLS = [["dream", "Dream Colleges", "Low probability · reach"], ["target", "Target Colleges", "Realistic options"], ["safe", "Safe Colleges", "High probability backups"]];

export default function Shortlist() {
  const [items, setItems] = useState(null); const [review, setReview] = useState(""); const [busy, setBusy] = useState(false); const [over, setOver] = useState(null);
  const load = () => api.get("/shortlist").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const move = async (id, bucket) => { setItems((x) => x.map((i) => (i.id === id ? { ...i, bucket } : i))); await api.patch(`/shortlist/${id}`, { bucket }); };
  const remove = async (id) => { await api.delete(`/shortlist/${id}`); toast.success("Removed"); load(); };
  const ask = async () => { setBusy(true); try { const { data } = await api.post("/ai/review-shortlist"); setReview(data.review); } catch (e) { toast.error(e.response?.data?.detail || "AI unavailable"); } finally { setBusy(false); } };
  if (!items) return <div className="grid gap-4 lg:grid-cols-3"><div className="skeleton h-80" /><div className="skeleton h-80" /><div className="skeleton h-80" /></div>;
  return (
    <div>
      <PageHeader eyebrow="My shortlist" title="Your personalized shortlist" subtitle="Drag colleges between Dream, Target and Safe. We show the predicted bucket so you can sanity-check your picks." action={<button onClick={ask} disabled={busy || items.length === 0} className="btn-primary" data-testid="shortlist-ai-review-btn"><Sparkles size={15} />{busy ? "Reviewing…" : "Ask AI to review my shortlist"}</button>} />
      {items.length === 0 ? <EmptyState title="Your shortlist is empty" text="Save colleges from predictions or search to start building your list." action={<Link to="/predictions" className="btn-primary" data-testid="shortlist-go-predictions-btn">Go to predictions</Link>} testId="shortlist-empty" /> : <>
        {review && <div className="card-soft p-6 mb-6 fade-up border-indigo-100" data-testid="shortlist-ai-review"><h2 className="font-display font-bold flex items-center gap-2"><Sparkles size={17} className="text-indigo-600" />AI shortlist review</h2><AIMarkdown text={review} className="mt-3" /></div>}
        <div className="grid gap-4 lg:grid-cols-3">{COLS.map(([b, title, sub]) => (
          <div key={b} onDragOver={(e) => { e.preventDefault(); setOver(b); }} onDragLeave={() => setOver(null)} onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("id"); setOver(null); if (id) move(id, b); }} className={`rounded-2xl border-2 border-dashed p-3 min-h-[320px] transition-colors ${over === b ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200 bg-slate-50/50"}`} data-testid={`shortlist-column-${b}`}>
            <div className="flex items-center justify-between px-1 mb-3"><div><span className={`pill border ${BUCKET[b].cls}`}>{title}</span><p className="text-[11px] text-slate-500 mt-1 ml-1">{sub}</p></div><span className="font-display font-extrabold text-slate-700">{items.filter((i) => i.bucket === b).length}</span></div>
            <div className="space-y-3">{items.filter((i) => i.bucket === b).map((i) => (
              <div key={i.id} draggable onDragStart={(e) => e.dataTransfer.setData("id", i.id)} className="card-soft p-3.5 cursor-grab active:cursor-grabbing fade-up" data-testid={`shortlist-item-${i.id}`}>
                <div className="flex items-start gap-2"><GripVertical size={16} className="text-slate-300 mt-1 shrink-0" /><Logo text={i.college?.logo} size="h-9 w-9 text-[10px]" /><div className="min-w-0 flex-1"><Link to={`/college/${i.college?.slug}`} className="font-display text-sm font-bold text-slate-900 hover:text-indigo-700 leading-tight block truncate">{i.college?.short_name}</Link><p className="text-xs text-slate-500 truncate">{i.course?.name || "Any course"}</p></div><button onClick={() => remove(i.id)} className="text-slate-300 hover:text-red-600" data-testid={`shortlist-remove-${i.id}`}><Trash2 size={14} /></button></div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">{i.probability !== null && <span className={`pill border ${BUCKET[i.predicted_bucket]?.cls}`}>{i.probability}% · predicted {i.predicted_bucket}</span>}<span className="pill bg-slate-100 text-slate-600">{fmtMoney(i.college?.fee_annual)}/yr</span><span className="text-slate-500 flex items-center gap-1"><MapPin size={11} />{i.college?.city}</span></div>
                {i.probability !== null && i.predicted_bucket !== b && <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 rounded-md px-2 py-1">Our model classifies this as <b>{i.predicted_bucket}</b> for your profile.</p>}
                <div className="mt-2 flex gap-1 lg:hidden">{COLS.filter(([x]) => x !== b).map(([x, t]) => <button key={x} onClick={() => move(i.id, x)} className="btn-ghost !text-[10px] !px-2 !py-1">→ {t.split(" ")[0]}</button>)}</div>
              </div>))}</div>
          </div>))}</div></>}
    </div>
  );
}
