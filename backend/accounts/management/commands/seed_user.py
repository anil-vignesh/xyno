from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a default dev user if it does not exist'

    def handle(self, *args, **options):
        username = 'anil'
        email = 'anil@eximpe.com'
        password = 'Test@1234567!'

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'User "{username}" already exists.'))
            return

        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            company_name='Eximpe',
        )
        self.stdout.write(self.style.SUCCESS(f'Created superuser "{username}" ({email})'))
