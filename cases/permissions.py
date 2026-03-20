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

        # Only current_officer can update (PATCH)
        if request.method == "PATCH":
            if user.role == "SUPERVISOR":
                return True   # supervisors blocked in perform_update, not here
            return obj.current_officer == user

        return False
