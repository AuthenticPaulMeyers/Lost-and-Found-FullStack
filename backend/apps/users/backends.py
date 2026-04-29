from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

class EmailBackend(ModelBackend):
    """
    Custom authentication backend that allows users to log in using their email address.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)
        
        try:
            # Check if the provided username is an email address or a username
            user = UserModel.objects.get(Q(username__iexact=username) | Q(email__iexact=username))
        except UserModel.DoesNotExist:
            return None
        except UserModel.MultipleObjectsReturned:
            # If multiple users shared the same email (shouldn't happen with unique constraint),
            # return the one that matches the literal username if possible
            return UserModel.objects.filter(email__iexact=username).order_by('id').first()
        else:
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        return None
