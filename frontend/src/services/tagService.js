import { apiClient, ApiClientError } from "../lib/apiClient";

// tag_id belum pernah dibuat sama sekali (koleksi Tag kosong) juga dianggap
// "not_registered" di level UI, sama seperti tag ada tapi belum punya korban aktif.
export async function scanTag(tagId) {
  try {
    return await apiClient.post(`/api/tags/${encodeURIComponent(tagId)}/scan`);
  } catch (err) {
    if (err instanceof ApiClientError && err.code === "TAG_NOT_FOUND") {
      return { status: "not_registered", tag_id: tagId };
    }
    throw err;
  }
}
