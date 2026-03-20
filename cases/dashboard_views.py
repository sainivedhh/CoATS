from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import date

from .models import Case
from .ai_classifier import predict_severity

# ── IPC Section → Severity mapping ──────────────────────────────────────────
# Extend this dict to cover all sections your officers use.
IPC_SEVERITY_MAP = {
    # Minor
    "IPC 279": "Minor", "IPC 283": "Minor", "IPC 290": "Minor",
    "IPC 294": "Minor", "IPC 341": "Minor",
    # Bailable
    "IPC 323": "Bailable", "IPC 336": "Bailable", "IPC 379": "Bailable",
    "IPC 420": "Bailable", "IPC 504": "Bailable",
    # Non-Bailable
    "IPC 302": "Non-Bailable", "IPC 307": "Non-Bailable", "IPC 376": "Non-Bailable",
    "IPC 395": "Non-Bailable", "IPC 396": "Non-Bailable",
    # Heinous
    "IPC 120B": "Heinous", "IPC 302r/w120B": "Heinous", "IPC 364A": "Heinous",
    "IPC 376A": "Heinous", "IPC 376D": "Heinous",
}

ACTIVE_STAGES = ["UI", "PT", "HC", "SC"]
CLOSED_STAGE  = "CC"


def get_severity_info(section_of_law: str):
    """
    Determine severity from the section_of_law field.
    Returns (severity_string, is_ai_predicted_boolean, confidence_percentage).
    If it's in the hardcoded map, we use it directly.
    Otherwise, we use the local Machine Learning model.
    """
    s = section_of_law.strip().upper()
    for key, sev in IPC_SEVERITY_MAP.items():
        if key.upper() in s:
            return sev, False, 100
            
    # AI Fallback!
    predicted, confidence = predict_severity(section_of_law)
    return predicted, True, confidence


# ── 1. KPI endpoint ──────────────────────────────────────────────────────────
class DashboardKPIView(APIView):
    """
    GET /api/dashboard/kpi/?branch=Chennai
    Returns:
      {
        total_cases, ui_cases, pt_cases, hc_cases, sc_cases 
      }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == "SUPERVISOR":
            qs = Case.objects.all()
        else:
            qs = Case.objects.filter(all_officers=user)

        branch = request.query_params.get("branch")
        if branch and branch != "All":
            qs = qs.filter(branch=branch)

        return Response({
            "total_cases": qs.count(),
            "ui_cases":    qs.filter(current_stage="UI").count(),
            "pt_cases":    qs.filter(current_stage="PT").count(),
            "hc_cases":    qs.filter(current_stage="HC").count(),
            "sc_cases":    qs.filter(current_stage="SC").count(),
        })

# ── 2. By-severity endpoint ───────────────────────────────────────────────────
class DashboardBySeverityView(APIView):
    """
    GET /api/dashboard/by-severity/
    Returns:
      [
        { "severity": "Minor",        "total": N },
        { "severity": "Bailable",     "total": N },
        { "severity": "Non-Bailable", "total": N },
        { "severity": "Heinous",      "total": N },
      ]
    Severity is derived from section_of_law using IPC_SEVERITY_MAP.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == "SUPERVISOR":
            qs = Case.objects.all()
        else:
            qs = Case.objects.filter(all_officers=user)

        branch = request.query_params.get("branch")
        if branch and branch != "All":
            qs = qs.filter(branch=branch)

        severity_counts = {"Minor": 0, "Bailable": 0, "Non-Bailable": 0, "Heinous": 0}

        for section in qs.values_list("section_of_law", flat=True):
            sev, is_ai, conf = get_severity_info(section)
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        result = [
            {"severity": sev, "total": count}
            for sev, count in severity_counts.items()
        ]
        return Response(result)


