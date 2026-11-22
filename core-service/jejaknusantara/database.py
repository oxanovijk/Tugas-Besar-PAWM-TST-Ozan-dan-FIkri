import os
import sqlite3
from collections.abc import Iterator
from contextlib import closing, contextmanager
from pathlib import Path


def default_database_path() -> Path:
    return Path(os.environ.get("JEJAK_DATABASE", "data/jejaknusantara.sqlite3"))


@contextmanager
def connect(path: Path) -> Iterator[sqlite3.Connection]:
    with closing(sqlite3.connect(path)) as database:
        database.row_factory = sqlite3.Row
        database.execute("PRAGMA foreign_keys = ON")
        database.create_function("fold_text", 1, str.casefold, deterministic=True)
        with database:
            yield database


def initialize(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with connect(path) as database:
        database.executescript("""
            CREATE TABLE IF NOT EXISTS destinations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                region TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
                longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
                visit_information TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published'))
            );

            CREATE TABLE IF NOT EXISTS cultural_stories (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                narrative TEXT NOT NULL,
                source TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published'))
            );

            CREATE TABLE IF NOT EXISTS destination_stories (
                destination_id TEXT NOT NULL REFERENCES destinations(id),
                story_id TEXT NOT NULL REFERENCES cultural_stories(id),
                PRIMARY KEY (destination_id, story_id)
            );

            CREATE INDEX IF NOT EXISTS destination_stories_by_story
                ON destination_stories (story_id, destination_id);

            CREATE TABLE IF NOT EXISTS auth_users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS auth_sessions (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS auth_sessions_by_expiry
                ON auth_sessions (expires_at);

            CREATE TABLE IF NOT EXISTS auth_attempts (
                email_key TEXT PRIMARY KEY,
                attempts INTEGER NOT NULL,
                reset_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS auth_attempts_by_reset
                ON auth_attempts (reset_at);
        """)
