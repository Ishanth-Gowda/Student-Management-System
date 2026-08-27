-- 1. Expand roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'faculty';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';