from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from .models import Case, CaseLog, CaseHandover
from .serializers import CaseSerializer, CaseLogSerializer, CaseHandoverSerializer, OfficerMiniSerializer
from .permissions import IsCaseOwner

User = get_user_model()


# ── Activity log list ─────────────────────────────────────────────
class CaseLogListView(generics.ListAPIView):
    serializer_class   = CaseLogSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def get_queryset(self):
        qs = CaseLog.objects.select_related("case").all()
        if self.request.user.role == "CASE":
            qs = qs.filter(updated_by=self.request.user.username)
        return qs


# ── Case list + create ────────────────────────────────────────────
class CaseListCreateView(generics.ListCreateAPIView):
    serializer_class = CaseSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def get_queryset(self):
        user = self.request.user
        if user.role == "SUPERVISOR":
            return Case.objects.all()
        from django.db.models import Q
        return Case.objects.filter(
            Q(all_officers=user) | Q(current_officer=user)
        ).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != "CASE":
            raise PermissionDenied("Only Case Officers can create cases.")
        case = serializer.save(
            case_holding_officer=user,
            current_officer=user,
            branch=user.branch,
        )
        case.all_officers.add(user)


# ── Case detail + update ──────────────────────────────────────────
TRACKED_FIELDS = [
    "current_stage", "action_to_be_taken", "section_of_law",
    "complainant_name", "accused_details", "gist_of_case", "ps_limit",
]

class CaseDetailUpdateView(RetrieveUpdateAPIView):
    queryset = Case.objects.all()
    serializer_class = CaseSerializer
    permission_classes = [IsAuthenticated, IsCaseOwner]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        for field in TRACKED_FIELDS:
            if field in request.data:
                old_val = getattr(instance, field, "")
                new_val = request.data[field]
                if str(old_val) != str(new_val):
                    log = CaseLog.objects.create(
                        case=instance,
                        updated_by=request.user.username,
                        branch=getattr(request.user, "branch", ""),
                        field_changed=field,
                        old_value=str(old_val),
                        new_value=str(new_val),
                        ip_address=request.META.get('REMOTE_ADDR'),
                        user_agent=request.META.get('HTTP_USER_AGENT'),
                    )
                    # Blockchain TX printed to Django console
                    print(f"🔗 Blockchain TX: 0x{log.block_hash}")
                    print(f"   Block #{log.block_index} | {field}: '{old_val}' → '{new_val}'")
                    print(f"   Prev:  0x{log.prev_hash}")

        return super().partial_update(request, *args, **kwargs)

    def perform_update(self, serializer):
        # FIX: indentation bug — lines below were outside the method body
        if self.request.user.role != "CASE":
            raise PermissionDenied("Supervisors cannot update cases.")
        serializer.save()


# ── Progress Updation (from doc) ──────────────────────────────────
class CaseProgressView(APIView):
    """
    GET  /api/cases/<uuid:pk>/progress/  — list all progress entries
    POST /api/cases/<uuid:pk>/progress/  — add a progress entry
    """
    permission_classes = [IsAuthenticated, IsCaseOwner]

    def get(self, request, pk):
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({"detail": "Case not found."}, status=404)

        from .models import CaseProgress
        from .serializers import CaseProgressSerializer
        entries = CaseProgress.objects.filter(case=case).order_by("-date_of_progress")
        return Response(CaseProgressSerializer(entries, many=True).data)

    def post(self, request, pk):
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({"detail": "Case not found."}, status=404)

        if request.user.role != "CASE":
            raise PermissionDenied("Only Case Officers can add progress.")

        from .models import CaseProgress
        from .serializers import CaseProgressSerializer
        serializer = CaseProgressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        progress = serializer.save(case=case, officer=request.user)

        # When further_action_to_be_taken is filled, update case's action_to_be_taken
        if progress.further_action_to_be_taken:
            old_action = case.action_to_be_taken
            case.action_to_be_taken = progress.further_action_to_be_taken
            case.save()
            log = CaseLog.objects.create(
                case=case,
                updated_by=request.user.username,
                branch=getattr(request.user, "branch", ""),
                field_changed="action_to_be_taken",
                old_value=old_action,
                new_value=progress.further_action_to_be_taken,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT'),
            )
            print(f"🔗 Blockchain TX: 0x{log.block_hash}")

        return Response(CaseProgressSerializer(progress).data, status=201)