# ── 3. Timeline endpoint ──────────────────────────────────────────────────────
class DashboardTimelineView(APIView):
    """
    GET /api/dashboard/timeline/
    Returns monthly case counts (last 12 months):
      [
        { "month": "2025-01-01", "total": N },
        ...
      ]
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == "SUPERVISOR":
            qs = Case.objects.all()
        else:
            qs = Case.objects.filter(all_officers=user)

        branch = request.query_params.get("branch")
        if branch and branch != "All":
            qs = qs.filter(branch=branch)

        date_from = request.query_params.get("date_from")
        date_to   = request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date_of_registration__gte=date_from)
        if date_to:
            qs = qs.filter(date_of_registration__lte=date_to)

        data = (
            qs
            .annotate(month=TruncMonth("date_of_registration"))
            .values("month")
            .annotate(total=Count("id"))
            .order_by("month")
        )

        return Response([
            {
                "month": row["month"].strftime("%Y-%m-%d"),
                "total": row["total"],
            }
            for row in data
        ])


# ── 4. Recent cases endpoint ──────────────────────────────────────────────────
class DashboardRecentCasesView(APIView):
    """
    GET /api/dashboard/recent-cases/
    Returns last 10 cases (newest first):
      [
        {
          "id", "case_number", "ipc_section",
          "severity", "status", "date_of_registration"
        },
        ...
      ]
    """
    permission_classes = [IsAuthenticated]

    STAGE_LABEL = {
        "UI": "Under Investigation",
        "PT": "Pending Trial",
        "HC": "Pending before HC",
        "SC": "Pending before SC",
        "CC": "Closed",
    }

    def get(self, request):
        user = request.user

        if user.role == "SUPERVISOR":
            qs = Case.objects.all()
        else:
            qs = Case.objects.filter(all_officers=user)

        branch = request.query_params.get("branch")
        if branch and branch != "All":
            qs = qs.filter(branch=branch)

        recent = qs.order_by("-date_of_registration", "-date_of_first_updation")[:10]

        data = []
        for c in recent:
            sev, is_ai, conf = get_severity_info(c.section_of_law)
            data.append({
                "id":                    str(c.id),
                "case_number":           c.crime_number,
                "ipc_section":           c.section_of_law,
                "severity":              sev,
                "is_ai_predicted":       is_ai,
                "ai_confidence":         conf,
                "status":                self.STAGE_LABEL.get(c.current_stage, c.current_stage),
                "date_of_registration":  c.date_of_registration.strftime("%Y-%m-%d"),
            })

        return Response(data)

# ── 5. Supervisory Progress Matrix ──────────────────────────────────────────
class DashboardSupervisoryProgressView(APIView):
    """
    GET /api/dashboard/progress-matrix/?branch=...&date_from=...&date_to=...
    Returns all Case Progress logs within a date range with Case details attached.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != "SUPERVISOR":
            return Response({"error": "Unauthorized feature"}, status=403)
            
        from .models import CaseProgress
        qs = CaseProgress.objects.all().select_related("case")
        
        branch = request.query_params.get("branch")
        if branch and branch != "All":
            qs = qs.filter(case__branch=branch)
            
        date_from = request.query_params.get("date_from")
        date_to   = request.query_params.get("date_to")
        
        if date_from:
            qs = qs.filter(date_of_progress__gte=date_from)
        if date_to:
            qs = qs.filter(date_of_progress__lte=date_to)
            
        data = []
        for p in qs.order_by("-date_of_progress"):
            off_name = f"{p.officer.first_name} {p.officer.last_name}".strip() if p.officer and p.officer.first_name else (p.officer.username if p.officer else "Unknown")
            data.append({
                "id": p.id,
                "crime_number": p.case.crime_number,
                "branch": p.case.branch,
                "date_of_progress": p.date_of_progress.strftime("%Y-%m-%d"),
                "officer": off_name,
                "details_of_progress": p.details_of_progress,
                "action_to_be_taken": p.case.action_to_be_taken
            })
            
        return Response(data)
