from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase

from fastapi.testclient import TestClient

from jejaknusantara.api import create_app
from jejaknusantara.seed_demo import seed_demo


class ApiTest(TestCase):
    def setUp(self):
        directory = self.enterContext(TemporaryDirectory())
        self.database = Path(directory) / "test.sqlite3"
        seed_demo(self.database)
        self.client = self.enterContext(TestClient(create_app(self.database)))

    def test_health_checks_the_database(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_filters_can_be_combined(self):
        response = self.client.get(
            "/api/destinations",
            params={"q": " RANU ", "region": "lirang", "category": "alam"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.json()], ["lembah-ranu"])

    def test_search_matches_related_published_story_titles(self):
        response = self.client.get("/api/destinations", params={"q": "lentera"})
        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(
            [item["id"] for item in response.json()],
            ["lembah-ranu", "padepokan-sora"],
        )

    def test_search_treats_sql_wildcards_as_literal_text(self):
        response = self.client.get("/api/destinations", params={"q": "%"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_can_follow_a_story_to_a_second_destination(self):
        destination = self.client.get("/api/destinations/lembah-ranu")
        self.assertEqual(destination.status_code, 200)
        self.assertIn("latitude", destination.json())
        self.assertIn("visit_information", destination.json())
        self.assertEqual(
            [story["id"] for story in destination.json()["stories"]],
            ["tradisi-lentera"],
        )

        story = self.client.get("/api/cultural-stories/tradisi-lentera")
        self.assertEqual(story.status_code, 200)
        self.assertIn("source", story.json())
        self.assertCountEqual(
            [item["id"] for item in story.json()["destinations"]],
            ["lembah-ranu", "padepokan-sora"],
        )

    def test_draft_records_are_hidden_from_list_detail_and_search(self):
        destinations = self.client.get("/api/destinations")
        self.assertEqual(destinations.status_code, 200)
        self.assertCountEqual(
            [item["id"] for item in destinations.json()],
            ["lembah-ranu", "padepokan-sora"],
        )

        for path in (
            "/api/destinations/situs-temu",
            "/api/cultural-stories/kidung-senja",
            "/api/destinations/tidak-ada",
        ):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 404)

        search = self.client.get("/api/destinations", params={"q": "Kidung Senja"})
        self.assertEqual(search.status_code, 200)
        self.assertEqual(search.json(), [])

    def test_rejects_query_longer_than_100_characters(self):
        response = self.client.get("/api/destinations", params={"q": "x" * 101})
        self.assertEqual(response.status_code, 422)

    def test_api_contract_is_available(self):
        response = self.client.get("/openapi.json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("/api/cultural-stories/{story_id}", response.json()["paths"])

    def test_seed_can_be_run_again_without_duplicates(self):
        seed_demo(self.database)
        response = self.client.get("/api/destinations")
        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(
            [item["id"] for item in response.json()],
            ["lembah-ranu", "padepokan-sora"],
        )

    def test_fresh_database_starts_without_demo_records(self):
        fresh_database = self.database.with_name("fresh.sqlite3")
        with TestClient(create_app(fresh_database)) as client:
            response = client.get("/api/destinations")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_trailing_slash_does_not_redirect_behind_the_gateway(self):
        response = self.client.get("/api/destinations/", follow_redirects=False)
        self.assertEqual(response.status_code, 404)

    def test_search_phrase_does_not_join_unrelated_fields(self):
        response = self.client.get("/api/destinations", params={"q": "ranu destinasi"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])
