export const STATUS_ORDER = ["registered", "triaged", "waiting_transfer", "in_transit", "arrived"];

export const STATUS_LABEL = {
  registered: "Registered",
  triaged: "Triaged",
  waiting_transfer: "Waiting Pickup",
  in_transit: "In Transit",
  arrived: "Arrived",
};

export const SOURCE_LABEL = {
  medical_post: "Medical Post",
  field_medic: "Field Medic",
  evac_team: "Evacuation Team",
};

export function describeActivity(activity) {
  const source = SOURCE_LABEL[activity.sumber];
  switch (activity.status_baru) {
    case "registered":
      return `Registered by ${source}`;
    case "triaged":
      return `Triaged by ${source}`;
    case "waiting_transfer":
      return `Marked Waiting Pickup by ${source}`;
    case "in_transit":
      return "Picked Up by Team";
    case "arrived":
      return `Arrived at ${activity.posko}`;
    default:
      return STATUS_LABEL[activity.status_baru];
  }
}

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

export function formatTime(iso) {
  return timeFormatter.format(new Date(iso));
}

export function formatElapsed(iso) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} mnt`;
  return `${Math.round(minutes / 60)} jam`;
}
