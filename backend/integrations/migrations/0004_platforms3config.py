from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('integrations', '0003_platformsesconfig'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlatformS3Config',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('region', models.CharField(choices=[('us-east-1', 'US East (N. Virginia)'), ('us-east-2', 'US East (Ohio)'), ('us-west-1', 'US West (N. California)'), ('us-west-2', 'US West (Oregon)'), ('eu-west-1', 'EU (Ireland)'), ('eu-west-2', 'EU (London)'), ('eu-central-1', 'EU (Frankfurt)'), ('ap-south-1', 'Asia Pacific (Mumbai)'), ('ap-southeast-1', 'Asia Pacific (Singapore)'), ('ap-southeast-2', 'Asia Pacific (Sydney)'), ('ap-northeast-1', 'Asia Pacific (Tokyo)')], max_length=20)),
                ('bucket_name', models.CharField(max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Platform S3 Configuration',
                'verbose_name_plural': 'Platform S3 Configuration',
            },
        ),
    ]
