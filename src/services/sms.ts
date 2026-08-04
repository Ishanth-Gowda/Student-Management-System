import { supabase } from "@/integrations/supabase/client";
import type { ActivityLog, Department, Student, StudentFilters } from "@/types";

const STUDENT_SELECT = "*, departments(id, name, code)";

export async function logActivity(action: string, description: string, entityType?: string, entityId?: string) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("activity_logs").insert({
    user_id: data.user.id,
    actor_name: data.user.email,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    description,
  });
}

/* ------------------------------- Departments ------------------------------ */

export async function listDepartments(): Promise<Department[]> {
  const { data, error } = await supabase.from("departments").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Department[];
}

export async function createDepartment(payload: { name: string; code: string; description?: string }) {
  const { data, error } = await supabase.from("departments").insert(payload).select().single();
  if (error) throw error;
  await logActivity("department_created", `Department "${payload.name}" created`, "department", data.id);
  return data as Department;
}

export async function updateDepartment(id: string, payload: Partial<Department>) {
  const { data, error } = await supabase.from("departments").update(payload).eq("id", id).select().single();
  if (error) throw error;
  await logActivity("department_updated", `Department "${data.name}" updated`, "department", id);
  return data as Department;
}

export async function deleteDepartment(id: string, name: string) {
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) throw error;
  await logActivity("department_deleted", `Department "${name}" deleted`, "department", id);
}

/* -------------------------------- Students -------------------------------- */

export async function listStudents(filters: StudentFilters = {}) {
  const {
    search = "",
    departmentId = "",
    status = "",
    gender = "",
    year = "",
    sortBy = "created_at",
    sortDir = "desc",
    page = 1,
    pageSize = 10,
  } = filters;

  let query = supabase.from("students").select(STUDENT_SELECT, { count: "exact" }).is("deleted_at", null);

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      [
        `first_name.ilike.${term}`,
        `last_name.ilike.${term}`,
        `email.ilike.${term}`,
        `phone.ilike.${term}`,
        `student_id.ilike.${term}`,
        `roll_number.ilike.${term}`,
      ].join(","),
    );
  }
  if (departmentId) query = query.eq("department_id", departmentId);
  if (status) query = query.eq("status", status);
  if (gender) query = query.eq("gender", gender);
  if (year) query = query.eq("year", Number(year));

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order(sortBy, { ascending: sortDir === "asc" })
    .range(from, from + pageSize - 1);

  if (error) throw error;
  return { rows: (data ?? []) as Student[], total: count ?? 0 };
}

export async function getStudent(id: string): Promise<Student | null> {
  const { data, error } = await supabase.from("students").select(STUDENT_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Student) ?? null;
}

export async function getStudentByUserId(userId: string): Promise<Student | null> {
  const { data, error } = await supabase.from("students").select(STUDENT_SELECT).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data as Student) ?? null;
}

export async function generateStudentId(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .like("student_id", `STU${year}%`);
  return `STU${year}${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export async function isEmailTaken(email: string, excludeId?: string) {
  let query = supabase.from("students").select("id").ilike("email", email.trim());
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;
  return (data ?? []).length > 0;
}

export async function createStudent(payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("students").insert(payload as never).select().single();
  if (error) throw error;
  await logActivity("student_created", `Student ${data.first_name} ${data.last_name} added`, "student", data.id);
  return data as Student;
}

export async function updateStudent(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("students").update(payload as never).eq("id", id).select().single();
  if (error) throw error;
  await logActivity("student_updated", `Student ${data.first_name} ${data.last_name} updated`, "student", id);
  return data as Student;
}

export async function softDeleteStudent(id: string, name: string) {
  const { error } = await supabase.from("students").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  await logActivity("student_deleted", `Student ${name} deleted`, "student", id);
}

export async function bulkSoftDelete(ids: string[]) {
  const { error } = await supabase.from("students").update({ deleted_at: new Date().toISOString() }).in("id", ids);
  if (error) throw error;
  await logActivity("student_deleted", `${ids.length} students deleted`, "student");
}

/* ------------------------------- Activity -------------------------------- */

export async function listActivity(limit = 10): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ActivityLog[];
}

/* ------------------------------- Dashboard -------------------------------- */

export interface DashboardStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
  departments: number;
  courses: number;
  byMonth: { month: string; count: number }[];
  byGender: { name: string; value: number }[];
  byDepartment: { name: string; count: number }[];
  recent: Student[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [{ data: students, error }, departments] = await Promise.all([
    supabase.from("students").select(STUDENT_SELECT).is("deleted_at", null),
    listDepartments(),
  ]);
  if (error) throw error;

  const rows = (students ?? []) as Student[];
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const monthLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleString("en", { month: "short" }) };
  });

  const byMonth = monthLabels.map(({ key, month }) => ({
    month,
    count: rows.filter((s) => {
      const d = new Date(s.created_at);
      return `${d.getFullYear()}-${d.getMonth()}` === key;
    }).length,
  }));

  const genders = ["Male", "Female", "Other"];
  const byGender = genders
    .map((g) => ({ name: g, value: rows.filter((s) => s.gender === g).length }))
    .filter((g) => g.value > 0);

  const byDepartment = departments.map((d) => ({
    name: d.code,
    count: rows.filter((s) => s.department_id === d.id).length,
  }));

  return {
    total: rows.length,
    active: rows.filter((s) => s.status === "Active").length,
    inactive: rows.filter((s) => s.status === "Inactive").length,
    newThisMonth: rows.filter((s) => new Date(s.created_at) >= startOfMonth).length,
    departments: departments.length,
    courses: new Set(rows.map((s) => s.course).filter(Boolean)).size,
    byMonth,
    byGender,
    byDepartment,
    recent: [...rows].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 5),
  };
}

/* --------------------------------- Upload -------------------------------- */

export async function uploadAvatar(file: File, folder: string) {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}
