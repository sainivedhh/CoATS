"""
Management command to create all predefined COATS users from the requirements document.
Run: python manage.py create_coats_users
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

SUPERVISORS = [
    {"username": "DIG_ATS",    "first_name": "DIG",  "last_name": "ATS",    "branch": "HQ",  "password": "coats@DIG2024"},
    {"username": "SP_ATS_HQ",  "first_name": "SP",   "last_name": "ATS HQ", "branch": "HQ",  "password": "coats@SPHQ2024"},
    {"username": "SP_ATS_CNI", "first_name": "SP",   "last_name": "ATS CNI","branch": "CNI", "password": "coats@SPCNI2024"},
    {"username": "SP_ATS_MDU", "first_name": "SP",   "last_name": "ATS MDU","branch": "MDU", "password": "coats@SPMDU2024"},
    {"username": "SP_ATS_CMB", "first_name": "SP",   "last_name": "ATS CMB","branch": "CMB", "password": "coats@SPCMB2024"},
]

CASE_OFFICERS = [
    # HQ
    {"username": "ADSP_HQ",   "branch": "HQ",  "password": "coats@ADSPHQ2024"},
    {"username": "INSADMIN",   "branch": "HQ",  "password": "coats@INSADMIN2024"},
    # Chennai
    {"username": "ADSP_CNI",  "branch": "CNI", "password": "coats@ADSPCNI2024"},
    {"username": "DSP_CNI",   "branch": "CNI", "password": "coats@DSPCNI2024"},
    {"username": "INS1CNI",   "branch": "CNI", "password": "coats@INS1CNI2024"},
    {"username": "INS2CNI",   "branch": "CNI", "password": "coats@INS2CNI2024"},
    {"username": "INS3CNI",   "branch": "CNI", "password": "coats@INS3CNI2024"},
    {"username": "INS4CNI",   "branch": "CNI", "password": "coats@INS4CNI2024"},
    # Madurai
    {"username": "ADSP_MDU",  "branch": "MDU", "password": "coats@ADSPMDU2024"},
    {"username": "DSP_MDU",   "branch": "MDU", "password": "coats@DSPMDU2024"},
    {"username": "INS1MDU",   "branch": "MDU", "password": "coats@INS1MDU2024"},
    {"username": "INS2MDU",   "branch": "MDU", "password": "coats@INS2MDU2024"},
    {"username": "INS3MDU",   "branch": "MDU", "password": "coats@INS3MDU2024"},
    {"username": "INS4MDU",   "branch": "MDU", "password": "coats@INS4MDU2024"},
    # Coimbatore
    {"username": "ADSP_CMB",  "branch": "CMB", "password": "coats@ADSPCMB2024"},
    {"username": "DSP_CMB",   "branch": "CMB", "password": "coats@DSPCMB2024"},
    {"username": "INS1CMB",   "branch": "CMB", "password": "coats@INS1CMB2024"},
    {"username": "INS2CMB",   "branch": "CMB", "password": "coats@INS2CMB2024"},
    {"username": "INS3CMB",   "branch": "CMB", "password": "coats@INS3CMB2024"},
    {"username": "INS4CMB",   "branch": "CMB", "password": "coats@INS4CMB2024"},
]


class Command(BaseCommand):
    help = "Create all predefined COATS users from the requirements document"

    def handle(self, *args, **options):
        created = 0
        skipped = 0

        for data in SUPERVISORS:
            if User.objects.filter(username=data["username"]).exists():
                self.stdout.write(f"  ⏭  {data['username']} already exists")
                skipped += 1
                continue
            u = User.objects.create_user(
                username=data["username"],
                password=data["password"],
                first_name=data.get("first_name", ""),
                last_name=data.get("last_name", ""),
                role="SUPERVISOR",
                branch=data["branch"],
            )
            self.stdout.write(self.style.SUCCESS(f"  ✓ Created SUPERVISOR: {u.username} / {data['branch']}"))
            created += 1

        for data in CASE_OFFICERS:
            if User.objects.filter(username=data["username"]).exists():
                self.stdout.write(f"  ⏭  {data['username']} already exists")
                skipped += 1
                continue
            u = User.objects.create_user(
                username=data["username"],
                password=data["password"],
                role="CASE",
                branch=data["branch"],
            )
            self.stdout.write(self.style.SUCCESS(f"  ✓ Created CASE OFFICER: {u.username} / {data['branch']}"))
            created += 1

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"Done. Created: {created}  Skipped (already exist): {skipped}"))
        self.stdout.write("")
        self.stdout.write("Default passwords are username-based. Change them via Django admin.")
