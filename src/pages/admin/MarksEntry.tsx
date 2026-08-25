import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BsArrowLeft, BsPlusLg, BsSave, BsTrash } from "react-icons/bs";
import { toast } from "sonner";
import { EmptyState, Loader } from "@/components/common/Feedback";
import { gradeFor, getExam, listMarksForExam, saveMarks, gpaOf, round2 } from "@/services/marks";
import type { MarkInput } from "@/services/marks";
import { listStudents } from "@/services/sms";
import type { Exam, Mark, Student } from "@/types";

interface SubjectColumn {
  name: string;
  code: string;
  credits: number;
}

/** key = `${studentId}::${subjectName}` */
type ScoreMap = Record<string, string>;

export default function MarksEntry() {
  const { id = "" } = useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<SubjectColumn[]>([]);
  const [scores, setScores] = useState<ScoreMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: "", code: "", credits: "4" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const examRow = await getExam(id);
      if (!examRow) {
        setExam(null);
        return;
      }
      setExam(examRow);
      const [{ rows }, marks] = await Promise.all([
        listStudents({
          departmentId: examRow.department_id ?? "",
          status: "Active",
          pageSize: 300,
          sortBy: "first_name",
          sortDir: "asc",
        }),
        listMarksForExam(id),
      ]);
      const filtered = examRow.semester ? rows.filter((s) => s.semester === examRow.semester) : rows;
      setStudents(filtered);

      const cols = new Map<string, SubjectColumn>();
      const nextScores: ScoreMap = {};
      for (const m of marks as Mark[]) {
        cols.set(m.subject_name, {
          name: m.subject_name,
          code: m.subject_code ?? "",
          credits: Number(m.credits ?? 4),
        });
        nextScores[`${m.student_id}::${m.subject_name}`] =
          m.marks_obtained === null ? "" : String(m.marks_obtained);
      }
      setSubjects(Array.from(cols.values()));
      setScores(nextScores);
    } catch {
      toast.error("Could not load marks");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const maxMarks = exam?.max_marks ?? 100;

  const addSubject = () => {
    const name = newSubject.name.trim();
    if (!name) {
      toast.error("Enter a subject name");
      return;
    }
    if (subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error("That subject is already added");
      return;
    }
    setSubjects([...subjects, { name, code: newSubject.code.trim(), credits: Number(newSubject.credits) || 4 }]);
    setNewSubject({ name: "", code: "", credits: "4" });
  };

  const removeSubject = (name: string) => {
    setSubjects(subjects.filter((s) => s.name !== name));
  };

  const rowSummary = (studentId: string) => {
    const entered = subjects
      .map((s) => ({ subject: s, raw: scores[`${studentId}::${s.name}`] }))
      .filter((x) => x.raw !== undefined && x.raw !== "");
    if (entered.length === 0) return null;
    const results = entered.map(({ subject, raw }) => {
      const percentage = maxMarks ? round2((Number(raw) / maxMarks) * 100) : 0;
      const { grade, point } = gradeFor(percentage);
      return {
        subject: subject.name,
        obtained: Number(raw),
        max: maxMarks,
        percentage,
        grade,
        point,
        credits: subject.credits,
      };
    });
    const obtained = results.reduce((s, r) => s + r.obtained, 0);
    const total = results.length * maxMarks;
    return {
      total: round2(obtained),
      max: total,
      percentage: total ? round2((obtained / total) * 100) : 0,
      gpa: gpaOf(results),
    };
  };

  const invalid = useMemo(
    () =>
      Object.values(scores).some((v) => {
        if (v === "") return false;
        const n = Number(v);
        return Number.isNaN(n) || n < 0 || n > maxMarks;
      }),
    [scores, maxMarks],
  );

  const handleSave = async () => {
    if (invalid) {
      toast.error(`Marks must be between 0 and ${maxMarks}`);
      return;
    }
    const entries: MarkInput[] = [];
    for (const student of students) {
      for (const subject of subjects) {
        const raw = scores[`${student.id}::${subject.name}`];
        if (raw === undefined || raw === "") continue;
        entries.push({
          student_id: student.id,
          subject_name: subject.name,
          subject_code: subject.code || null,
          credits: subject.credits,
          marks_obtained: Number(raw),
          max_marks: maxMarks,
        });
      }
    }
    if (entries.length === 0) {
      toast.error("Enter at least one mark");
      return;
    }
    setSaving(true);
    try {
      await saveMarks(id, entries);
      toast.success(`Saved ${entries.length} mark entr${entries.length === 1 ? "y" : "ies"}`);
      await load();
    } catch {
      toast.error("Could not save marks");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader label="Loading marks sheet…" />;
  if (!exam)
    return (
      <EmptyState
        title="Examination not found"
        message="It may have been deleted."
        action={
          <Link className="btn btn-primary btn-sm" to="/exams">
            Back to examinations
          </Link>
        }
      />
    );

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <Link className="btn btn-link btn-sm px-0 mb-1" to="/exams">
            <BsArrowLeft className="me-1" />
            Examinations
          </Link>
          <h1 className="h4 fw-semibold mb-1">{exam.title}</h1>
          <p className="text-secondary small mb-0">
            {exam.exam_type} · {exam.departments?.name ?? "All departments"}
            {exam.semester ? ` · Semester ${exam.semester}` : ""} · Max {maxMarks} per subject
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || subjects.length === 0}>
          <BsSave className="me-2" />
          {saving ? "Saving…" : "Save marks"}
        </button>
      </div>

      <div className="card sms-card mb-3">
        <div className="card-body row g-3 align-items-end">
          <div className="col-12 col-lg-4">
            <label className="form-label small fw-semibold" htmlFor="sub-name">
              Subject name
            </label>
            <input
              id="sub-name"
              className="form-control form-control-sm"
              value={newSubject.name}
              onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
              placeholder="Data Structures"
            />
          </div>
          <div className="col-6 col-lg-3">
            <label className="form-label small fw-semibold" htmlFor="sub-code">
              Subject code
            </label>
            <input
              id="sub-code"
              className="form-control form-control-sm"
              value={newSubject.code}
              onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
              placeholder="CS201"
            />
          </div>
          <div className="col-6 col-lg-2">
            <label className="form-label small fw-semibold" htmlFor="sub-credits">
              Credits
            </label>
            <input
              id="sub-credits"
              type="number"
              min={1}
              max={10}
              className="form-control form-control-sm"
              value={newSubject.credits}
              onChange={(e) => setNewSubject({ ...newSubject, credits: e.target.value })}
            />
          </div>
          <div className="col-12 col-lg-3">
            <button className="btn btn-outline-primary btn-sm w-100" onClick={addSubject}>
              <BsPlusLg className="me-1" />
              Add subject
            </button>
          </div>
        </div>
      </div>

      {subjects.length === 0 ? (
        <EmptyState title="No subjects yet" message="Add subjects above to build the marks sheet." />
      ) : students.length === 0 ? (
        <EmptyState
          title="No matching students"
          message="No active students match this examination's department and semester."
        />
      ) : (
        <div className="card sms-card">
          <div className="table-responsive">
            <table className="table table-hover table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Student</th>
                  {subjects.map((s) => (
                    <th key={s.name} style={{ minWidth: 120 }}>
                      <div className="d-flex align-items-center gap-1">
                        <span>
                          {s.name}
                          <span className="text-secondary fw-normal"> ({s.credits}cr)</span>
                        </span>
                        <button
                          className="btn btn-link btn-sm text-danger p-0"
                          onClick={() => removeSubject(s.name)}
                          title={`Remove ${s.name}`}
                          aria-label={`Remove ${s.name}`}
                        >
                          <BsTrash />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th>Total</th>
                  <th>%</th>
                  <th>GPA</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const summary = rowSummary(student.id);
                  return (
                    <tr key={student.id}>
                      <td>
                        <div className="fw-semibold">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-secondary small">{student.student_id}</div>
                      </td>
                      {subjects.map((s) => {
                        const key = `${student.id}::${s.name}`;
                        const value = scores[key] ?? "";
                        const bad = value !== "" && (Number(value) < 0 || Number(value) > maxMarks);
                        return (
                          <td key={s.name}>
                            <input
                              type="number"
                              min={0}
                              max={maxMarks}
                              className={`form-control form-control-sm ${bad ? "is-invalid" : ""}`}
                              value={value}
                              aria-label={`${s.name} marks for ${student.first_name} ${student.last_name}`}
                              onChange={(e) => setScores({ ...scores, [key]: e.target.value })}
                            />
                          </td>
                        );
                      })}
                      <td className="small">{summary ? `${summary.total}/${summary.max}` : "—"}</td>
                      <td className="small">{summary ? `${summary.percentage}%` : "—"}</td>
                      <td className="small fw-semibold">{summary ? summary.gpa : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
