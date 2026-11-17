"""Configuration checks use temporary files/databases, never local or cloud data."""
import asyncio
import importlib
import os
import subprocess
import sys
from email.message import EmailMessage
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy.engine import make_url

from app.config import BACKEND_DIR, Settings, get_settings
from app.services import email_inbox, email_reader, email_store


def test_local_defaults(monkeypatch):
    for key in ('EMAIL_ALLOW_CLOUD_DB', 'EMAIL_RAW_DIR', 'EMAIL_ATTACHMENT_DIR'):
        monkeypatch.delenv(key, raising=False)
    settings = Settings(_env_file=None)
    assert settings.email_allow_cloud_db is False
    assert settings.email_raw_dir is None
    assert settings.email_attachment_dir == BACKEND_DIR / 'email_attachments'
    monkeypatch.setattr(email_inbox, 'get_settings', lambda: settings)
    assert email_inbox.upload_folder() == email_reader.INPUT_DIR / 'ui_uploads'


def test_environment_storage_overrides(monkeypatch, tmp_path):
    monkeypatch.setenv('EMAIL_ALLOW_CLOUD_DB', 'true')
    monkeypatch.setenv('EMAIL_RAW_DIR', str(tmp_path / 'raw'))
    monkeypatch.setenv('EMAIL_ATTACHMENT_DIR', str(tmp_path / 'attachments'))
    settings = Settings(_env_file=None)
    assert settings.email_allow_cloud_db is True
    monkeypatch.setattr(email_inbox, 'get_settings', lambda: settings)
    assert email_inbox.upload_folder() == tmp_path / 'raw'
    monkeypatch.setattr(email_reader, 'get_settings', lambda: settings)
    # Reload verifies the actual import-time path used by reader/store.
    with monkeypatch.context() as scoped:
        scoped.setattr('app.config.get_settings', lambda: settings)
        importlib.reload(email_reader)
        assert email_reader.OUTPUT_DIR == tmp_path / 'attachments'
    importlib.reload(email_reader)


@pytest.mark.parametrize('url,cloud,allowed', [
    ('postgresql://localhost/local', False, True),
    ('postgresql://127.0.0.1/local', False, True),
    ('postgresql://[::1]/local', False, True),
    ('postgresql://remote.example/cloud', False, False),
    ('postgresql:///cloud?host=/cloudsql/project:region:instance', False, False),
    ('postgresql://localhost/cloud?host=remote.example', False, False),
    ('postgresql://remote.example/cloud', True, True),
    ('postgresql:///cloud?host=/cloudsql/project:region:instance', True, True),
    ('sqlite:///local.db', False, False),
    ('sqlite:///local.db', True, False),
])
def test_database_permission(monkeypatch, url, cloud, allowed):
    monkeypatch.setattr(email_store, 'get_settings', lambda: SimpleNamespace(email_allow_cloud_db=cloud))
    if allowed:
        email_store.require_email_postgres(make_url(url))
    else:
        with pytest.raises(RuntimeError):
            email_store.require_email_postgres(make_url(url))


def test_strict_local_helper_remains_strict(monkeypatch):
    monkeypatch.setattr(email_store, 'get_settings', lambda: SimpleNamespace(email_allow_cloud_db=True))
    with pytest.raises(RuntimeError):
        email_store.require_local_postgres(make_url('postgresql://remote.example/cloud'))


def test_reader_preserves_ids_and_retry_bytes(monkeypatch, tmp_path):
    monkeypatch.setattr(email_reader, 'OUTPUT_DIR', tmp_path / 'attachments')
    msg = EmailMessage()
    msg['From'], msg['To'], msg['Subject'] = 'sender@example.com', 'ap@example.com', 'Test'
    msg['Message-ID'], msg['Date'] = '<email-config-test@example.com>', 'Wed, 04 Nov 2026 10:00:00 +0000'
    msg.set_content('Testing email configuration')
    msg.add_attachment(b'%PDF-test', maintype='application', subtype='pdf', filename='invoice.pdf')
    source = tmp_path / 'source.eml'
    source.write_bytes(msg.as_bytes())
    first = email_reader.process_email(source)
    second = email_reader.process_email(source, folder_path=first['folder_path'], reuse_existing=True)
    assert first == second
    saved = Path(first['attachments'][0]['file_path'])
    assert saved.is_relative_to(tmp_path / 'attachments')
    assert saved.read_bytes() == b'%PDF-test'


def test_fresh_database_registration_without_router_imports(tmp_path):
    code = '''
import asyncio
from sqlalchemy import inspect
from app import db
async def check():
    await db.init_db()
    async with db.engine.connect() as conn:
        names = await conn.run_sync(lambda sync: inspect(sync).get_table_names())
        assert {'emails', 'email_attachments', 'email_invoice_links', 'email_upload_jobs'} <= set(names)
        keys = await conn.run_sync(lambda sync: inspect(sync).get_foreign_keys('email_invoice_links'))
        assert {key['referred_table'] for key in keys} == {'invoices', 'email_attachments'}
    await db.engine.dispose()
asyncio.run(check())
'''
    env = dict(os.environ, DATABASE_URL='sqlite:///' + (tmp_path / 'fresh.db').as_posix())
    result = subprocess.run([sys.executable, '-c', code], env=env,
                            cwd=Path(__file__).resolve().parents[1], capture_output=True, text=True, timeout=45)
    assert result.returncode == 0, result.stderr


def test_router_recovery_lifecycle(monkeypatch):
    from app.routers.email_inbox import lifespan
    calls = []
    async def start():
        calls.append('start')
    async def stop():
        calls.append('stop')
    monkeypatch.setattr(email_inbox, 'start', start)
    monkeypatch.setattr(email_inbox, 'stop', stop)
    async def check():
        async with lifespan(None):
            assert calls == ['start']
        assert calls == ['start', 'stop']
    asyncio.run(check())
