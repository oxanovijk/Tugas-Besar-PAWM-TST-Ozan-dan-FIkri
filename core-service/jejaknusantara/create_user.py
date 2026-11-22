import argparse
import sqlite3
import sys
import warnings
from getpass import GetPassWarning, getpass

from .auth import create_account
from .database import default_database_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Buat akun uji JejakNusantara secara lokal.")
    parser.parse_args()

    if not sys.stdin.isatty():
        parser.exit(2, "Jalankan perintah ini di terminal interaktif.\n")

    try:
        email = input("Email akun uji: ")
        with warnings.catch_warnings():
            warnings.simplefilter("error", GetPassWarning)
            password = getpass("Kata sandi akun uji: ")
            confirmation = getpass("Ulangi kata sandi: ")
        if password != confirmation:
            parser.exit(2, "Kedua kata sandi harus sama.\n")
        create_account(default_database_path(), email, password)
    except (EOFError, KeyboardInterrupt, GetPassWarning):
        parser.exit(2, "Pembuatan akun dibatalkan.\n")
    except ValueError as error:
        parser.exit(2, f"{error}\n")
    except sqlite3.IntegrityError:
        parser.exit(2, "Akun dengan email tersebut sudah ada.\n")

    print("Akun uji berhasil dibuat.")


if __name__ == "__main__":
    main()
