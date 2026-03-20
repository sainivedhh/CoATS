from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Case, CaseLog, CaseHandover, CaseProgress

User = get_user_model()


def officer_photo_url(username, request):
    try:
        u = User.objects.get(username=username)
        if u.photo and request:
            return request.build_absolute_uri(u.photo.url)
    except User.DoesNotExist:
        pass
    return None


class OfficerMiniSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ["id", "username", "first_name", "last_name", "branch", "photo_url"]

    def get_photo_url(self, obj):
        request = self.context.get("request")
        if obj.photo and request:
            return request.build_absolute_uri(obj.photo.url)
        return None


class CaseSerializer(serializers.ModelSerializer):
    case_holding_officer_username = serializers.CharField(
        source="case_holding_officer.username", read_only=True
    )
    current_officer_detail = OfficerMiniSerializer(source="current_officer", read_only=True)
    all_officers_detail    = OfficerMiniSerializer(source="all_officers", many=True, read_only=True)

    class Meta:
        model = Case
        fields = "__all__"
        read_only_fields = [
            "id", "branch",
            "case_holding_officer", "case_holding_officer_username",
            "current_officer", "current_officer_detail",
            "all_officers", "all_officers_detail",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        
        if request:
            if instance.current_officer:
                data["current_officer_detail"] = OfficerMiniSerializer(
                    instance.current_officer, context={"request": request}
                ).data
            data["all_officers_detail"] = OfficerMiniSerializer(
                instance.all_officers.all(), many=True, context={"request": request}
            ).data
            
            # Role-Based Data Redaction logic
            if hasattr(request, "user") and request.user.is_authenticated:
                user = request.user
                is_supervisor = user.role == "SUPERVISOR"
                is_assigned = user in instance.all_officers.all()
                
                if not is_supervisor and not is_assigned:
                    redact_msg = "*** CLASSIFIED INTELLIGENCE - NEED TO KNOW ACCESS ONLY ***"
                    for field in ["accused_details", "forensic_evidences", "major_improvements"]:
                        if data.get(field):
                            data[field] = redact_msg
                    
                    if data.get("gist_of_case"):
                        data["gist_of_case"] = "Details classified. " + redact_msg

        return data


class CaseHandoverSerializer(serializers.ModelSerializer):
    from_officer_detail    = OfficerMiniSerializer(source="from_officer",    read_only=True)
    to_officer_detail      = OfficerMiniSerializer(source="to_officer",      read_only=True)
    transferred_by_detail  = OfficerMiniSerializer(source="transferred_by",  read_only=True)

    class Meta:
        model  = CaseHandover
        fields = [
            "id", "case",
            "from_officer", "from_officer_detail",
            "to_officer",   "to_officer_detail",
            "transferred_by", "transferred_by_detail",
            "reason", "timestamp",
        ]
        read_only_fields = ["id", "case", "timestamp", "transferred_by",
                            "from_officer_detail", "to_officer_detail", "transferred_by_detail"]


class CaseLogSerializer(serializers.ModelSerializer):
    crime_number  = serializers.CharField(source="case.crime_number", read_only=True)
    case_id       = serializers.UUIDField(source="case.id",           read_only=True)
    officer_photo = serializers.SerializerMethodField()

    class Meta:
        model  = CaseLog
        fields = [
            "id", "case_id", "crime_number",
            "updated_by", "officer_photo",
            "branch", "field_changed",
            "old_value", "new_value", "timestamp",
            "block_hash", "prev_hash", "block_index",
        ]

    def get_officer_photo(self, obj):
        return officer_photo_url(obj.updated_by, self.context.get("request"))


class CaseProgressSerializer(serializers.ModelSerializer):
    officer_username = serializers.CharField(source="officer.username", read_only=True)
    current_action   = serializers.SerializerMethodField()

    class Meta:
        model  = CaseProgress
        fields = [
            "id", "case", "officer", "officer_username",
            "date_of_progress", "details_of_progress",
            "reminder_date", "further_action_to_be_taken",
            "remarks", "is_completed", "current_action", "created_at",
        ]
        read_only_fields = ["id", "case", "officer", "officer_username", "current_action", "created_at"]

    def get_current_action(self, obj):
        return obj.case.action_to_be_taken
