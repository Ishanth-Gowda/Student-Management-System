-- helper: current user's email
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated;

-- allow students to see a record created with their email even if not linked yet
CREATE POLICY "Students view record by email"
ON public.students
FOR SELECT
TO authenticated
USING (user_id IS NULL AND lower(email) = lower(public.current_user_email()));

-- self-service link of the signed-in user to their student record
CREATE OR REPLACE FUNCTION public.link_my_student_record()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _email text;
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO _id FROM public.students
  WHERE user_id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;

  IF _id IS NOT NULL THEN
    RETURN _id;
  END IF;

  UPDATE public.students
  SET user_id = auth.uid()
  WHERE user_id IS NULL
    AND deleted_at IS NULL
    AND lower(email) = lower(_email)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_my_student_record() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_my_student_record() TO authenticated;

-- auto-link on insert/update when an account already exists for that email
CREATE OR REPLACE FUNCTION public.link_student_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT id INTO NEW.user_id FROM auth.users WHERE lower(email) = lower(NEW.email) LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_students_link_user ON public.students;
CREATE TRIGGER trg_students_link_user
BEFORE INSERT OR UPDATE OF email ON public.students
FOR EACH ROW EXECUTE FUNCTION public.link_student_to_user();

-- backfill existing unlinked records
UPDATE public.students s
SET user_id = u.id
FROM auth.users u
WHERE s.user_id IS NULL AND lower(s.email) = lower(u.email);