import { useEffect, useState } from "react";
import ActivityTimelineCard from "./ActivityTimelineCard";
import BreakdownCard from "../common/BreakdownCard";
import { getActivities } from "../../services/activityService";
import { STATUS_ORDER, STATUS_LABEL, SOURCE_LABEL } from "../../lib/activity";

export default function ActivityTab() {
  const [activities, setActivities] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getActivities().then((result) => {
      if (!cancelled) setActivities(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!activities) {
    return <div className="text-sm text-muted">Memuat aktivitas...</div>;
  }

  const byStatus = STATUS_ORDER.map((status) => ({
    label: STATUS_LABEL[status],
    count: activities.filter((a) => a.status_baru === status).length,
  }));

  const bySource = Object.entries(SOURCE_LABEL)
    .map(([key, label]) => ({
      label,
      count: activities.filter((a) => a.sumber === key).length,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      <ActivityTimelineCard activities={activities} className="xl:col-span-8" />

      <div className="grid grid-rows-2 gap-5 xl:col-span-4">
        <BreakdownCard title="Ringkasan Aktivitas" items={byStatus} />
        <BreakdownCard title="Sumber Aktivitas" items={bySource} />
      </div>
    </div>
  );
}
