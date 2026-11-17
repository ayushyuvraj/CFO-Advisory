
from email import policy
from .email_formats import parse_email_bytes, email_identity
from email.utils import parsedate_to_datetime
from pathlib import Path
from datetime import datetime, timezone
from uuid import uuid5, NAMESPACE_URL
import hashlib
import json
import re

BACKEND = Path(__file__).resolve().parents[2]
INPUT_DIR = BACKEND / "test_emails"
from ..config import get_settings

OUTPUT_DIR = get_settings().email_attachment_dir


def safe_name(name):
    # Remove invalid Windows filename characters
    return re.sub(
        r'[<>:"/\\|?*\x00-\x1f\s]+', "_", name
    ).strip("._")[:100] or "No_Subject"


def process_email(file_path, *, folder_path=None, reuse_existing=False):
    # Step 2: Read email and extract details
    file_path = Path(file_path)
    raw = file_path.read_bytes()
    msg = parse_email_bytes(raw, file_path.suffix)

    # Generate stable Email ID
    message_id = str(msg.get("Message-ID", "")).strip()
    identity = email_identity(raw, msg, file_path.suffix)
    email_id = str(uuid5(NAMESPACE_URL, identity))

    subject = str(msg.get("Subject") or "No Subject")

    # Extract email date and time
    try:
        received = parsedate_to_datetime(str(msg.get("Date", "")))
        if received is None:
            raise ValueError("Missing date")
        if received.tzinfo is None:
            received = received.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError, IndexError):
        received = datetime.fromtimestamp(
            file_path.stat().st_mtime, timezone.utc
        )

    # Extract email body
    body_part = msg.get_body(preferencelist=("plain",))
    body = body_part.get_content().strip() if body_part else ""

    # Step 3: Create folder using Email Subject + Timestamp
    timestamp = received.strftime("%Y%m%d_%H%M%S")
    folder_name = f"{safe_name(subject)}_{timestamp}"
    folder = Path(folder_path) if folder_path is not None else OUTPUT_DIR / folder_name

    # Avoid silently mixing different emails in one folder
    if not reuse_existing and folder.exists() and any(folder.iterdir()):
        raise FileExistsError(
            f"Folder already contains files: {folder}. "
            "A database-backed email-to-folder mapping is needed "
            "to safely distinguish reprocessing from collisions."
        )


    # Email information and IDs for future database storage
    data = {
        "email_id": email_id,
        "message_id": message_id,
        "sender": str(msg.get("From", "")),
        "recipient": str(msg.get("To", "")),
        "subject": subject,
        "received_datetime": received.isoformat(),
        "body": body,
        "folder_path": str(folder),
        "attachments": []
    }

    # Validate all filenames and bytes before writing any attachment.
    planned = {}
    for index, part in enumerate(msg.iter_attachments(), 1):
        filename = part.get_filename()

        if not filename or not filename.lower().endswith(".pdf"):
            continue

        content = part.get_payload(decode=True)
        if content is None:
            continue

        # Generate unique Attachment ID linked to Email ID
        attachment_id = str(
            uuid5(NAMESPACE_URL, f"{email_id}:attachment:{index}")
        )

        # Save using original PDF filename
        original_name = Path(filename.replace("\\", "/")).name
        if (not original_name or original_name in (".", "..")
                or re.search(r'[<>:"/\\|?*\x00-\x1f]', original_name)
                or original_name.endswith((".", " "))
                or original_name.split(".")[0].upper() in
                {"CON", "PRN", "AUX", "NUL", *[f"COM{i}" for i in range(1, 10)],
                 *[f"LPT{i}" for i in range(1, 10)]}):
            raise ValueError("Invalid attachment filename")
        key = original_name.casefold()
        if key in planned:
            raise FileExistsError("Duplicate attachment filename")
        planned[key] = (original_name, content)
        saved_path = folder / original_name

        # Keep attachment-to-email relationship in backend data
        data["attachments"].append({
            "attachment_id": attachment_id,
            "email_id": email_id,
            "filename": original_name,
            "content_type": part.get_content_type(),
            "size_bytes": len(content),
            "file_path": str(saved_path)
        })

    if folder.exists():
        for existing in folder.iterdir():
            expected = planned.get(existing.name.casefold())
            if (not reuse_existing or expected is None or existing.is_symlink()
                    or not existing.is_file() or existing.read_bytes() != expected[1]):
                raise FileExistsError("Existing folder does not match this email")
    folder.mkdir(parents=True, exist_ok=True)
    for name, content in planned.values():
        destination = folder / name
        if not destination.exists():
            # Exclusive creation prevents accidental overwrites.
            with destination.open("xb") as handle:
                handle.write(content)
    return data


if __name__ == "__main__":
    # Process all .eml files dynamically
    for email_file in sorted(p for p in INPUT_DIR.iterdir() if p.is_file() and p.suffix.lower() in (".eml", ".msg")) if INPUT_DIR.exists() else []:
        result = process_email(email_file)
        print(json.dumps(result, indent=2, ensure_ascii=False))
