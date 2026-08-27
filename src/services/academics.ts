import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/services/sms";
import type { Course, Faculty, Subject } from "@/types";

/* --------------------------------- Faculty -------------------------------- */

const FACULTY_SELECT = "*, departments(id, name, code)";

export async function listFaculty(filters: { search?: string; departmentId?: string; status?: string } = {}) {
  let query = supabase.from("faculty").select(FACULTY_SELECT).is("deleted_at", null).order("created_at", { ascending: false });

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      [`first_name.ilike.${term}`, `last_name.ilike.${term}`, `email.ilike.${term}`, `employee_id.ilike.${term}`].join(","),
    );
  }
  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Faculty[];
}

export async function generateEmployeeId(): Promise<string> {
  const { count } = await supabase.from("faculty").select("id", { count: "exact", head: true });
  return `FAC${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export async function createFaculty(payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("faculty").insert(payload as never).select().single();
  if (error) throw error;
  await logActivity("faculty_created", `Faculty ${data.first_name} ${data.last_name} added`, "faculty", data.id);
  return data as unknown as Faculty;
}

export async function updateFaculty(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("faculty").update(payload as never).eq("id", id).select().single();
  if (error) throw error;
  await logActivity("faculty_updated", `Faculty ${data.first_name} ${data.last_name} updated`, "faculty", id);
  return data as unknown as Faculty;
}

export async function softDeleteFaculty(id: string, name: string) {
  const { error } = await supabase.from("faculty").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  await logActivity("faculty_deleted", `Faculty ${name} removed`, "faculty", id);
}

/* --------------------------------- Courses -------------------------------- */

export async function listCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select("*, departments(id, name, code)")
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as Course[];
}

export async function createCourse(payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("courses").insert(payload as never).select().single();
  if (error) throw error;
  await logActivity("course_created", `Course "${data.name}" created`, "course", data.id);
  return data as unknown as Course;
}

export async function updateCourse(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("courses").update(payload as never).eq("id", id).select().single();
  if (error) throw error;
  await logActivity("course_updated", `Course "${data.name}" updated`, "course", id);
  return data as unknown as Course;
}

export async function deleteCourse(id: string, name: string) {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
  await logActivity("course_deleted", `Course "${name}" deleted`, "course", id);
}

/* -------------------------------- Subjects -------------------------------- */

const SUBJECT_SELECT = "*, departments(id, name, code), courses(id, name, code), faculty(id, first_name, last_name)";

export async function listSubjects(filters: { departmentId?: string; semester?: string; search?: string } = {}) {
  let query = supabase.from("subjects").select(SUBJECT_SELECT).order("code");
  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.semester) query = query.eq("semester", Number(filters.semester));
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or([`name.ilike.${term}`, `code.ilike.${term}`].join(","));
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Subject[];
}

export async function createSubject(payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("subjects").insert(payload as never).select().single();
  if (error) throw error;
  await logActivity("subject_created", `Subject "${data.name}" created`, "subject", data.id);
  return data as unknown as Subject;
}

export async function updateSubject(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("subjects").update(payload as never).eq("id", id).select().single();
  if (error) throw error;
  await logActivity("subject_updated", `Subject "${data.name}" updated`, "subject", id);
  return data as unknown as Subject;
}

export async function deleteSubject(id: string, name: string) {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
  await logActivity("subject_deleted", `Subject "${name}" deleted`, "subject", id);
}
