import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/services/sms";
import type { Exam, ExamResult, GradePoint, Mark, SubjectResult } from "@/types";

export const EXAM_TYPES = ["Internal", "Midterm", "Semester", "Practical", "Assignment"] as const;

const EXAM_SELECT = "*, departments(id, name, code)";

/* --------------------------------- Grading -------------------------------- */

/** 10-point grading scale used across dashboards and report cards. */
export function gradeFor(percentage: number): GradePoint {
  if (percentage >= 90) return { grade: "O", point: 10 };
  if (percentage >= 80) return { grade: "A+", point: 9 };
  if (percentage >= 70) return { grade: "A", point: 8 };
  if (percentage >= 60) return { grade: "B+", point: 7 };
  if (percentage >= 50) return { grade: "B", point: 6 };
  if (percentage >= 40) return { grade: "C", point: 5 };
  return { grade: "F", point: 0 };
}

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/** Credit-weighted GPA for a set of subject results. */
export function gpaOf(subjects: SubjectResult[]) {
  const credits = subjects.reduce((sum, s) => sum + (s.credits || 0), 0);
  if (!credits) return 0;
  return round2(subjects.reduce((sum, s) => sum + s.point * (s.credits || 0), 0) / credits);
}

export function toSubjectResult(mark: Mark): SubjectResult {
  const obtained = Number(mark.marks_obtained ?? 0);
  const max = Number(mark.max_marks || 100);
  const percentage = max ? round2((obtained / max) * 100) : 0;
  const { grade, point } = gradeFor(percentage);
  return {
    subject: mark.subject_name,
    obtained,
    max,
    percentage,
    grade,
    point,
    credits: Number(mark.credits || 0),
  };
}

/** Groups a student's marks into per-exam results with GPA, plus overall CGPA. */
export function buildResults(marks: Mark[]): { results: ExamResult[]; cgpa: number } {
  const byExam = new Map<string, Mark[]>();
  for (const m of marks) {
    if (!m.exams) continue;
    byExam.set(m.exam_id, [...(byExam.get(m.exam_id) ?? []), m]);
  }

  const results: ExamResult[] = Array.from(byExam.values())
    .map((rows) => {
      const subjects = rows.map(toSubjectResult);
      const totalObtained = subjects.reduce((s, x) => s + x.obtained, 0);
      const totalMax = subjects.reduce((s, x) => s + x.max, 0);
      return {
        exam: rows[0].exams as Exam,
        subjects,
        totalObtained: round2(totalObtained),
        totalMax,
        percentage: totalMax ? round2((totalObtained / totalMax) * 100) : 0,
        gpa: gpaOf(subjects),
      };
    })
    .sort((a, b) => +new Date(b.exam.exam_date ?? b.exam.created_at) - +new Date(a.exam.exam_date ?? a.exam.created_at));

  const allSubjects = results.flatMap((r) => r.subjects);
  return { results, cgpa: gpaOf(allSubjects) };
}

/* ---------------------------------- Exams --------------------------------- */

export async function listExams(): Promise<Exam[]> {
  const { data, error } = await supabase
    .from("exams")
    .select(EXAM_SELECT)
    .order("exam_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Exam[];
}

export async function getExam(id: string): Promise<Exam | null> {
  const { data, error } = await supabase.from("exams").select(EXAM_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Exam) ?? null;
}

export async function createExam(payload: Record<string, unknown>) {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("exams")
    .insert({ ...payload, created_by: auth.user?.id ?? null } as never)
    .select()
    .single();
  if (error) throw error;
  await logActivity("exam_created", `Exam "${data.title}" created`, "exam", data.id);
  return data as Exam;
}

export async function updateExam(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("exams").update(payload as never).eq("id", id).select().single();
  if (error) throw error;
  await logActivity("exam_updated", `Exam "${data.title}" updated`, "exam", id);
  return data as Exam;
}

export async function setExamPublished(id: string, published: boolean) {
  const { data, error } = await supabase.from("exams").update({ published }).eq("id", id).select().single();
  if (error) throw error;
  await logActivity(
    published ? "results_published" : "results_unpublished",
    `Results for "${data.title}" ${published ? "published" : "hidden"}`,
    "exam",
    id,
  );
  return data as Exam;
}

export async function deleteExam(id: string, title: string) {
  const { error } = await supabase.from("exams").delete().eq("id", id);
  if (error) throw error;
  await logActivity("exam_deleted", `Exam "${title}" deleted`, "exam", id);
}

/* ---------------------------------- Marks --------------------------------- */

export async function listMarksForExam(examId: string): Promise<Mark[]> {
  const { data, error } = await supabase.from("marks").select("*").eq("exam_id", examId);
  if (error) throw error;
  return (data ?? []) as Mark[];
}

export async function listMarksForStudent(studentId: string): Promise<Mark[]> {
  const { data, error } = await supabase
    .from("marks")
    .select(`*, exams(${EXAM_SELECT})`)
    .eq("student_id", studentId);
  if (error) throw error;
  return (data ?? []) as Mark[];
}

export interface MarkInput {
  student_id: string;
  subject_name: string;
  subject_code?: string | null;
  credits: number;
  marks_obtained: number | null;
  max_marks: number;
  remarks?: string | null;
}

export async function saveMarks(examId: string, entries: MarkInput[]) {
  if (entries.length === 0) return;
  const payload = entries.map((e) => ({
    exam_id: examId,
    student_id: e.student_id,
    subject_name: e.subject_name,
    subject_code: e.subject_code ?? null,
    credits: e.credits,
    marks_obtained: e.marks_obtained,
    max_marks: e.max_marks,
    remarks: e.remarks ?? null,
  }));
  const { error } = await supabase.from("marks").upsert(payload, { onConflict: "exam_id,student_id,subject_name" });
  if (error) throw error;
  await logActivity("marks_saved", `Marks saved for ${entries.length} entr(ies)`, "exam", examId);
}

export async function deleteMark(id: string) {
  const { error } = await supabase.from("marks").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteMarksForExamStudent(examId: string, studentId: string) {
  const { error } = await supabase.from("marks").delete().eq("exam_id", examId).eq("student_id", studentId);
  if (error) throw error;
  await logActivity("marks_deleted", "Marks removed for a student", "exam", examId);
}
