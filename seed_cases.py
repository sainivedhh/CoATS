import os
import django
import random
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'coats.settings')
django.setup()

from cases.models import Case
from django.contrib.auth import get_user_model

User = get_user_model()

def seed_cases():
    print("🚀 Initializing COATS Case Data Seeder...")
    
    # Get all Case Officers
    case_officers = list(User.objects.filter(role='CASE'))
    if not case_officers:
        print("❌ No case officers found! Please run user_seeding.py first.")
        return

    # Sample realistic AI-analyzable data
    case_blueprints = [
        {
            "ps_limit": "Chennai South",
            "section": "IPC 120B, IPC 302",
            "comp": "Inspector Murugan",
            "accused": "Ramesh 'Bhai' and 3 unknown associates",
            "gist": "Based on intelligence inputs, a heavily armed gang was intercepted at midnight near the harbor. They had explosives and map blueprints of the Central Railway Station, clearly indicating a terror plot under criminal conspiracy to cause mass casualties.",
            "action": "Arrest the remaining 3 associates. Send recovered RDX explosives to forensic lab."
        },
        {
            "ps_limit": "Madurai Central",
            "section": "IPC 395, IPC 396",
            "comp": "SBI Bank Manager",
            "accused": "Unknown gang of 5 masked men",
            "gist": "At 2:00 AM, a group of 5 masked assailants broke into the State Bank of India branch using a heavy industrial gas cutter. They bypassed the biometric security, ripped open the vault, and stole approx 45 Lakhs. A security guard was fatally attacked during their escape.",
            "action": "Analyze CCTV footage. Identify the make of the gas cutter used."
        },
        {
            "ps_limit": "Coimbatore Suburban",
            "section": "IPC 376, IPC 302",
            "comp": "Victim's Father",
            "accused": "Suresh Kumar (32), Delivery Driver",
            "gist": "Victim was found murdered in an abandoned warehouse on the outskirts of the city after being abducted in a white delivery van. Autopsy confirms sexual assault and death by strangulation using a nylon rope.",
            "action": "Track all white delivery vans registered in the district. Cross-reference mobile tower dumps at the warehouse location."
        },
        {
            "ps_limit": "HQ Cyber Cell",
            "section": "IPC 420, IT Act 66D",
            "comp": "Cyber Intelligence Unit",
            "accused": "International Syndicate (IP traced to Eastern Europe)",
            "gist": "A massive credit card skimming and phishing operation was uncovered. The suspects used fake OTP portals masking as official banking websites to siphon over 2 Crores from unaware senior citizens across the state.",
            "action": "Coordinate with Interpol for IP address logs. Freeze all identified shell bank accounts."
        },
        {
            "ps_limit": "Chennai Port",
            "section": "IPC 307, Arms Act",
            "comp": "Sub-Inspector Ravi",
            "accused": "Local mafia enforcer 'Kutty'",
            "gist": "During a routine vehicle check at the port checkpoint, the suspect attempted to run over the barricades and subsequently opened fire at the police patrol using an illegal 9mm pistol. Suspect was apprehended after a brief chase.",
            "action": "Trace the serial number on the 9mm pistol to find the smuggling origin."
        },
        {
            "ps_limit": "Madurai Rural",
            "section": "IPC 302r/w120B",
            "comp": "Village Panchayat Head",
            "accused": "Rival political faction",
            "gist": "A highly coordinated political assassination took place involving country-made crude bombs thrown at the victim's convoy. The explosion killed two people instantly. Suspects fled on unmarked motorcycles.",
            "action": "Interrogate known explosive suppliers in the district. Locate the abandoned motorcycles."
        },
        {
            "ps_limit": "Coimbatore North",
            "section": "IPC 395",
            "comp": "Jewelry Shop Owner",
            "accused": "Four armed men",
            "gist": "A daylight armed robbery at a prominent jewelry showroom. Four men carrying machetes and firearms took hostages, smashed display cases, and looted gold worth 3 Crores within 5 minutes. They escaped in a stolen SUV.",
            "action": "Issue lookout notice for the stolen SUV. Alert all state border checkpoints."
        },
        {
            "ps_limit": "Chennai Cyber Crime",
            "section": "IPC 420",
            "comp": "Multiple Victims",
            "accused": "Fake Call Center Operation",
            "gist": "Suspects ran a fraudulent call center posing as IRS/Tax officials, threatening victims with arrest warrants unless they made immediate payments via cryptocurrency transfers. Over 50 complaints registered.",
            "action": "Raid the identified commercial office space. Seize all hard drives and VoIP servers."
        },
        {
            "ps_limit": "Madurai South",
            "section": "IPC 302",
            "comp": "Local Resident",
            "accused": "Unknown Serial Offender",
            "gist": "The third victim in a span of a month found murdered with identical Modus Operandi—blunt force trauma to the head using a distinctive hammer, left in a dimly lit alleyway near the bus terminus.",
            "action": "Deploy undercover teams at night near all major bus terminuses. Review CCTV for anyone carrying a large bag."
        },
        {
            "ps_limit": "Coimbatore Checkpoint",
            "section": "IPC 120B, NDPS Act",
            "comp": "Narcotics Control Bureau",
            "accused": "Interstate Truck Driver and 2 associates",
            "gist": "Intelligence led to the interception of a transport truck carrying agricultural supplies. A hidden compartment welded into the chassis contained 500 kilograms of contraband narcotics intended for statewide distribution.",
            "action": "Trace the truck's GPS logs to identify the origin warehouse. Arrest the registered owner of the transport company."
        }
    ]

    stages = ["UI", "PT", "HC", "SC", "CLOSED"]
    
    created_count = 0
    for idx, bp in enumerate(case_blueprints):
        officer = random.choice(case_officers)
        branch = officer.branch
        
        # Random dates in the past year
        days_ago_reg = random.randint(10, 360)
        days_ago_occ = days_ago_reg + random.randint(1, 15)
        
        date_occ = datetime.now() - timedelta(days=days_ago_occ)
        date_reg = datetime.now() - timedelta(days=days_ago_reg)
        
        case_stage = random.choice(stages)
        if case_stage == "CLOSED":
            # Just push closed cases to UI for active demo purposes mostly, let's heavily bias them
            case_stage = random.choice(["UI", "PT", "UI", "PT", "HC"])
        
        c = Case.objects.create(
            crime_number=f"CR/{2026}/{101 + idx}",
            section_of_law=bp["section"],
            date_of_occurrence=date_occ.date(),
            date_of_registration=date_reg.date(),
            ps_limit=bp["ps_limit"],
            complainant_name=bp["comp"],
            accused_details=bp["accused"],
            gist_of_case=bp["gist"],
            action_to_be_taken=bp["action"],
            current_stage=case_stage,
            branch=branch,
            case_holding_officer=officer,
            current_officer=officer,
        )
        c.all_officers.add(officer)
        created_count += 1
        print(f"✅ Created Case {c.crime_number} -> Assigned to {officer.username} ({branch}) [Stage: {case_stage}]")

    print(f"\\n🎉 Successfully seeded {created_count} diverse ATS cases into the database!")

if __name__ == "__main__":
    seed_cases()
