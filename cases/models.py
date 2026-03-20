from django.db import models
from django.conf import settings
import uuid
import hashlib
import json


class Case(models.Model):

    CASE_STAGE_CHOICES = (
        ('UI', 'Under Investigation'),
        ('PT', 'Pending Trial'),
        ('HC', 'Pending before High Court'),
        ('SC', 'Pending before Supreme Court'),
        ('CC', 'Case Closed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    ps_limit             = models.CharField(max_length=100)
    crime_number         = models.CharField(max_length=100)
    section_of_law       = models.CharField(max_length=200)

    date_of_occurrence   = models.DateField()
    date_of_registration = models.DateField()

    complainant_name  = models.CharField(max_length=200)
    accused_details   = models.TextField()
    gist_of_case      = models.TextField()

    current_stage = models.CharField(
        max_length=2,
        choices=CASE_STAGE_CHOICES,
        default="UI"
    )

    action_to_be_taken     = models.TextField()
    forensic_evidences     = models.TextField(blank=True, default="")
    major_improvements     = models.TextField(blank=True, default="")
    date_of_first_updation = models.DateTimeField(auto_now_add=True)

    # ── Multi-officer support ─────────────────────────────────────
    # current_officer  : who holds the case RIGHT NOW
    # all_officers     : everyone who has ever handled it (M2M)
    current_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="active_cases"
    )
    # Keep old field for backward compat but use current_officer as primary
    case_holding_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cases",
        null=True, blank=True,
    )
    all_officers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="handled_cases",
        blank=True,
    )

    branch = models.CharField(max_length=10)


class CaseHandover(models.Model):
    """
    Records every handover event — who transferred to whom, when, and why.
    These are also written as CaseLog blocks so they appear in the chain.
    """
    case         = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="handovers")
    from_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name="handovers_given"
    )
    to_officer   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name="handovers_received"
    )
    transferred_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name="handovers_authorized"
    )
    reason    = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]


class CaseLog(models.Model):
    """
    Immutable audit log with blockchain-style hash chaining.
    field_changed = 'HANDOVER' for handover events.
    """
    case          = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="logs")
    updated_by    = models.CharField(max_length=150)
    branch        = models.CharField(max_length=50, blank=True)
    field_changed = models.CharField(max_length=100)
    old_value     = models.TextField(blank=True)
    new_value     = models.TextField(blank=True)
    timestamp     = models.DateTimeField(auto_now_add=True)
    ip_address    = models.GenericIPAddressField(null=True, blank=True)
    user_agent    = models.CharField(max_length=255, null=True, blank=True)

    # ── Blockchain fields ─────────────────────────────────────────
    block_hash  = models.CharField(max_length=64, blank=True, editable=False)
    prev_hash   = models.CharField(max_length=64, blank=True, editable=False)
    block_index = models.PositiveIntegerField(default=0, editable=False)

    class Meta:
        ordering = ["timestamp"]

    def compute_hash(self):
        payload = json.dumps({
            "index":         self.block_index,
            "case_id":       str(self.case_id),
            "updated_by":    self.updated_by,
            "branch":        self.branch,
            "field_changed": self.field_changed,
            "old_value":     self.old_value,
            "new_value":     self.new_value,
            "prev_hash":     self.prev_hash,
        }, sort_keys=True)
        return hashlib.sha256(payload.encode()).hexdigest()

    def save(self, *args, **kwargs):
        if not self.block_hash:
            prev = CaseLog.objects.filter(case=self.case).order_by("-block_index").first()
            self.prev_hash   = prev.block_hash if prev else "GENESIS"
            self.block_index = (prev.block_index + 1) if prev else 0
            self.block_hash  = self.compute_hash()
        super().save(*args, **kwargs)


class CaseProgress(models.Model):
    """
    Progress Updation — as specified in the requirements document.
    Each case can have multiple progress entries logged by the Case Holding Officer.
    """
    case                     = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="progress_entries")
    officer                  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="progress_entries")
    date_of_progress         = models.DateField()
    details_of_progress      = models.TextField()
    reminder_date            = models.DateField(null=True, blank=True)
    further_action_to_be_taken = models.TextField(blank=True)
    remarks                  = models.TextField(blank=True)
    is_completed             = models.BooleanField(default=False)   # checkbox to remove from future views
    created_at               = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_of_progress"]

    def __str__(self):
        return f"{self.case.crime_number} — {self.date_of_progress}"
