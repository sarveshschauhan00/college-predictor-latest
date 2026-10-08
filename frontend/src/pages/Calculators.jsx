import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, fmtMoney } from "@/lib/api";
import { Disclaimer, PageHeader } from "@/components/ui-bits";

const Field = ({ label, k, v, set, step = 1000 }) => (
  <div><label className="label-soft">{label}</label><input type="number" step={step} value={v[k]} onChange={(e) => set(k, e.target.value)} className="input-soft font-mono" data-testid={`calc-${k}-input`} /></div>
);

export function FeesPage() {
  const loc = useLocation(); const s = loc.state || {};
  const [v, setV] = useState({ tuition: s.tuition ?? 200000, hostel: s.hostel ?? 60000, mess: s.mess ?? 42000, transport: 15000, books: 15000, other: 20000, scholarship: 0, years: 4, inflation: 5 });
  const [res, setRes] = useState(null);
  const set = (k, val) => setV((x) => ({ ...x, [k]: val }));
  useEffect(() => { const t = setTimeout(() => api.post("/fees/calculate", { ...v, inflation: Number(v.inflation) / 100 }).then((r) => setRes(r.data)), 250); return () => clearTimeout(t); }, [v]);
  return (
    <div>
      <PageHeader eyebrow="Fee calculator" title="What will college really cost?" subtitle="Add every expense and your scholarships to estimate your annual and total degree cost." />
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 card-soft p-6 grid sm:grid-cols-2 gap-4 fade-up" data-testid="fees-form">
          <Field label="Tuition (per year)" k="tuition" v={v} set={set} /><Field label="Hostel (per year)" k="hostel" v={v} set={set} /><Field label="Mess / food" k="mess" v={v} set={set} /><Field label="Transportation" k="transport" v={v} set={set} /><Field label="Books & laptop" k="books" v={v} set={set} /><Field label="Other expenses" k="other" v={v} set={set} /><Field label="Scholarships (per year)" k="scholarship" v={v} set={set} />
          <div><label className="label-soft">Course duration (years)</label><select value={v.years} onChange={(e) => set("years", e.target.value)} className="input-soft" data-testid="calc-years-select">{[2, 3, 4, 5, 5.5].map((y) => <option key={y} value={Math.ceil(y)}>{y} years</option>)}</select></div>
          <div className="sm:col-span-2"><label className="label-soft">Annual fee inflation: {v.inflation}%</label><input type="range" min={0} max={12} value={v.inflation} onChange={(e) => set("inflation", e.target.value)} className="w-full accent-indigo-600" data-testid="calc-inflation-slider" /></div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl bg-slate-900 text-white p-6 fade-up delay-1" data-testid="fees-result">
            <p className="eyebrow !text-indigo-300">Total annual cost</p><p className="font-display text-4xl font-extrabold mt-1" data-testid="fees-annual-total">{res ? fmtMoney(res.annual) : "—"}</p>
            <p className="eyebrow !text-indigo-300 mt-6">Estimated {v.years}-year cost</p><p className="font-display text-4xl font-extrabold mt-1" data-testid="fees-degree-total">{res ? fmtMoney(res.total) : "—"}</p>
            <p className="text-xs text-slate-400 mt-3">Includes {v.inflation}% yearly inflation, minus scholarships.</p>
          </div>
          {res && <div className="card-soft p-5 fade-up delay-2"><p className="font-display font-bold mb-3">Breakdown (per year)</p><ul className="space-y-1.5 text-sm">{Object.entries(res.breakdown).map(([k, val]) => <li key={k} className="flex justify-between"><span className="capitalize text-slate-600">{k}</span><span className={`font-mono ${val < 0 ? "text-emerald-700" : ""}`}>{val < 0 ? "−" : ""}{fmtMoney(Math.abs(val))}</span></li>)}</ul></div>}
          <Link to="/roi" state={{ total_cost: res?.total, avg_package: s.avg_package }} className="btn-primary w-full" data-testid="fees-go-roi-btn">Calculate ROI for this cost</Link>
        </div>
      </div>
      <Disclaimer text="Costs are estimates. Actual fees vary by institute, quota, year and scholarship outcomes." />
    </div>
  );
}

export function ROIPage() {
  const loc = useLocation(); const s = loc.state || {};
  const [v, setV] = useState({ total_cost: s.total_cost ?? 1200000, avg_package_lpa: s.avg_package ?? 8, salary_growth: 10, years: 4 });
  const [res, setRes] = useState(null);
  const set = (k, val) => setV((x) => ({ ...x, [k]: val }));
  useEffect(() => { const t = setTimeout(() => api.post("/roi/calculate", { ...v, salary_growth: Number(v.salary_growth) / 100 }).then((r) => setRes(r.data)), 250); return () => clearTimeout(t); }, [v]);
  return (
    <div>
      <PageHeader eyebrow="ROI calculator" title="College cost vs expected salary" subtitle="Compare total education cost with expected earnings to estimate payback period and an ROI score." />
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 card-soft p-6 grid sm:grid-cols-2 gap-4 fade-up" data-testid="roi-form">
          <Field label="Total education cost (₹)" k="total_cost" v={v} set={set} step={10000} /><div><label className="label-soft">Average placement (LPA)</label><input type="number" step="0.5" value={v.avg_package_lpa} onChange={(e) => set("avg_package_lpa", e.target.value)} className="input-soft font-mono" data-testid="calc-avg_package_lpa-input" /></div>
          <div className="sm:col-span-2"><label className="label-soft">Expected salary growth per year: {v.salary_growth}%</label><input type="range" min={0} max={25} value={v.salary_growth} onChange={(e) => set("salary_growth", e.target.value)} className="w-full accent-indigo-600" data-testid="roi-growth-slider" /></div>
          <Link to="/fees" className="btn-outline sm:col-span-2 w-fit">← Compute total cost in Fee Calculator</Link>
        </div>
        <div className="lg:col-span-2 space-y-4">
          {res && <div className="rounded-3xl bg-indigo-600 text-white p-6 fade-up delay-1" data-testid="roi-result">
            <div className="flex items-end justify-between"><div><p className="eyebrow !text-indigo-200">ROI score</p><p className="font-display text-5xl font-extrabold mt-1" data-testid="roi-score">{res.roi_score ?? "—"}<span className="text-lg text-indigo-200">/100</span></p></div><div className="text-right"><p className="eyebrow !text-indigo-200">Payback period</p><p className="font-display text-3xl font-extrabold mt-1" data-testid="roi-payback">{res.payback_years ?? "—"} yrs</p></div></div>
            <dl className="mt-6 space-y-2 text-sm">{[["Total education cost", fmtMoney(res.total_cost)], ["Average placement", fmtMoney(res.avg_package) + "/yr"], ["Est. take-home (year 1)", fmtMoney(res.expected_salary_year1)], ["5-year expected earnings", fmtMoney(res.five_year_earnings)]].map(([k, val]) => <div key={k} className="flex justify-between border-t border-white/15 pt-2"><dt className="text-indigo-100">{k}</dt><dd className="font-mono font-semibold">{val}</dd></div>)}</dl>
          </div>}
        </div>
      </div>
      <Disclaimer text={res?.disclaimer || "Salary and ROI are estimates."} />
    </div>
  );
}
