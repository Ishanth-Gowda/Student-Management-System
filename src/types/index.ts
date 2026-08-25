export type AppRole = "admin" | "student";

export type StudentStatus = "Active" | "Inactive" | "Graduated" | "Dropped";

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  user_id: string | null;
  student_id: string;
  photo_url: string | null;
  first_name: string;
  last_name: string;
  gender: string | null;
  date_of_birth: string | null;
  email: string;
  phone: string | null;
  alternate_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
  department_id: string | null;
  course: string | null;
  semester: number | null;
  year: number | null;
  roll_number: string | null;
  admission_date: string | null;
  blood_group: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  emergency_contact: string | null;
  status: string;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  departments?: { id: string; name: string; code: string } | null;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentFilters {
  search?: string;
  departmentId?: string;
  status?: string;
  gender?: string;
  year?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused";

export interface Attendance {
  id: string;
  student_id: string;
  date: string;
  status: string;
  remarks: string | null;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
  students?: { id: string; first_name: string; last_name: string; student_id: string } | null;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

export type ExamType = "Internal" | "Midterm" | "Semester" | "Practical" | "Assignment";

export interface Exam {
  id: string;
  title: string;
  exam_type: string;
  department_id: string | null;
  semester: number | null;
  academic_year: string | null;
  exam_date: string | null;
  max_marks: number;
  published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  departments?: { id: string; name: string; code: string } | null;
}

export interface Mark {
  id: string;
  exam_id: string;
  student_id: string;
  subject_name: string;
  subject_code: string | null;
  credits: number;
  marks_obtained: number | null;
  max_marks: number;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  exams?: Exam | null;
}

export interface GradePoint {
  grade: string;
  point: number;
}

export interface SubjectResult {
  subject: string;
  obtained: number;
  max: number;
  percentage: number;
  grade: string;
  point: number;
  credits: number;
}

export interface ExamResult {
  exam: Exam;
  subjects: SubjectResult[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  gpa: number;
}
