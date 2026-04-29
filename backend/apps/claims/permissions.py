from rest_framework import permissions

class IsClaimerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow claimers to edit or delete their claims.
    Item posters can still view (GET/HEAD/OPTIONS).
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        # This allows the item poster to see the claim details.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions (PUT, PATCH, DELETE) are only allowed to the claimer.
        return obj.claimer.user == request.user
