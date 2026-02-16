from cryptography.fernet import Fernet
from django.conf import settings

_fernet = None


def get_fernet():
    global _fernet
    if _fernet is None:
        _fernet = Fernet(settings.FERNET_KEY.encode())
    return _fernet


def encrypt_value(plaintext: str) -> str:
    return get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    return get_fernet().decrypt(ciphertext.encode()).decode()
