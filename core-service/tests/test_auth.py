import sqlite3
from pathlib import Path
from secrets import token_urlsafe
from tempfile import TemporaryDirectory
from unittest import TestCase

from fastapi.testclient import TestClient

from jejaknusantara.api import create_app
from jejaknusantara.auth import create_account
from jejaknusantara.database import connect


class AuthTest(TestCase):
    def setUp(self):
        directory = self.enterContext(TemporaryDirectory())
        self.database = Path(directory) / "test.sqlite3"
        self.email = "demo@example.test"
        self.password = token_urlsafe(24)
        create_account(self.database, self.email, self.password)
        self.client = self.enterContext(TestClient(create_app(self.database)))

    def login(self, email=None, password=None):
        return self.client.post("/api/auth/login", json={
            "email": self.email if email is None else email,
            "password": self.password if password is None else password,
        })

    def authorization(self, response):
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["cache-control"], "no-store")
        return {"Authorization": "Bearer " + response.json()["access_token"]}

    def test_login_normalizes_email_and_opens_a_protected_profile(self):
        response = self.login(email=" Demo@EXAMPLE.TEST ")
        headers = self.authorization(response)
        payload = response.json()

        self.assertEqual(payload["token_type"], "bearer")
        self.assertEqual(payload["expires_in"], 3600)
        self.assertEqual(set(payload["user"]), {"id", "email"})
        self.assertEqual(payload["user"]["email"], self.email)

        profile = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.headers["cache-control"], "no-store")
        self.assertEqual(profile.json(), payload["user"])

    def test_bad_password_and_unknown_account_get_the_same_reply(self):
        wrong_password = self.login(password=token_urlsafe(24))
        unknown_account = self.login(email="unknown@example.test")

        self.assertEqual(wrong_password.status_code, 401)
        self.assertEqual(unknown_account.status_code, 401)
        self.assertEqual(wrong_password.json(), unknown_account.json())
        self.assertEqual(wrong_password.headers["cache-control"], "no-store")

    def test_private_profile_rejects_missing_and_invalid_tokens(self):
        for headers in ({}, {"Authorization": "Bearer " + token_urlsafe(32)}):
            with self.subTest(has_header=bool(headers)):
                response = self.client.get("/api/auth/me", headers=headers)
                self.assertEqual(response.status_code, 401)
                self.assertEqual(response.headers["www-authenticate"], "Bearer")
                self.assertEqual(response.headers["cache-control"], "no-store")

    def test_logout_revokes_only_the_session_that_called_it(self):
        first = self.authorization(self.login())
        second = self.authorization(self.login())
        self.assertNotEqual(first, second)

        result = self.client.post("/api/auth/logout", headers=first)
        self.assertEqual(result.status_code, 204)
        self.assertEqual(result.content, b"")
        self.assertEqual(result.headers["cache-control"], "no-store")
        self.assertEqual(self.client.get("/api/auth/me", headers=first).status_code, 401)
        self.assertEqual(self.client.get("/api/auth/me", headers=second).status_code, 200)

    def test_expired_session_is_rejected(self):
        headers = self.authorization(self.login())
        with connect(self.database) as database:
            database.execute("UPDATE auth_sessions SET expires_at = 0")

        response = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(response.status_code, 401)

    def test_password_and_raw_session_token_are_not_stored(self):
        response = self.login()
        self.authorization(response)
        token = response.json()["access_token"]

        with connect(self.database) as database:
            account = dict(database.execute("SELECT * FROM auth_users").fetchone())
            session = dict(database.execute("SELECT * FROM auth_sessions").fetchone())

        self.assertTrue(account["password_hash"].startswith("$argon2id$"))
        self.assertNotIn(self.password, account.values())
        self.assertNotIn(token, session.values())

    def test_validation_does_not_reflect_a_password(self):
        too_long = token_urlsafe(120)
        response = self.login(password=too_long)
        self.assertEqual(response.status_code, 422)
        self.assertNotIn(too_long, response.text)
        self.assertEqual(response.headers["cache-control"], "no-store")

    def test_validation_redacts_login_input_below_a_url_prefix(self):
        too_long = token_urlsafe(120)
        with TestClient(create_app(self.database), root_path="/service") as client:
            response = client.post("/service/api/auth/login", json={
                "email": self.email,
                "password": too_long,
            })

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json(), {"detail": "Data login tidak valid."})
        self.assertNotIn(too_long, response.text)
        self.assertEqual(response.headers["cache-control"], "no-store")

    def test_malformed_json_does_not_reflect_credentials(self):
        marker = token_urlsafe(24)
        response = self.client.post(
            "/api/auth/login",
            content='{"password":"' + marker,
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(response.status_code, 422)
        self.assertNotIn(marker, response.text)

    def test_failed_attempt_limit_expires_and_is_case_insensitive(self):
        for _ in range(5):
            self.assertEqual(self.login(password=token_urlsafe(24)).status_code, 401)

        response = self.login(email=self.email.upper())
        self.assertEqual(response.status_code, 429)
        self.assertGreater(int(response.headers["retry-after"]), 0)
        self.assertEqual(response.headers["cache-control"], "no-store")

        with connect(self.database) as database:
            database.execute("UPDATE auth_attempts SET reset_at = 0")
        self.assertEqual(self.login().status_code, 200)

    def test_account_creation_rejects_short_passwords_and_duplicates(self):
        with self.assertRaises(ValueError):
            create_account(self.database, "new@example.test", "short")
        with self.assertRaises(sqlite3.IntegrityError):
            create_account(self.database, self.email.upper(), token_urlsafe(24))
        self.assertEqual(self.login().status_code, 200)
