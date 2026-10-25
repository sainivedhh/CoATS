"""
Create predefined COATS users using operator-supplied passwords.

Set COATS_SUPERVISOR_PASSWORD_<USERNAME> and
COATS_CASE_PASSWORD_<USERNAME> environment variables before running this command.
For usernames containing punctuation, use the username as written with non-alphanumeric
characters replaced by underscores, and use uppercase letters.
"""
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()

SUPERVISORS = [
    {"username": "DIG_ATS", "first_name": "DIG", "last_name": "ATS", "branch": "HQ"},
    {"username": "SP_ATS_HQ", "first_name": "SP", "last_name": "ATS HQ", "branch": "HQ"},
    {"username": "SP_ATS_CNI", "first_name": "SP", "last_name": "ATS CNI", "branch": "CNI"},
    {"username": "SP_ATS_MDU", "first_name": "SP", "last_name": "ATS MDU", "branch": "MDU"},
    {"username": "SP_ATS_CMB", "first_name": "SP", "last_name": "ATS CMB", "branch": "CMB"},
]

CASE_OFFICERS = [
    {"username": "ADSP_HQ", "branch": "HQ"},
    {"username": "INSADMIN", "branch": "HQ"},
    {"username": "ADSP_CNI", "branch": "CNI"},
    {"username": "DSP_CNI", "branch": "CNI"},
    {"username": "INS1CNI", "branch": "CNI"},
    {"username": "INS2CNI", "branch": "CNI"},
    {"username": "INS3CNI", "branch": "CNI"},
    {"username": "INS4CNI", "branch": "CNI"},
    {"username": "ADSP_MDU", "branch": "MDU"},
    {"username": "DSP_MDU", "branch": "MDU"},
    {"username": "INS1MDU", "branch": "MDU"},
    {"username": "INS2MDU", "branch": "MDU"},
    {"username": "INS3MDU", "branch": "MDU"},
    {"username": "INS4MDU", "branch": "MDU"},
    {"username": "ADSP_CMB", "branch": "CMB"},
    {"username": "DSP_CMB", "branch": "CMB"},
    {"username": "INS1CMB", "branch": "CMB"},
    {"username": "INS2CMB", "branch": "CMB"},
    {"username": "INS3CMB", "branch": "CMB"},
    {"username": "INS4CMB", "branch": "CMB"},
]


def password_environment_key(role, username):
    normalized = "".join(character if character.isalnum() else "_" for character in username)
    return f"COATS_{role}_PASSWORD_{normalized.upper()}"


class Command(BaseCommand):
    help = "Create predefined COATS users with passwords supplied through environment variables."

    def handle(self, *args, **options):
        created = 0
        skipped = 0
        missing = []

        for role, users in (("SUPERVISOR", SUPERVISORS), ("CASE", CASE_OFFICERS)):
            for data in users:
                username = data["username"]
                if User.objects.filter(username=username).exists():
                    self.stdout.write(f"Skipping {username}: user already exists.")
                    skipped += 1
                    continue

                password = os.getenv(password_environment_key(role, username), "")
                if not password:
                    missing.append(password_environment_key(role, username))
                    continue

                extra_fields = {
                    "role": role,
                    "branch": data["branch"],
                    "first_name": data.get("first_name", ""),
                    "last_name": data.get("last_name", ""),
                }
                user = User.objects.create_user(
                    username=username,
                    password=password,
                    **extra_fields,
                )
                self.stdout.write(self.style.SUCCESS(f"Created {role} user: {user.username} ({data['branch']})."))
                created += 1

        if missing:
            keys = "\n".join(f"  - {key}" for key in missing)
            raise CommandError(
                "Some users were not created because their passwords were not set. "
                "Set the required environment variables and rerun the command:\n" + keys
            )

        self.stdout.write(self.style.SUCCESS(f"Finished. Created: {created}; skipped existing users: {skipped}."))
