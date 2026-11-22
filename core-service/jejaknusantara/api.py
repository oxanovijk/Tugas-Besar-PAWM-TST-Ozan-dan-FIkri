import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from .database import connect, default_database_path, initialize


class DestinationSummary(BaseModel):
    id: str
    name: str
    region: str
    category: str
    description: str


class StorySummary(BaseModel):
    id: str
    title: str
    category: str


class DestinationDetail(DestinationSummary):
    latitude: float
    longitude: float
    visit_information: str
    stories: list[StorySummary]


class StoryDetail(StorySummary):
    narrative: str
    source: str
    destinations: list[DestinationSummary]


class HealthStatus(BaseModel):
    status: Literal["ok"]


def create_app(database_path: Path | None = None) -> FastAPI:
    path = database_path if database_path is not None else default_database_path()

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        initialize(path)
        yield

    app = FastAPI(
        title="JejakNusantara API",
        version="0.1.0",
        description="Katalog destinasi wisata lokal dan cerita budaya yang sudah terbit.",
        lifespan=lifespan,
        redoc_url=None,
        redirect_slashes=False,
    )

    @app.get(
        "/api/health",
        response_model=HealthStatus,
        responses={503: {"description": "Database tidak tersedia"}},
    )
    def health():
        try:
            with connect(path) as database:
                database.execute("SELECT 1 FROM destinations LIMIT 1").fetchone()
        except sqlite3.Error as error:
            raise HTTPException(status_code=503, detail="Database tidak tersedia") from error
        return {"status": "ok"}

    @app.get("/api/destinations", response_model=list[DestinationSummary])
    def list_destinations(
        q: Annotated[str, Query(max_length=100, description="Kata kunci destinasi atau judul cerita")] = "",
        region: Annotated[str, Query(max_length=100, description="Nama wilayah")] = "",
        category: Annotated[str, Query(max_length=100, description="Kategori destinasi")] = "",
    ):
        filters = {
            "q": q.strip().casefold(),
            "region": region.strip().casefold(),
            "category": category.strip().casefold(),
        }
        with connect(path) as database:
            rows = database.execute("""
                SELECT d.id, d.name, d.region, d.category, d.description
                FROM destinations AS d
                WHERE d.status = 'published'
                  AND (:region = '' OR fold_text(d.region) = :region)
                  AND (:category = '' OR fold_text(d.category) = :category)
                  AND (
                      :q = ''
                      OR instr(fold_text(d.name), :q) > 0
                      OR instr(fold_text(d.description), :q) > 0
                      OR EXISTS (
                          SELECT 1
                          FROM destination_stories AS link
                          JOIN cultural_stories AS s ON s.id = link.story_id
                          WHERE link.destination_id = d.id
                            AND s.status = 'published'
                            AND instr(fold_text(s.title), :q) > 0
                      )
                  )
                ORDER BY fold_text(d.name), d.id
            """, filters).fetchall()
        return [dict(row) for row in rows]

    @app.get(
        "/api/destinations/{destination_id}",
        response_model=DestinationDetail,
        responses={404: {"description": "Destinasi tidak ditemukan"}},
    )
    def get_destination(destination_id: str):
        with connect(path) as database:
            destination = database.execute(
                "SELECT * FROM destinations WHERE id = ? AND status = 'published'",
                (destination_id,),
            ).fetchone()
            if destination is None:
                raise HTTPException(status_code=404, detail="Destinasi tidak ditemukan")

            stories = database.execute("""
                SELECT s.id, s.title, s.category
                FROM cultural_stories AS s
                JOIN destination_stories AS link ON link.story_id = s.id
                WHERE link.destination_id = ? AND s.status = 'published'
                ORDER BY fold_text(s.title), s.id
            """, (destination_id,)).fetchall()
        return {**dict(destination), "stories": [dict(story) for story in stories]}

    @app.get(
        "/api/cultural-stories/{story_id}",
        response_model=StoryDetail,
        responses={404: {"description": "Cerita budaya tidak ditemukan"}},
    )
    def get_story(story_id: str):
        with connect(path) as database:
            story = database.execute(
                "SELECT * FROM cultural_stories WHERE id = ? AND status = 'published'",
                (story_id,),
            ).fetchone()
            if story is None:
                raise HTTPException(status_code=404, detail="Cerita budaya tidak ditemukan")

            destinations = database.execute("""
                SELECT d.id, d.name, d.region, d.category, d.description
                FROM destinations AS d
                JOIN destination_stories AS link ON link.destination_id = d.id
                WHERE link.story_id = ? AND d.status = 'published'
                ORDER BY fold_text(d.name), d.id
            """, (story_id,)).fetchall()
        return {**dict(story), "destinations": [dict(destination) for destination in destinations]}

    return app
