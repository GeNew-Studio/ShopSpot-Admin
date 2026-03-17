-- Recreate the missing RPC functions for the Applications admin page
-- Run this in Supabase Dashboard → SQL Editor for project kvonaxrmepckfhkntaas

-- 1. Get application statistics
CREATE OR REPLACE FUNCTION admin_get_stats(p_admin_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INT;
  v_pending INT;
  v_approved INT;
  v_rejected INT;
BEGIN
  IF p_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT count(*) INTO v_total FROM applications;
  SELECT count(*) INTO v_pending FROM applications WHERE status = 'pending';
  SELECT count(*) INTO v_approved FROM applications WHERE status = 'approved';
  SELECT count(*) INTO v_rejected FROM applications WHERE status = 'rejected';

  RETURN json_build_object(
    'success', true,
    'stats', json_build_object(
      'total', v_total,
      'pending', v_pending,
      'approved', v_approved,
      'rejected', v_rejected
    )
  );
END;
$$;

-- 2. Get applications list (optionally filtered by status)
CREATE OR REPLACE FUNCTION admin_get_applications(p_admin_id UUID, p_status TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_applications JSON;
BEGIN
  IF p_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT COALESCE(
    json_agg(row_to_json(a) ORDER BY a.created_at DESC),
    '[]'::json
  ) INTO v_applications
  FROM (
    SELECT id, business_name, owner_name, address, status, created_at
    FROM applications
    WHERE (p_status IS NULL OR status = p_status)
  ) a;

  RETURN json_build_object('success', true, 'applications', v_applications);
END;
$$;

-- 3. Get single application by ID
CREATE OR REPLACE FUNCTION admin_get_application(p_admin_id UUID, p_application_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_application JSON;
BEGIN
  IF p_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT row_to_json(a) INTO v_application
  FROM (
    SELECT id, business_name, owner_name, address, status, created_at,
           reviewed_at, staff_notes, certificate_url,
           admin_reviewer
    FROM applications
    WHERE id = p_application_id
  ) a;

  IF v_application IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Application not found');
  END IF;

  RETURN json_build_object('success', true, 'application', v_application);
END;
$$;

-- 4. Review (approve/reject) an application
CREATE OR REPLACE FUNCTION admin_review_application(
  p_admin_id UUID,
  p_application_id UUID,
  p_status TEXT,
  p_staff_notes TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_email TEXT;
BEGIN
  IF p_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid status');
  END IF;

  SELECT email INTO v_admin_email FROM auth.users WHERE id = p_admin_id;

  UPDATE applications
  SET status = p_status,
      staff_notes = p_staff_notes,
      reviewed_at = now(),
      admin_reviewer = COALESCE(v_admin_email, p_admin_id::text)
  WHERE id = p_application_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Application not found');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
