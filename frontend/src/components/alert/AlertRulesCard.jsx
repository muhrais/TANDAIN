import { ALERT_TYPES } from "../../lib/alert";

export default function AlertRulesCard({ className = "" }) {
  return (
    <div className={`flex flex-col rounded-2xl bg-white p-5 shadow-sm ${className}`}>
      <h3 className="mb-2 font-semibold text-ink">Ambang Batas Alert</h3>
      <ul className="divide-y divide-black/5">
        {Object.entries(ALERT_TYPES).map(([key, type]) => {
          const Icon = type.icon;
          return (
            <li key={key} className="flex items-center gap-3 py-2">
              <Icon size={16} strokeWidth={1.75} className="shrink-0 text-muted" />
              <div className="min-w-0 leading-tight">
                <div className="text-sm text-ink/80">{type.label}</div>
                <div className="mt-0.5 text-xs font-semibold text-muted">{type.rule}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
