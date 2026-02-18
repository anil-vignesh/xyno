from django.db import migrations


def bootstrap_eximpe_org(apps, schema_editor):
    Organization = apps.get_model('accounts', 'Organization')
    User = apps.get_model('accounts', 'User')

    org, _ = Organization.objects.get_or_create(name='EximPe')
    User.objects.filter(organization__isnull=True).update(organization=org)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_organization_user_organization'),
    ]

    operations = [
        migrations.RunPython(bootstrap_eximpe_org, migrations.RunPython.noop),
    ]
