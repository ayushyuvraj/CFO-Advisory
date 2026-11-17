"""Local CLI calling the running FastAPI server; no background worker in CLI."""
import argparse
import asyncio
from urllib.parse import urlsplit

import httpx


async def run(args):
    url = urlsplit(args.api_url)
    if (url.scheme not in ("http", "https") or url.hostname not in ("localhost", "127.0.0.1", "::1")
            or url.username or url.password or url.query or url.fragment or url.path not in ("", "/")):
        raise RuntimeError("Use a local API URL such as http://127.0.0.1:8000")
    headers = {"X-User": args.user} if args.user else {}
    totals, problems = {}, False
    try:
        async with httpx.AsyncClient(base_url=args.api_url.rstrip("/"), headers=headers,
                                     timeout=httpx.Timeout(300, connect=10)) as client:
            if args.attachment_id:
                rows = [{"attachment_id": args.attachment_id}]
            else:
                rows, offset = [], 0
                while True:
                    params = {"limit":500, "offset":offset}
                    if args.email_id:
                        params["email_id"] = args.email_id
                    response = await client.get("/api/email-intake/attachments", params=params)
                    if response.status_code != 200:
                        raise RuntimeError(f"Email intake API unavailable (HTTP {response.status_code}); verify Step 6 install and restart backend")
                    page = response.json()["items"]
                    rows.extend(page)
                    if len(page) < 500:
                        break
                    offset += 500
            for row in rows:
                if args.dry_run:
                    outcome = "already_linked" if row.get("invoice_id") else row.get("eligibility_reason", "unknown")
                    print(f"Attachment {row['attachment_id']}: {outcome}", flush=True)
                else:
                    response = await client.post(f"/api/email-intake/attachments/{row['attachment_id']}/forward")
                    if response.status_code != 200:
                        # No raw response/provider messages or credentials.
                        outcome = f"request_failed_HTTP_{response.status_code}"
                        problems = True
                        print(f"Attachment {row['attachment_id']}: {outcome}; check API/attachment and retry", flush=True)
                    else:
                        result = response.json()
                        outcome = result["outcome"]
                        state = result.get("pipeline_state")
                        if state == "error":
                            problems = True
                        print(f"Attachment {row['attachment_id']}: {outcome}; "
                              f"case={result.get('case_id') or '-'}; pipeline={state or '-'}; "
                              f"eligibility={result['eligibility_reason']}", flush=True)
                totals[outcome] = totals.get(outcome, 0) + 1
            if not rows:
                print("No stored attachments found.")
    except httpx.RequestError:
        raise RuntimeError("Cannot reach local backend or request timed out. Start/check the API. "
                           "A timed-out forwarding request may have succeeded: rerun to retrieve its existing case.") from None
    print("Summary:", totals)
    return 1 if problems else 0


def main():
    parser = argparse.ArgumentParser(description="Step 6: forward classified email Invoices to existing FastAPI workflow")
    parser.add_argument("--api-url", default="http://127.0.0.1:8000")
    parser.add_argument("--user", help="Existing acting-user identity (X-User)")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--email-id")
    group.add_argument("--attachment-id")
    parser.add_argument("--dry-run", action="store_true", help="List eligibility without creating cases")
    args = parser.parse_args()
    if args.dry_run and args.attachment_id:
        parser.error("Use --email-id or no filter for dry-run")
    try:
        raise SystemExit(asyncio.run(run(args)))
    except RuntimeError as error:
        print(str(error))
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