class CaseProgressCheckView(APIView):
    """PATCH /api/progress/<int:pk>/complete/ — mark a progress item done"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        from .models import CaseProgress
        try:
            progress = CaseProgress.objects.get(pk=pk)
        except CaseProgress.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        if request.user.role != "CASE":
            raise PermissionDenied("Only Case Officers can mark progress.")

        progress.is_completed = True
        progress.save()
        return Response({"detail": "Marked as completed."})


# ── Case Handover ─────────────────────────────────────────────────
class CaseHandoverView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != "SUPERVISOR":
            raise PermissionDenied("Only supervisors can authorize case handovers.")

        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({"detail": "Case not found."}, status=404)

        to_username = request.data.get("to_officer_username", "").strip()
        reason      = request.data.get("reason", "").strip()

        if not to_username:
            raise ValidationError({"to_officer_username": "This field is required."})

        try:
            to_officer = User.objects.get(username=to_username, role="CASE")
        except User.DoesNotExist:
            raise ValidationError({"to_officer_username": f"No case officer with username '{to_username}' found."})

        from_officer = case.current_officer
        if from_officer == to_officer:
            raise ValidationError({"to_officer_username": "Case is already assigned to this officer."})

        case.current_officer = to_officer
        case.case_holding_officer = to_officer
        case.all_officers.add(to_officer)
        case.save()

        handover = CaseHandover.objects.create(
            case=case,
            from_officer=from_officer,
            to_officer=to_officer,
            transferred_by=request.user,
            reason=reason,
        )

        from_name = from_officer.username if from_officer else "unassigned"
        log = CaseLog.objects.create(
            case=case,
            updated_by=request.user.username,
            branch=getattr(request.user, "branch", ""),
            field_changed="HANDOVER",
            old_value=from_name,
            new_value=to_officer.username,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
        )
        print(f"🔗 Blockchain TX (HANDOVER): 0x{log.block_hash}")

        return Response({
            "detail": f"Case handed over from {from_name} to {to_officer.username}.",
            "handover": CaseHandoverSerializer(handover, context={"request": request}).data,
        }, status=200)


# ── Handover history ──────────────────────────────────────────────
class CaseHandoverHistoryView(generics.ListAPIView):
    serializer_class   = CaseHandoverSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def get_queryset(self):
        return CaseHandover.objects.filter(case_id=self.kwargs["pk"]).select_related(
            "from_officer", "to_officer", "transferred_by"
        )


# ── Officers list ─────────────────────────────────────────────────
class CaseOfficersListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        officers = User.objects.filter(role="CASE").order_by("username")
        data = OfficerMiniSerializer(officers, many=True, context={"request": request}).data
        return Response(data)


# ── Chain of Custody ──────────────────────────────────────────────
class ChainOfCustodyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({"detail": "Case not found."}, status=404)

        logs = CaseLog.objects.filter(case=case).order_by("timestamp")
        serializer = CaseLogSerializer(logs, many=True, context={"request": request})
        officers = OfficerMiniSerializer(case.all_officers.all(), many=True, context={"request": request}).data
        current  = OfficerMiniSerializer(case.current_officer, context={"request": request}).data if case.current_officer else None

        return Response({
            "case_id":         str(case.id),
            "crime_number":    case.crime_number,
            "total_blocks":    logs.count(),
            "current_officer": current,
            "all_officers":    officers,
            "custody_chain":   serializer.data,
        })


# ── Blockchain verification ───────────────────────────────────────
class ChainVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({"detail": "Case not found."}, status=404)

        logs = list(CaseLog.objects.filter(case=case).order_by("block_index"))
        blocks = []
        chain_intact = True

        for i, log in enumerate(logs):
            recomputed = log.compute_hash()
            hash_valid = (log.block_hash == recomputed)
            link_valid = (log.prev_hash == "GENESIS") if i == 0 else (log.prev_hash == logs[i - 1].block_hash)
            valid = hash_valid and link_valid
            if not valid:
                chain_intact = False
            blocks.append({
                "block_index": log.block_index, "updated_by": log.updated_by,
                "field_changed": log.field_changed, "timestamp": log.timestamp,
                "block_hash": log.block_hash, "prev_hash": log.prev_hash,
                "expected_hash": recomputed, "hash_valid": hash_valid,
                "link_valid": link_valid, "valid": valid,
            })

        return Response({
            "case_id": str(case.id), "crime_number": case.crime_number,
            "total_blocks": len(blocks), "chain_intact": chain_intact, "blocks": blocks,
        })


# ── Supervisor dashboard with date range + branch filter (from doc) ──
class SupervisorCaseOverview(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "SUPERVISOR":
            return Response({"detail": "Forbidden"}, status=403)

        qs = Case.objects.all()

        # Branch filter
        branch = request.query_params.get("branch")
        if branch:
            qs = qs.filter(branch=branch)

        # Date range filter (on date_of_registration)
        date_from = request.query_params.get("date_from")
        date_to   = request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date_of_registration__gte=date_from)
        if date_to:
            qs = qs.filter(date_of_registration__lte=date_to)

        pending = ["UI", "PT", "HC", "SC"]
        return Response({
            "total":    qs.count(),
            "UI":       qs.filter(current_stage="UI").count(),
            "PT":       qs.filter(current_stage="PT").count(),
            "HC":       qs.filter(current_stage="HC").count(),
            "SC":       qs.filter(current_stage="SC").count(),
            "CC":       qs.filter(current_stage="CC").count(),
            "pending":  CaseSerializer(qs.filter(current_stage__in=pending), many=True, context={"request": request}).data,
            "closed":   CaseSerializer(qs.filter(current_stage="CC"), many=True, context={"request": request}).data,
        })
