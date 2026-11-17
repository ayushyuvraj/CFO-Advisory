-- Target: ONLY financecommandcenterhub.public.email_invoice_links.
-- Pause uploads. Run this ENTIRE block once in Cloud SQL Studio.
-- Preserve all existing rows; do not delete or reprocess cases.
DO $$
DECLARE
    key_name text;
    key_cols text[];
    old_rows jsonb;
    new_rows jsonb;
BEGIN
    IF current_database() <> 'financecommandcenterhub' THEN
        RAISE EXCEPTION 'Wrong database selected. Nothing changed.';
    END IF;

    PERFORM set_config('lock_timeout', '10s', true);
    LOCK TABLE public.email_invoice_links IN ACCESS EXCLUSIVE MODE;

    SELECT c.conname,
           array_agg(a.attname::text ORDER BY k.ordinality)
      INTO key_name, key_cols
    FROM pg_constraint c
    CROSS JOIN LATERAL
         unnest(c.conkey) WITH ORDINALITY k(attnum, ordinality)
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.conrelid = 'public.email_invoice_links'::regclass
      AND c.contype = 'p'
    GROUP BY c.conname;

    IF key_cols = ARRAY['attachment_id', 'part_index'] THEN
        RAISE NOTICE 'Already migrated. Nothing changed.';
        RETURN;
    END IF;

    IF key_cols IS DISTINCT FROM ARRAY['attachment_id'] THEN
        RAISE EXCEPTION 'Unexpected table structure. Nothing changed.';
    END IF;

    IF (SELECT COUNT(*) FROM public.email_invoice_links) <> 3 THEN
        RAISE EXCEPTION 'Link count differs from the 3-row export. Recheck before migrating. Nothing changed.';
    END IF;

    SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY attachment_id), '[]'::jsonb)
      INTO old_rows
    FROM public.email_invoice_links l;

    ALTER TABLE public.email_invoice_links
        ADD COLUMN part_index integer NOT NULL DEFAULT 0,
        ADD COLUMN source_page_start integer,
        ADD COLUMN source_page_end integer,
        ADD COLUMN source_invoice_number varchar(120);

    EXECUTE format(
        'ALTER TABLE public.email_invoice_links DROP CONSTRAINT %I',
        key_name
    );

    ALTER TABLE public.email_invoice_links
        ADD PRIMARY KEY (attachment_id, part_index);

    SELECT coalesce(jsonb_agg(
        to_jsonb(l) - ARRAY[
            'part_index', 'source_page_start',
            'source_page_end', 'source_invoice_number'
        ] ORDER BY attachment_id
    ), '[]'::jsonb)
      INTO new_rows
    FROM public.email_invoice_links l;

    IF old_rows IS DISTINCT FROM new_rows THEN
        RAISE EXCEPTION 'Preservation check failed; migration rolled back.';
    END IF;

    RAISE NOTICE 'Migration completed. All 3 existing links and original link values preserved.';
END $$;
