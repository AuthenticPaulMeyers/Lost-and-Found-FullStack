from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.users'
    verbose_name = 'Users'

    def ready(self):
        """
        Monkeypatch Django's BaseContext to fix a compatibility issue with Python 3.14.
        Python 3.14's super() behavior causes copy(super()) to return a super object
        instead of a copied instance, leading to AttributeErrors in the admin.
        """
        from django.template.context import BaseContext
        import copy

        def patched_copy(self):
            # Create a shallow copy of the instance without using copy(super())
            cls = self.__class__
            duplicate = cls.__new__(cls)
            duplicate.__dict__.update(self.__dict__)
            # Manually handle the dicts attribute as BaseContext does
            if hasattr(self, 'dicts'):
                duplicate.dicts = self.dicts[:]
            return duplicate
        
        BaseContext.__copy__ = patched_copy

        # Import signals to register them
        import apps.users.signals  # noqa
