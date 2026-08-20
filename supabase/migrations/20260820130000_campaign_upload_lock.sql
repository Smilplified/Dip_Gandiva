-- Serializes lead imports per campaign so concurrent uploads cannot pass the
-- duplicate check before either request inserts its rows.
CREATE TABLE IF NOT EXISTS public.campaign_upload_locks (
  campaign_id uuid PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  locked_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lock_token uuid NOT NULL,
  locked_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.acquire_campaign_upload_lock(
  p_campaign_id uuid,
  p_lock_token uuid,
  p_lock_seconds integer DEFAULT 120
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_acquired boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_lock_seconds < 1 OR p_lock_seconds > 300 THEN
    RAISE EXCEPTION 'Lock duration must be between 1 and 300 seconds';
  END IF;

  INSERT INTO public.campaign_upload_locks (
    campaign_id,
    locked_by,
    lock_token,
    locked_until,
    updated_at
  )
  VALUES (
    p_campaign_id,
    v_user_id,
    p_lock_token,
    now() + make_interval(secs => p_lock_seconds),
    now()
  )
  ON CONFLICT (campaign_id) DO UPDATE
  SET
    locked_by = EXCLUDED.locked_by,
    lock_token = EXCLUDED.lock_token,
    locked_until = EXCLUDED.locked_until,
    updated_at = now()
  WHERE public.campaign_upload_locks.locked_until <= now()
  RETURNING true INTO v_acquired;

  RETURN COALESCE(v_acquired, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_campaign_upload_lock(
  p_campaign_id uuid,
  p_lock_token uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.campaign_upload_locks
  WHERE campaign_id = p_campaign_id
    AND lock_token = p_lock_token
    AND locked_by = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_campaign_upload_lock(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_campaign_upload_lock(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_campaign_upload_lock(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_campaign_upload_lock(uuid, uuid) TO authenticated;
