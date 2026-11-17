"""Re-locate field and line boxes from the PDF text layer for invoices already processed.

    .venv/Scripts/python scripts/snap_boxes.py

Only box positions change — values, checks and decisions are untouched.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.db import engine, session_scope  # noqa: E402
from app.models import Invoice  # noqa: E402
from app.services.pipeline import snap_locations  # noqa: E402


async def main() -> None:
    async with session_scope() as db:
        invoices = (await db.execute(select(Invoice).where(Invoice.pipeline_state == "done"))).scalars().all()
        for inv in invoices:
            n = await snap_locations(inv)
            print(f"{inv.case_id} {inv.invoice_number}: {n} locations snapped")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
