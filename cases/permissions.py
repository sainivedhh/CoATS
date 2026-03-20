from rest_framework.permissions import BasePermission


class IsCaseOwner(BasePermission):
    """
    Allow GET to everyone (supervisors and all involved officers).
    Allow PATCH only to the current_officer or a SUPERVISOR.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user

        # Supervisors can always view
        if request.method in ("GET", "HEAD", "OPTIONS"):
            if user.role == "SUPERVISOR":
                return True
            # Officers can view cases they are involved in
            return (
                obj.current_officer == user or
                user in obj.all_officers.all()
            )

        # Supervisors blocked in perform_update if needed, but here we allow
        if request.method in ("PATCH", "POST", "PUT"):
            if user.role == "SUPERVISOR":
                return True
            # Allow current officer or any assisting officially attached to the case
            return (
                obj.current_officer == user or
                user in obj.all_officers.all()
            )

        return False
