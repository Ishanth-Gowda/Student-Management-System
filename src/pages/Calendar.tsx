import { useEffect, useMemo, useState } from "react";
import { BsChevronLeft, BsChevronRight, BsPencil, BsPlus, BsTrash } from "react-icons/bs";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CardSkeleton, EmptyState } from "@/components/common/Feedback";
import { useAuth } from "@/contexts/AuthContext";
import { listDepartments } from "@/services/sms";
import { createCalendarEvent, deleteCalendarEvent, listCalendarEvents, updateCalendarEvent } from "@/services/notices";
import type { CalendarEvent, Department } from "@/types";

const TYPES = ["Event", "Examination", "Assignment", "Holiday", "Reminder", "Meeting"];

const typeClass = (t: string) =>
  t === "Examination"
    ? "bg-danger-subtle text-danger-emphasis"
    : t === "Holiday"
      ? "bg-success-subtle text-success-emphasis"
      : t === "Assignment"
        ? "bg-warning-subtle text-warning-emphasis"
        : "bg-primary-subtle text-primary-emphasis";

const schema = z.object({
  title: z.string().trim().min(2, "Title is required").max(160),
  event_type: z.string().min(1),
  start_date: z.string().min(1, "Start date is required"),
});

const iso = (d: Date) => d.toISOString().slice(0, 10);
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "super_admin";

  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CalendarEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "Event",
    start_date: iso(new Date()),
    end_date: "",
    start_time: "",
    department_id: "",
  });

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const monthEnd = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor]);

  const load = () => {
    setLoading(true);
    listCalendarEvents({ from: iso(monthStart), to: iso(monthEnd) })
      .then(setEvents)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load calendar"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [monthStart, monthEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (canManage) listDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, [canManage]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const key = e.start_date;
      map.set(key, [...(map.get(key) ?? []), e]);
    });
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const lead = (monthStart.getDay() + 6) % 7; // Monday-first
    const days: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= monthEnd.getDate(); d++) days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [cursor, monthStart, monthEnd]);

  const openNew = (date?: string) => {
    setEditing(null);
    setErrors({});
    setForm({
      title: "",
      description: "",
      event_type: "Event",
      start_date: date ?? iso(new Date()),
      end_date: "",
      start_time: "",
      department_id: "",
    });
    setShowForm(true);
  };

  const openEdit = (e: CalendarEvent) => {
    setEditing(e);
    setErrors({});
    setForm({
      title: e.title,
      description: e.description ?? "",
      event_type: e.event_type,
      start_date: e.start_date,
      end_date: e.end_date ?? "",
      start_time: e.start_time ?? "",
      department_id: e.department_id ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const payload = {
        title: parsed.data.title,
        event_type: parsed.data.event_type,
        start_date: parsed.data.start_date,
        description: form.description || null,
        end_date: form.end_date || null,
        start_time: form.start_time || null,
        all_day: !form.start_time,
        department_id: form.department_id || null,
      };
      if (editing) {
        await updateCalendarEvent(editing.id, payload);
        toast.success("Event updated");
      } else {
        await createCalendarEvent(payload);
        toast.success("Event added");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await deleteCalendarEvent(pendingDelete.id, pendingDelete.title);
      toast.success("Event removed");
      setPendingDelete(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const todayKey = iso(new Date());
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h4 fw-semibold mb-1">Academic calendar</h1>
          <p className="text-secondary small mb-0">Exams, deadlines, holidays and events</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="btn-group btn-group-sm" role="group" aria-label="Change month">
            <button
              className="btn btn-outline-secondary"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              <BsChevronLeft />
            </button>
            <button className="btn btn-outline-secondary" onClick={() => setCursor(new Date())}>
              Today
            </button>
            <button
              className="btn btn-outline-secondary"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              <BsChevronRight />
            </button>
          </div>
          {canManage && (
            <button className="btn btn-primary btn-sm" onClick={() => openNew()}>
              <BsPlus className="me-1" /> Add event
            </button>
          )}
        </div>
      </div>

      {showForm && canManage && (
        <div className="card sms-card mb-3">
          <div className="card-header bg-transparent fw-semibold">{editing ? "Edit event" : "New event"}</div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="card-body row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label small" htmlFor="ev-title">
                  Title
                </label>
                <input
                  id="ev-title"
                  className={`form-control ${errors.title ? "is-invalid" : ""}`}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                {errors.title && <div className="invalid-feedback">{errors.title}</div>}
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small" htmlFor="ev-type">
                  Type
                </label>
                <select id="ev-type" className="form-select" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small" htmlFor="ev-dept">
                  Department (optional)
                </label>
                <select id="ev-dept" className="form-select" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">All departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="ev-start">
                  Start date
                </label>
                <input
                  id="ev-start"
                  type="date"
                  className={`form-control ${errors.start_date ? "is-invalid" : ""}`}
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
                {errors.start_date && <div className="invalid-feedback">{errors.start_date}</div>}
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="ev-end">
                  End date (optional)
                </label>
                <input id="ev-end" type="date" className="form-control" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small" htmlFor="ev-time">
                  Time (optional)
                </label>
                <input id="ev-time" type="time" className="form-control" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="col-12">
                <label className="form-label small" htmlFor="ev-desc">
                  Description
                </label>
                <textarea id="ev-desc" rows={2} className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="card-footer bg-transparent d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                {busy && <span className="spinner-border spinner-border-sm me-2" />}
                {editing ? "Save changes" : "Add event"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-xl-8">
          <div className="card sms-card h-100">
            <div className="card-header bg-transparent fw-semibold">{monthLabel}</div>
            <div className="card-body">
              {loading ? (
                <CardSkeleton height={320} />
              ) : (
                <div className="d-grid" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
                  {WEEKDAYS.map((w) => (
                    <div key={w} className="text-secondary small text-center fw-medium">
                      {w}
                    </div>
                  ))}
                  {cells.map((d, i) => {
                    if (!d) return <div key={`empty-${i}`} />;
                    const key = iso(d);
                    const dayEvents = byDate.get(key) ?? [];
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`btn btn-sm text-start border rounded-3 p-2 ${key === todayKey ? "border-primary" : "border-body-secondary"}`}
                        style={{ minHeight: 78 }}
                        onClick={() => canManage && openNew(key)}
                        aria-label={`${d.toDateString()}, ${dayEvents.length} events`}
                      >
                        <div className={`small fw-semibold mb-1 ${key === todayKey ? "text-primary" : ""}`}>{d.getDate()}</div>
                        {dayEvents.slice(0, 2).map((e) => (
                          <div key={e.id} className={`badge w-100 text-truncate d-block mb-1 ${typeClass(e.event_type)}`}>
                            {e.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && <div className="text-secondary small">+{dayEvents.length - 2} more</div>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="card sms-card h-100">
            <div className="card-header bg-transparent fw-semibold">Events this month</div>
            <div className="list-group list-group-flush">
              {!loading && events.length === 0 && <EmptyState title="No events" message="Nothing scheduled for this month." />}
              {events.map((e) => (
                <div key={e.id} className="list-group-item d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <div className="fw-medium small">{e.title}</div>
                    <div className="text-secondary small">
                      {new Date(e.start_date).toLocaleDateString()}
                      {e.start_time ? ` · ${e.start_time}` : ""}
                      {e.departments ? ` · ${e.departments.code}` : ""}
                    </div>
                    <span className={`badge mt-1 ${typeClass(e.event_type)}`}>{e.event_type}</span>
                  </div>
                  {canManage && (
                    <div className="text-nowrap">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(e)} aria-label={`Edit ${e.title}`}>
                        <BsPencil />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setPendingDelete(e)} aria-label={`Delete ${e.title}`}>
                        <BsTrash />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete event"
        message={`Remove "${pendingDelete?.title}" from the calendar?`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
