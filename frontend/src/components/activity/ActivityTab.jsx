import ActivityTimelineCard from "./ActivityTimelineCard";
import BreakdownCard from "../common/BreakdownCard";
import { STATUS_ORDER, STATUS_LABEL } from "../../lib/activity";

const TRIASE_LABEL = { merah: "Merah", kuning: "Kuning", hijau: "Hijau" };

export default function ActivityTab({ activities }) {
  const byStatus = STATUS_ORDER.map((status) => ({
    label: STATUS_LABEL[status],
    count: activities.filter((a) => a.status_baru === status).length,
  }));

  const byTriase = Object.entries(TRIASE_LABEL).map(([key, label]) => ({
    label,
    count: activities.filter((a) => a.kategori_triase === key).length,
  }));

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      <ActivityTimelineCard activities={activities} className="xl:col-span-8" />

      <div className="grid grid-rows-2 gap-5 xl:col-span-4">
        <BreakdownCard title="Ringkasan Aktivitas" items={byStatus} />
        <BreakdownCard title="Berdasarkan Kategori Triase" items={byTriase} />
      </div>
    </div>
  );
}
