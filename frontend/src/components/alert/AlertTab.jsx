import AlertListCard from "./AlertListCard";
import AlertRulesCard from "./AlertRulesCard";
import BreakdownCard from "../common/BreakdownCard";
import { ALERT_TYPES } from "../../lib/alert";

export default function AlertTab({ alerts, onResolve }) {
  const byType = Object.entries(ALERT_TYPES).map(([key, type]) => ({
    label: type.label,
    count: alerts.filter((a) => a.jenis === key).length,
  }));

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      <AlertListCard alerts={alerts} onResolve={onResolve} className="xl:col-span-8" />

      <div className="grid grid-rows-2 gap-5 xl:col-span-4">
        <BreakdownCard title="Alert per Jenis" items={byType} />
        <AlertRulesCard />
      </div>
    </div>
  );
}
