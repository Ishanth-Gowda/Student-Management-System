CREATE TABLE public.exams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  exam_type text NOT NULL DEFAULT 'Semester',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  semester integer,
  academic_year text,
  exam_date date,
  max_marks integer NOT NULL DEFAULT 100,
  published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage exams" ON public.exams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Exams readable" ON public.exams FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_exams_updated BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.marks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  subject_code text,
  credits numeric NOT NULL DEFAULT 4,
  marks_obtained numeric,
  max_marks integer NOT NULL DEFAULT 100,
  remarks text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id, subject_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marks TO authenticated;
GRANT ALL ON public.marks TO service_role;

ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marks" ON public.marks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own published marks" ON public.marks FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = marks.student_id AND s.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.exams e WHERE e.id = marks.exam_id AND e.published)
  );

CREATE TRIGGER trg_marks_updated BEFORE UPDATE ON public.marks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_marks_student ON public.marks(student_id);
CREATE INDEX idx_marks_exam ON public.marks(exam_id);