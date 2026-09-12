import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/services/sms";
import type { Announcement, CalendarEvent, Notification } from "@/types";

/* ------------------------------ Announcements ----------------------------- */

const ANN_SELECT = "*, departments(id, name, code)";

export async function listAnnouncements(filters: { search?: string; category?: string; audience?: string } = {}) {
  let query = supabase.from("announcements").select(ANN_SELECT).order("publish_at", { ascending: false });

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or([`title.ilike.${term}`, `body.ilike.${term}`, `category.ilike.${term}`].join(","));
  }
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.audience) query = query.eq("audience", filters.audience);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Announcement[];
}

export async function createAnnouncement(payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("announcements").insert(payload as never).select().single();
  if (error) throw error;
  await logActivity("announcement_created", `Notice "${data.title}" created`, "announcement", data.id);
  return data as unknown as Announcement;
}

export async function updateAnnouncement(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("announcements").update(payload as never).eq("id", id).select().single();
  if (error) throw error;
  await logActivity("announcement_updated", `Notice "${data.title}" updated`, "announcement", id);
  return data as unknown as Announcement;
}

export async function deleteAnnouncement(id: string, title: string) {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
  await logActivity("announcement_deleted", `Notice "${title}" deleted`, "announcement", id);
}

export async function toggleAnnouncementPublished(id: string, published: boolean) {
  return updateAnnouncement(id, { published });
}

/* --------------------------------- Reads ---------------------------------- */

export async function listReadAnnouncementIds() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [] as string[];
  const { data, error } = await supabase.from("announcement_reads").select("announcement_id").eq("user_id", auth.user.id);
  if (error) return [];
  return (data ?? []).map((r) => r.announcement_id as string);
}

export async function markAnnouncementRead(announcementId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase
    .from("announcement_reads")
    .upsert({ announcement_id: announcementId, user_id: auth.user.id } as never, {
      onConflict: "announcement_id,user_id",
    });
}

export async function markAllAnnouncementsRead(ids: string[]) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || ids.length === 0) return;
  await supabase
    .from("announcement_reads")
    .upsert(
      ids.map((announcement_id) => ({ announcement_id, user_id: auth.user!.id })) as never,
      { onConflict: "announcement_id,user_id" },
    );
}

/* ------------------------------ Calendar events --------------------------- */

const EVENT_SELECT = "*, departments(id, name, code)";

export async function listCalendarEvents(range?: { from?: string; to?: string }) {
  let query = supabase.from("calendar_events").select(EVENT_SELECT).order("start_date", { ascending: true });
  if (range?.from) query = query.gte("start_date", range.from);
  if (range?.to) query = query.lte("start_date", range.to);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CalendarEvent[];
}

export async function createCalendarEvent(payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("calendar_events").insert(payload as never).select().single();
  if (error) throw error;
  await logActivity("event_created", `Event "${data.title}" added to calendar`, "calendar_event", data.id);
  return data as unknown as CalendarEvent;
}

export async function updateCalendarEvent(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("calendar_events").update(payload as never).eq("id", id).select().single();
  if (error) throw error;
  await logActivity("event_updated", `Event "${data.title}" updated`, "calendar_event", id);
  return data as unknown as CalendarEvent;
}

export async function deleteCalendarEvent(id: string, title: string) {
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
  await logActivity("event_deleted", `Event "${title}" removed`, "calendar_event", id);
}

/* ------------------------------ Notifications ----------------------------- */

export async function listNotifications(limit = 10) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [] as Notification[];
  return (data ?? []) as unknown as Notification[];
}

export async function markNotificationRead(id: string) {
  await supabase.from("notifications").update({ read: true } as never).eq("id", id);
}
