"""Read EML and Outlook MSG into the existing email-processing representation."""
import hashlib
from email import policy
from email.parser import BytesParser
from email.message import EmailMessage

OLE_SIGNATURE = b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'


def parse_email_bytes(raw: bytes, suffix: str):
    suffix = suffix.lower()
    if suffix == '.eml':
        # Retain the existing EML parser and ID behavior unchanged.
        if raw.startswith(OLE_SIGNATURE):
            raise ValueError('Outlook MSG must use the .msg extension')
        return BytesParser(policy=policy.default).parsebytes(raw)
    if suffix != '.msg' or not raw.startswith(OLE_SIGNATURE):
        raise ValueError('Unsupported email format')
    try:
        import extract_msg
        with extract_msg.openMsg(raw) as outlook:
            if not str(outlook.classType or '').upper().startswith('IPM.NOTE'):
                raise ValueError('Only Outlook email messages are supported')
            message = outlook.asEmailMessage()
            # Some MSGs omit transport headers but carry the MAPI properties.
            for header, value in (('Subject', outlook.subject), ('From', outlook.sender),
                                  ('To', outlook.to), ('Message-ID', outlook.messageId)):
                if value and not message.get(header):
                    message[header] = str(value)
            if outlook.date and not message.get('Date'):
                from email.utils import format_datetime
                message['Date'] = format_datetime(outlook.date)
            # The library nests attachments inside multipart/related. Flatten
            # actual file parts so existing iter_attachments() sees every PDF.
            converted = BytesParser(policy=policy.default).parsebytes(message.as_bytes())
            normalized = EmailMessage(policy=policy.default)
            for header in ('Subject', 'From', 'To', 'Cc', 'Bcc', 'Date', 'Message-ID'):
                if converted.get(header):
                    normalized[header] = str(converted[header]).replace('\r', '').replace('\n', ' ')
            body = converted.get_body(preferencelist=('plain',))
            if body:
                normalized.set_content(body.get_content())
            else:
                html = converted.get_body(preferencelist=('html',))
                if html:
                    from bs4 import BeautifulSoup
                    normalized.set_content(BeautifulSoup(html.get_content(), 'html.parser').get_text(' ', strip=True))
                else:
                    normalized.set_content('')
            for part in converted.walk():
                filename = part.get_filename()
                if filename and not part.is_multipart():
                    data = part.get_payload(decode=True)
                    if data is not None:
                        normalized.add_attachment(data, maintype=part.get_content_maintype(),
                                                  subtype=part.get_content_subtype(), filename=filename)
            return normalized
    except Exception:
        # Never return parser internals, paths, or message content in API errors.
        raise ValueError('Invalid or unsupported Outlook MSG email') from None


def email_identity(raw, message, suffix):
    identity = str(message.get('Message-ID', '')).strip() or hashlib.sha256(raw).hexdigest()
    # Different file formats have different byte hashes. Keep old EML IDs intact
    # and isolate MSG identities to avoid false changed-content conflicts.
    # Invoice-level duplicate validation remains unchanged across both formats.
    return 'outlook-msg:' + identity if suffix.lower() == '.msg' else identity
