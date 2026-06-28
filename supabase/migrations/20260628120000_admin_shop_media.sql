-- Admin shop media: logo + banners on create/update.

DROP FUNCTION IF EXISTS public.admin_create_shop(
  uuid, text, text, text, text, double precision, double precision, text, text, text, uuid
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
  p_business_account_id uuid DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_banner_urls text[] DEFAULT NULL
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
  v_banner_urls text[];
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

  v_banner_urls := COALESCE(p_banner_urls, '{}'::text[]);
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
    logo_url,
    banner_urls,
    banner_url
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
    nullif(trim(p_logo_url), ''),
    v_banner_urls,
    CASE WHEN array_length(v_banner_urls, 1) > 0 THEN v_banner_urls[1] ELSE NULL END
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

CREATE OR REPLACE FUNCTION public.admin_update_shop(
  p_admin_id uuid,
  p_shop_id uuid,
  p_store_name text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_contact_info text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_industry text DEFAULT NULL,
  p_industry_type text DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_google_place_id text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_banner_urls text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email text;
  v_banner_urls text[];
BEGIN
  IF p_admin_id IS NULL OR auth.uid() IS DISTINCT FROM p_admin_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT email INTO v_admin_email FROM auth.users WHERE id = p_admin_id;
  IF v_admin_email IS NULL OR NOT public.is_admin(v_admin_email) THEN
    RETURN json_build_object('success', false, 'error', 'Forbidden');
  END IF;

  IF p_shop_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.shops WHERE id = p_shop_id) THEN
    RETURN json_build_object('success', false, 'error', 'Store not found');
  END IF;

  IF p_store_name IS NOT NULL AND trim(p_store_name) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Store name cannot be empty');
  END IF;

  IF p_location IS NOT NULL AND trim(p_location) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Address cannot be empty');
  END IF;

  IF p_latitude IS NOT NULL AND (p_latitude < -90 OR p_latitude > 90) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid latitude');
  END IF;

  IF p_longitude IS NOT NULL AND (p_longitude < -180 OR p_longitude > 180) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid longitude');
  END IF;

  v_banner_urls := p_banner_urls;

  UPDATE public.shops
  SET
    store_name = COALESCE(nullif(trim(p_store_name), ''), store_name),
    location = COALESCE(nullif(trim(p_location), ''), location),
    contact_info = CASE
      WHEN p_contact_info IS NULL THEN contact_info
      ELSE nullif(trim(p_contact_info), '')
    END,
    description = CASE
      WHEN p_description IS NULL THEN description
      ELSE nullif(trim(p_description), '')
    END,
    industry = COALESCE(nullif(trim(p_industry), ''), industry),
    industry_type = COALESCE(nullif(trim(p_industry_type), ''), industry_type),
    latitude = COALESCE(p_latitude, latitude),
    longitude = COALESCE(p_longitude, longitude),
    google_place_id = CASE
      WHEN p_google_place_id IS NULL THEN google_place_id
      ELSE nullif(trim(p_google_place_id), '')
    END,
    logo_url = CASE
      WHEN p_logo_url IS NULL THEN logo_url
      ELSE nullif(trim(p_logo_url), '')
    END,
    banner_urls = CASE
      WHEN v_banner_urls IS NULL THEN banner_urls
      ELSE v_banner_urls
    END,
    banner_url = CASE
      WHEN v_banner_urls IS NULL THEN banner_url
      WHEN array_length(v_banner_urls, 1) > 0 THEN v_banner_urls[1]
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = p_shop_id;

  RETURN json_build_object('success', true, 'shop_id', p_shop_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_shop(
  uuid, text, text, text, text, double precision, double precision, text, text, text, uuid, text, text[]
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_create_shop(
  uuid, text, text, text, text, double precision, double precision, text, text, text, uuid, text, text[]
) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_shop(
  uuid, uuid, text, text, text, text, text, text, double precision, double precision, text, text, text[]
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_update_shop(
  uuid, uuid, text, text, text, text, text, text, double precision, double precision, text, text, text[]
) TO authenticated;
