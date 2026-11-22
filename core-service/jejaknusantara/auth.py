import re
from hashlib import sha256
from pathlib import Path
from secrets import token_urlsafe
from threading import BoundedSemaphore
from time import time
from typing import Annotated, Literal
from uuid import uuid4

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, SecretStr

from .database import connect, initialize


SESSION_SECONDS = 3600
ATTEMPT_LIMIT = 5
ATTEMPT_WINDOW_SECONDS = 300
NO_STORE = {"Cache-Control": "no-store"}
PASSWORDS = PasswordHasher(memory_cost=19 * 1024, time_cost=2, parallelism=1)
DUMMY_HASH = PASSWORDS.hash(token_urlsafe(32))
# Each Argon2 verification uses memory and must fit alongside the catalog on the STB.
PASSWORD_CHECKS = BoundedSemaphore(2)
BEARER = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=1, max_length=254)
    password: SecretStr = Field(min_length=1, max_length=128)


class Account(BaseModel):
    id: str
    email: str


class LoginResult(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int = SESSION_SECONDS
    user: Account


def _normalize_email(email: str) -> str:
    return email.strip().casefold()


def _digest(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def create_account(path: Path, email: str, password: str) -> Account:
    email = _normalize_email(email)
    if len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise ValueError("Masukkan alamat email yang valid.")
    if not 15 <= len(password) <= 128:
        raise ValueError("Kata sandi harus berisi 15 sampai 128 karakter.")

    account = Account(id=uuid4().hex, email=email)
    password_hash = PASSWORDS.hash(password)
    initialize(path)
    with connect(path) as database:
        database.execute(
            "INSERT INTO auth_users (id, email, password_hash) VALUES (?, ?, ?)",
            (account.id, account.email, password_hash),
        )
    return account


def _reserve_attempt(path: Path, email_key: str, now: int) -> int:
    with connect(path) as database:
        database.execute("DELETE FROM auth_attempts WHERE reset_at <= ?", (now,))
        result = database.execute("""
            INSERT INTO auth_attempts (email_key, attempts, reset_at)
            VALUES (?, 1, ?)
            ON CONFLICT (email_key) DO UPDATE SET attempts = attempts + 1
            WHERE auth_attempts.attempts < ?
        """, (email_key, now + ATTEMPT_WINDOW_SECONDS, ATTEMPT_LIMIT))
        if result.rowcount == 1:
            return 0
        reset_at = database.execute(
            "SELECT reset_at FROM auth_attempts WHERE email_key = ?", (email_key,),
        ).fetchone()["reset_at"]
        return reset_at - now


def _rate_limited(retry_after: int) -> HTTPException:
    return HTTPException(
        status_code=429,
        detail="Terlalu banyak percobaan. Coba lagi nanti.",
        headers={**NO_STORE, "Retry-After": str(retry_after)},
    )


def _session_required() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="Sesi tidak valid atau sudah berakhir.",
        headers={**NO_STORE, "WWW-Authenticate": "Bearer"},
    )


def _token_hash(credentials: HTTPAuthorizationCredentials | None) -> str:
    if credentials is None or not re.fullmatch(r"[A-Za-z0-9_-]{43}", credentials.credentials):
        raise _session_required()
    return _digest(credentials.credentials)


def _verify_password(password_hash: str, password: str) -> bool:
    try:
        return PASSWORDS.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def _create_session(path: Path, account: Account, email_key: str) -> LoginResult:
    token = token_urlsafe(32)
    now = int(time())
    with connect(path) as database:
        database.execute("DELETE FROM auth_sessions WHERE expires_at <= ?", (now,))
        database.execute(
            "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (_digest(token), account.id, now + SESSION_SECONDS),
        )
        database.execute("DELETE FROM auth_attempts WHERE email_key = ?", (email_key,))
    return LoginResult(access_token=token, user=account)


def create_auth_router(path: Path) -> APIRouter:
    router = APIRouter(prefix="/api/auth", tags=["Akun"])
    invalid_session = {401: {"description": "Sesi tidak valid atau sudah berakhir"}}

    @router.post(
        "/login",
        response_model=LoginResult,
        responses={
            401: {"description": "Email atau kata sandi salah"},
            422: {"description": "Data login tidak valid"},
            429: {"description": "Terlalu banyak percobaan login"},
        },
    )
    def login(body: LoginRequest, response: Response):
        email = _normalize_email(body.email)
        email_key = _digest(email)
        if not PASSWORD_CHECKS.acquire(blocking=False):
            raise _rate_limited(1)
        try:
            retry_after = _reserve_attempt(path, email_key, int(time()))
            if retry_after:
                raise _rate_limited(retry_after)

            with connect(path) as database:
                user = database.execute(
                    "SELECT id, email, password_hash FROM auth_users WHERE email = ?", (email,),
                ).fetchone()
            password_hash = user["password_hash"] if user is not None else DUMMY_HASH
            verified = _verify_password(password_hash, body.password.get_secret_value())
            if user is None or not verified:
                raise HTTPException(
                    status_code=401, detail="Email atau kata sandi salah.", headers=NO_STORE,
                )
            account = Account(id=user["id"], email=user["email"])
            response.headers.update(NO_STORE)
            return _create_session(path, account, email_key)
        finally:
            PASSWORD_CHECKS.release()

    @router.get("/me", response_model=Account, responses=invalid_session)
    def profile(
        response: Response,
        credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(BEARER)],
    ):
        token_hash = _token_hash(credentials)
        with connect(path) as database:
            user = database.execute("""
                SELECT u.id, u.email
                FROM auth_sessions AS s
                JOIN auth_users AS u ON u.id = s.user_id
                WHERE s.token_hash = ? AND s.expires_at > ?
            """, (token_hash, int(time()))).fetchone()
        if user is None:
            raise _session_required()
        response.headers.update(NO_STORE)
        return Account(id=user["id"], email=user["email"])

    @router.post("/logout", status_code=204, responses=invalid_session)
    def logout(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(BEARER)]):
        token_hash = _token_hash(credentials)
        with connect(path) as database:
            result = database.execute(
                "DELETE FROM auth_sessions WHERE token_hash = ? AND expires_at > ?",
                (token_hash, int(time())),
            )
            revoked = result.rowcount == 1
        if not revoked:
            raise _session_required()
        return Response(status_code=204, headers=NO_STORE)

    return router
