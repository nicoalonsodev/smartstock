-- Cola asíncrona para autorización ARCA (WSAA/WSFE).
-- El worker usa service_role y RPC SECURITY DEFINER para reclamar filas con SKIP LOCKED.

CREATE TABLE public.arca_job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant (id) ON DELETE CASCADE,
  comprobante_id uuid NOT NULL REFERENCES public.comprobante (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_attempt_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arca_job_comprobante_unique UNIQUE (comprobante_id)
);

CREATE INDEX arca_job_queue_poll_idx
  ON public.arca_job (status, next_attempt_at, created_at);

ALTER TABLE public.arca_job ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_arca_job"
  ON public.arca_job FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "tenant_insert_arca_job"
  ON public.arca_job FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "tenant_update_arca_job"
  ON public.arca_job FOR UPDATE
  USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "tenant_delete_arca_job"
  ON public.arca_job FOR DELETE
  USING (tenant_id = auth.tenant_id());

CREATE OR REPLACE FUNCTION public.set_arca_job_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER arca_job_updated_at
  BEFORE UPDATE ON public.arca_job
  FOR EACH ROW
  EXECUTE FUNCTION public.set_arca_job_updated_at();

-- Reclama trabajos: incrementa attempts y pasa a processing.
CREATE OR REPLACE FUNCTION public.claim_arca_jobs(p_limit integer DEFAULT 10)
RETURNS SETOF public.arca_job
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT j.id
    FROM public.arca_job j
    WHERE j.status = 'pending'
      AND j.attempts < j.max_attempts
      AND (j.next_attempt_at IS NULL OR j.next_attempt_at <= now())
    ORDER BY j.created_at ASC
    FOR UPDATE OF j SKIP LOCKED
    LIMIT COALESCE(p_limit, 10)
  )
  UPDATE public.arca_job j
  SET
    status = 'processing',
    attempts = j.attempts + 1,
    updated_at = now()
  FROM picked
  WHERE j.id = picked.id
  RETURNING j.*;
END;
$$;

-- Workers caídos: vuelve a pending para reintentar.
CREATE OR REPLACE FUNCTION public.reset_stale_arca_jobs(p_stale_minutes integer DEFAULT 15)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  WITH u AS (
    UPDATE public.arca_job
    SET
      status = 'pending',
      updated_at = now()
    WHERE status = 'processing'
      AND updated_at < now() - make_interval(mins => GREATEST(COALESCE(p_stale_minutes, 15), 1))
    RETURNING 1
  )
  SELECT count(*)::integer INTO n FROM u;

  RETURN COALESCE(n, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_arca_jobs(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_arca_jobs(integer) TO service_role;

REVOKE ALL ON FUNCTION public.reset_stale_arca_jobs(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_stale_arca_jobs(integer) TO service_role;
