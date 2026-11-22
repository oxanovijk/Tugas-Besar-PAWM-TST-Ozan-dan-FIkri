from pathlib import Path

from .database import connect, default_database_path, initialize


def seed_demo(path: Path) -> None:
    initialize(path)
    with connect(path) as database:
        database.executemany("""
            INSERT INTO destinations (
                id, name, region, category, description, latitude, longitude,
                visit_information, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO NOTHING
        """, [
            (
                "lembah-ranu", "Lembah Ranu", "Lirang", "Alam",
                "Destinasi rekaan untuk uji penelusuran lembah dan cerita budaya.",
                -6.90, 107.60, "Informasi kunjungan contoh.", "published",
            ),
            (
                "padepokan-sora", "Padepokan Sora", "Lirang", "Budaya",
                "Destinasi rekaan untuk uji keterkaitan tradisi dengan beberapa tempat.",
                -6.91, 107.61, "Informasi kunjungan contoh.", "published",
            ),
            (
                "situs-temu", "Situs Temu", "Lirang", "Budaya",
                "Destinasi rekaan berstatus draf untuk menguji penyaringan publik.",
                -6.92, 107.62, "Informasi kunjungan contoh.", "draft",
            ),
        ])
        database.executemany("""
            INSERT INTO cultural_stories (id, title, category, narrative, source, status)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO NOTHING
        """, [
            (
                "tradisi-lentera", "Tradisi Lentera", "Tradisi",
                "Dalam cerita rekaan ini, warga lembah dan padepokan menyalakan lentera bersama.",
                "Konten fiktif untuk uji API JejakNusantara.", "published",
            ),
            (
                "kidung-senja", "Kidung Senja", "Cerita lokal",
                "Narasi draf rekaan untuk menguji penyaringan publik.",
                "Konten fiktif untuk uji API JejakNusantara.", "draft",
            ),
        ])
        database.executemany("""
            INSERT INTO destination_stories (destination_id, story_id)
            VALUES (?, ?)
            ON CONFLICT (destination_id, story_id) DO NOTHING
        """, [
            ("lembah-ranu", "tradisi-lentera"),
            ("padepokan-sora", "tradisi-lentera"),
            ("situs-temu", "tradisi-lentera"),
            ("lembah-ranu", "kidung-senja"),
        ])


if __name__ == "__main__":
    seed_demo(default_database_path())
    print("Data demo JejakNusantara tersedia.")
