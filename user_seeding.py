import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'coats.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# User ID format: Username, Role, Branch, Full Name
USERS_TO_CREATE = [
    # ── SUPERVISORY OFFICERS ──
    ("DIG_ATS", "SUPERVISOR", "HQ", "Adarsh Visvanath"),
    ("SP_ATS_HQ", "SUPERVISOR", "HQ", "Alex Paul"),
    ("SP_ATS_CNI", "SUPERVISOR", "CNI", "Karthik Raj"),
    ("SP_ATS_MDU", "SUPERVISOR", "MDU", "Muthu Vel"),
    ("SP_ATS_CMB", "SUPERVISOR", "CMB", "Saravanan K"),

    # ── CASE HOLDING OFFICERS ──
    # Headquarters
    ("ADSP_HQ", "CASE", "HQ", "Vikram Singh"),
    # Chennai
    ("ADSP_CNI", "CASE", "CNI", "Priya Sharma"),
    ("DSP_CNI", "CASE", "CNI", "Balaji Srinivasan"),
    ("INS1CNI", "CASE", "CNI", "Prakash Kumar"),
    ("INS2CNI", "CASE", "CNI", "Arvind Swamy"),
    ("INS3CNI", "CASE", "CNI", "Meena Iyer"),
    ("INS4CNI", "CASE", "CNI", "Suresh Pillai"),
    # Madurai
    ("ADSP_MDU", "CASE", "MDU", "Dinesh Pandian"),
    ("DSP_MDU", "CASE", "MDU", "Vijayakumar R"),
    ("INS1MDU", "CASE", "MDU", "Selvam Arumugam"),
    ("INS2MDU", "CASE", "MDU", "Anitha Krishnan"),
    ("INS3MDU", "CASE", "MDU", "Prabhu Deva"),
    ("INS4MDU", "CASE", "MDU", "Ramya V"),
    # Coimbatore
    ("ADSP_CMB", "CASE", "CMB", "Gokul N"),
    ("DSP_CMB", "CASE", "CMB", "Sathish Kumar"),
    ("INS1CMB", "CASE", "CMB", "Jeeva R"),
    ("INS2CMB", "CASE", "CMB", "Senthil Murugan"),
    ("INS3CMB", "CASE", "CMB", "Devi Prakash"),
    ("INS4CMB", "CASE", "CMB", "Arun Kumar"),
    
    # System Admin
    ("INSADMIN", "SUPERVISOR", "HQ", "Rajesh Kannan"),
]

def seed_users():
    print("Initializing Official COATS User Provisioning...")
    created_count = 0
    
    # Default password as requested: "to be given" -> We'll use "Password!123" for testing
    DEFAULT_PASS = "Password!123"
    
    for username, role, branch, full_name in USERS_TO_CREATE:
        user, created = User.objects.get_or_create(username=username)
        
        name_parts = full_name.split(" ", 1)
        first = name_parts[0]
        last = name_parts[1] if len(name_parts) > 1 else ""
        
        user.first_name = first
        user.last_name = last
        user.role = role
        user.branch = branch

        if created:
            user.set_password(DEFAULT_PASS)
            
            # Make DIG/Admin superusers for Django Admin access
            if "ADMIN" in username or "DIG" in username:
                user.is_staff = True
                user.is_superuser = True
                
            user.save()
            print(f"[+] Created: {username} | Role: {role} | Branch: {branch}")
            created_count += 1
        else:
            print(f"[*] Updated existing: {username} ({full_name})")
            
        user.save()
            
    print(f"\n✅ Provisioning Complete! Created {created_count} new officers.")
    print(f"🔑 Default Password heavily encrypted in Database: {DEFAULT_PASS}")

if __name__ == "__main__":
    seed_users()
