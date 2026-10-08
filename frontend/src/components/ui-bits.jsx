import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Sparkles, Inbox } from "lucide-react";

export const PageHeader = ({ eyebrow, title, subtitle, action, testId }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8 fade-up" data-testid={testId}>
    <div>
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-2 text-slate-600 text-base max-w-2xl">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const EmptyState = ({ icon: Icon = Inbox, title, text, action, testId = "empty-state" }) => (
  <div className="card-soft p-10 text-center fade-up" data-testid={testId}>
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Icon size={26} /></div>
    <h3 className="font-display text-lg font-bold text-slate-900">{title}</h3>
    {text && <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">{text}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="card-soft p-8 text-center border-red-100 bg-red-50/40" data-testid="error-state">
    <p className="font-semibold text-red-700">Something went wrong</p>
    <p className="text-sm text-red-600/80 mt-1">{message || "We couldn't load this right now."}</p>
    {onRetry && <button onClick={onRetry} className="btn-outline mt-4" data-testid="error-retry-btn">Try again</button>}
  </div>
);

export const SkeletonCards = ({ n = 6, h = "h-44" }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="loading-skeleton">
    {Array.from({ length: n }).map((_, i) => <div key={i} className={`skeleton ${h}`} />)}
  </div>
);

export const Stat = ({ label, value, sub, testId, accent }) => (
  <div className="card-soft p-5" data-testid={testId}>
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    <p className={`font-display mt-2 text-2xl sm:text-3xl font-extrabold ${accent || "text-slate-900"}`}>{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

export const BUCKET = {
  dream: { label: "Dream", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", ring: "stroke-rose-500" },
  target: { label: "Target", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", ring: "stroke-amber-500" },
  safe: { label: "Safe", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", ring: "stroke-emerald-500" },
};

export const BucketPill = ({ bucket, testId }) => {
  const b = BUCKET[bucket] || BUCKET.target;
  return <span className={`pill border ${b.cls}`} data-testid={testId}><span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />{b.label}</span>;
};

export const ProbRing = ({ value = 0, bucket = "target", size = 56 }) => {
  const r = (size - 8) / 2, c = 2 * Math.PI * r;
  const b = BUCKET[bucket] || BUCKET.target;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} data-testid="probability-ring">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="5" className="stroke-slate-100" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="5" className={`${b.ring} transition-[stroke-dashoffset] duration-700`} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-extrabold text-slate-900">{value}%</span>
    </div>
  );
};

export const Disclaimer = ({ text = "Predictions are estimates based on historical cutoff trends and do not guarantee admission." }) => (
  <p className="mt-6 text-xs text-slate-500 flex items-start gap-1.5" data-testid="estimate-disclaimer"><Sparkles size={13} className="mt-0.5 shrink-0 text-indigo-500" />{text}</p>
);

export const AIMarkdown = ({ text, className = "" }) => (
  <div className={`prose-ai text-sm text-slate-700 ${className}`}>
    <ReactMarkdown components={{ a: ({ href, children }) => <Link to={href || "#"} className="text-indigo-600 underline">{children}</Link> }}>
      {(text || "").replace(/\[\[college:([a-z0-9-]+)\]\]/g, "")}
    </ReactMarkdown>
  </div>
);

export const Logo = ({ text, size = "h-11 w-11 text-sm" }) => (
  <div className={`${size} shrink-0 rounded-xl bg-slate-900 text-white font-display font-bold flex items-center justify-center`}>{text}</div>
);
