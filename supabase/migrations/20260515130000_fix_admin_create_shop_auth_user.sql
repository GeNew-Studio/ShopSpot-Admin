-- Fix: business_accounts.user_id must exist in auth.users (FK).
-- New brands: create a dummy auth user (same pattern as Pizza Hut / KFC seeds).
-- Extra locations: pass p_business_account_id to reuse an existing brand account.

DROP FUNCTION IF EXISTS public.admin_create_shop(
  uuid, text, text, text, text, double precision, double precision, text, text, text
);

CREATE OR REPLACE FUNCTION public.admin_create_shop(
  p_admin_id uuid,
  p_store_name text,
  p_location text,
  p_industry text,
  p_industry_type text,
  p_latitude double precision,
  p_longitude double precision,
  p_contact_info text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_google_place_id text DEFAULT NULL,
  p_business_account_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_admin_email text;
  v_brand_user uuid;
  v_business_account_id uuid;
  v_shop_id uuid;
  v_dummy_email text;
  v_is_new_brand boolean;
BEGIN
  IF p_admin_id IS NULL OR auth.uid() IS DISTINCT FROM p_admin_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT email INTO v_admin_email FROM auth.users WHERE id = p_admin_id;
  IF v_admin_email IS NULL OR NOT public.is_admin(v_admin_email) THEN
    RETURN json_build_object('success', false, 'error', 'Forbidden');
  END IF;

  IF trim(p_store_name) = '' OR trim(p_location) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Store name and address are required');
  END IF;

  IF trim(p_industry) = '' OR trim(p_industry_type) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Industry and type are required');
  END IF;

  IF p_latitude IS NULL OR p_longitude IS NULL
     OR p_latitude < -90 OR p_latitude > 90
     OR p_longitude < -180 OR p_longitude > 180 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid coordinates');
  END IF;

  v_is_new_brand := (p_business_account_id IS NULL);

  IF v_is_new_brand THEN
    v_brand_user := gen_random_uuid();
    v_dummy_email := 'admin-created-' || replace(v_brand_user::text, '-', '') || '@dummy.shopspot.local';

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      v_brand_user,
      'authenticated',
      'authenticated',
      v_dummy_email,
      extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"dummy_brand": true, "admin_created": true}'::jsonb,
      now(),
      now()
    );

    INSERT INTO public.business_accounts (user_id, email, is_dummy)
    VALUES (v_brand_user, v_dummy_email, true)
    RETURNING id INTO v_business_account_id;
  ELSE
    SELECT ba.id, ba.user_id
    INTO v_business_account_id, v_brand_user
    FROM public.business_accounts ba
    WHERE ba.id = p_business_account_id;

    IF v_business_account_id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Business account not found');
    END IF;
  END IF;

  INSERT INTO public.shops (
    user_id,
    business_account_id,
    store_name,
    location,
    contact_info,
    description,
    industry,
    industry_type,
    latitude,
    longitude,
    google_place_id,
    banner_urls
  )
  VALUES (
    v_brand_user,
    v_business_account_id,
    trim(p_store_name),
    trim(p_location),
    nullif(trim(p_contact_info), ''),
    nullif(trim(p_description), ''),
    trim(p_industry),
    trim(p_industry_type),
    p_latitude,
    p_longitude,
    nullif(trim(p_google_place_id), ''),
    '{}'::text[]
  )
  RETURNING id INTO v_shop_id;

  IF v_is_new_brand THEN
    UPDATE public.business_accounts
    SET flagship_shop_id = v_shop_id,
        updated_at = now()
    WHERE id = v_business_account_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'shop_id', v_shop_id,
    'business_account_id', v_business_account_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_shop(
  uuid, text, text, text, text, double precision, double precision, text, text, text, uuid
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_create_shop(
  uuid, text, text, text, text, double precision, double precision, text, text, text, uuid
) TO authenticated;
