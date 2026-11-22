from pathlib import Path
from secrets import token_urlsafe
from tempfile import TemporaryDirectory
from unittest import TestCase

from fastapi.testclient import TestClient

from jejaknusantara.api import create_app
from jejaknusantara.auth import create_account
from jejaknusantara.database import connect
from jejaknusantara.seed_demo import seed_demo


FAVORITES = "/api/me/favorites"
RANU = "/api/me/favorites/lembah-ranu"


class FavoritesTest(TestCase):
    def setUp(self):
        directory = self.enterContext(TemporaryDirectory())
        self.database = Path(directory) / "test.sqlite3"
        seed_demo(self.database)
        self.client = self.enterContext(TestClient(create_app(self.database)))
        self.headers = self.login_as("first@example.test")

    def login_as(self, email):
        password = token_urlsafe(24)
        create_account(self.database, email, password)
        login = self.client.post("/api/auth/login", json={"email": email, "password": password})
        self.assertEqual(login.status_code, 200)
        return {"Authorization": "Bearer " + login.json()["access_token"]}

    def test_requires_a_valid_session_for_all_methods(self):
        for method, url in (("GET", FAVORITES), ("PUT", RANU), ("DELETE", RANU)):
            for headers in ({}, {"Authorization": "Bearer " + token_urlsafe(32)}):
                with self.subTest(method=method, has_header=bool(headers)):
                    response = self.client.request(method, url, headers=headers)
                    self.assertEqual(response.status_code, 401)
                    self.assertEqual(response.headers.get("www-authenticate"), "Bearer")
                    self.assertEqual(response.headers.get("cache-control"), "no-store")

    def test_empty_list_is_private(self):
        response = self.client.get(FAVORITES, headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])
        self.assertEqual(response.headers.get("cache-control"), "no-store")

    def test_repeated_put_returns_one_catalog_entry(self):
        for _ in range(2):
            result = self.client.put(RANU, headers=self.headers)
            self.assertEqual(result.status_code, 204)
            self.assertEqual(result.content, b"")
            self.assertEqual(result.headers.get("cache-control"), "no-store")

        response = self.client.get(FAVORITES, headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        item = response.json()[0]
        self.assertEqual(item["id"], "lembah-ranu")
        self.assertEqual(item["name"], "Lembah Ranu")
        self.assertEqual(set(item), {"id", "name", "region", "category", "description"})

    def test_accounts_can_save_the_same_destination_independently(self):
        second = self.login_as("second@example.test")
        self.assertEqual(self.client.put(RANU, headers=self.headers).status_code, 204)
        self.assertEqual(self.client.get(FAVORITES, headers=second).json(), [])
        self.assertEqual(self.client.put(RANU, headers=second).status_code, 204)
        self.assertEqual(self.client.delete(RANU, headers=second).status_code, 204)

        self.assertEqual(self.client.get(FAVORITES, headers=second).json(), [])
        first_items = self.client.get(FAVORITES, headers=self.headers).json()
        self.assertEqual([item["id"] for item in first_items], ["lembah-ranu"])

    def test_delete_is_idempotent(self):
        self.assertEqual(self.client.put(RANU, headers=self.headers).status_code, 204)
        for _ in range(2):
            result = self.client.delete(RANU, headers=self.headers)
            self.assertEqual(result.status_code, 204)
            self.assertEqual(result.headers.get("cache-control"), "no-store")
        self.assertEqual(self.client.get(FAVORITES, headers=self.headers).json(), [])

    def test_unknown_and_draft_destinations_cannot_be_saved(self):
        for destination in ("tidak-ada", "situs-temu"):
            with self.subTest(destination=destination):
                result = self.client.put(f"{FAVORITES}/{destination}", headers=self.headers)
                self.assertEqual(result.status_code, 404)
                self.assertEqual(result.headers.get("cache-control"), "no-store")
        self.assertEqual(self.client.get(FAVORITES, headers=self.headers).json(), [])

    def test_unpublished_favorite_is_hidden_and_can_still_be_removed(self):
        self.assertEqual(self.client.put(RANU, headers=self.headers).status_code, 204)
        with connect(self.database) as database:
            database.execute("UPDATE destinations SET status = 'draft' WHERE id = 'lembah-ranu'")

        self.assertEqual(self.client.get(FAVORITES, headers=self.headers).json(), [])
        self.assertEqual(self.client.put(RANU, headers=self.headers).status_code, 404)
        self.assertEqual(self.client.delete(RANU, headers=self.headers).status_code, 204)
        with connect(self.database) as database:
            database.execute("UPDATE destinations SET status = 'published' WHERE id = 'lembah-ranu'")
        self.assertEqual(self.client.get(FAVORITES, headers=self.headers).json(), [])

    def test_revoked_token_no_longer_opens_favorites(self):
        self.assertEqual(self.client.post("/api/auth/logout", headers=self.headers).status_code, 204)
        response = self.client.get(FAVORITES, headers=self.headers)
        self.assertEqual(response.status_code, 401)
