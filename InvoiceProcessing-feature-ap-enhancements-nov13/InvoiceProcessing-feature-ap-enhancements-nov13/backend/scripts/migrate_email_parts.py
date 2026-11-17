"""Explicit, transactional migration. Run with backend stopped; default preview."""
import argparse
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import inspect, text
from app.db import engine


async def main(apply=False):
    async with engine.begin() as conn:
        def schema(c):
            inspector=inspect(c)
            if 'email_invoice_links' not in inspector.get_table_names():
                return None
            return inspector.get_pk_constraint('email_invoice_links')
        pk=await conn.run_sync(schema)
        if pk is None:
            print('Fresh database: start the new backend to create the new table.'); return
        columns=pk['constrained_columns']
        if columns==['attachment_id','part_index']:
            print('Already migrated.'); return
        if columns!=['attachment_id']:
            raise RuntimeError('Unexpected primary key; migration stopped.')
        count=await conn.scalar(text('SELECT COUNT(*) FROM email_invoice_links'))
        print(f'Existing links: {count}. Will preserve all rows; add part index/page metadata and change primary key.')
        if not apply:
            print('PREVIEW ONLY. Stop the backend, back up the database, then run with --apply.'); return
        if conn.dialect.name=='postgresql':
            # Quoted name comes from database introspection, never user input.
            name=conn.dialect.identifier_preparer.quote(pk['name'])
            await conn.execute(text('LOCK TABLE email_invoice_links IN ACCESS EXCLUSIVE MODE'))
            for ddl in (
                'ALTER TABLE email_invoice_links ADD COLUMN part_index INTEGER NOT NULL DEFAULT 0',
                'ALTER TABLE email_invoice_links ADD COLUMN source_page_start INTEGER',
                'ALTER TABLE email_invoice_links ADD COLUMN source_page_end INTEGER',
                'ALTER TABLE email_invoice_links ADD COLUMN source_invoice_number VARCHAR(120)',
                f'ALTER TABLE email_invoice_links DROP CONSTRAINT {name}',
                'ALTER TABLE email_invoice_links ADD PRIMARY KEY (attachment_id, part_index)'):
                await conn.execute(text(ddl))
        elif conn.dialect.name=='sqlite':
            from app.email_invoice_models import EmailInvoiceLink
            # sqlite legacy transaction mode does not BEGIN for DDL/SELECT.
            # Start a real transaction so a later failure restores the old table.
            await conn.exec_driver_sql('BEGIN IMMEDIATE')
            # No tables reference this link table in the application schema.
            await conn.execute(text('ALTER TABLE email_invoice_links RENAME TO email_invoice_links_legacy'))
            await conn.run_sync(lambda c: EmailInvoiceLink.__table__.create(c))
            cols='attachment_id, invoice_id, source_sha256, classification_version, forwarded_by, forwarded_at, dispatch_state'
            await conn.execute(text(f'INSERT INTO email_invoice_links ({cols},part_index) SELECT {cols},0 FROM email_invoice_links_legacy'))
            await conn.execute(text('DROP TABLE email_invoice_links_legacy'))
        else:
            raise RuntimeError('Only PostgreSQL and SQLite are supported.')
        after=await conn.scalar(text('SELECT COUNT(*) FROM email_invoice_links'))
        if after!=count:
            raise RuntimeError('Row count mismatch; transaction rolled back.')
        print(f'Migration complete: {after} links preserved.')
    await engine.dispose()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply',action='store_true')
    asyncio.run(main(parser.parse_args().apply))
