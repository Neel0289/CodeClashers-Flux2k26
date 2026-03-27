from pathlib import Path

import firebase_admin
from django.conf import settings
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials


def _resolve_credential_path() -> Path:
    configured = getattr(settings, 'FIREBASE_ADMIN_CREDENTIAL_PATH', '')
    if configured:
        return Path(configured)
    return Path(settings.BASE_DIR).parent / 'fluxfirebase.json'


def _ensure_initialized() -> None:
    if firebase_admin._apps:
        return

    credential_path = _resolve_credential_path()
    if not credential_path.exists():
        raise FileNotFoundError(f'Firebase credential file not found at: {credential_path}')

    cred = credentials.Certificate(str(credential_path))
    firebase_admin.initialize_app(cred)


def verify_firebase_id_token(id_token: str) -> dict:
    _ensure_initialized()
    return firebase_auth.verify_id_token(id_token)
