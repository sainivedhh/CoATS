from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cases', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CaseProgress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_of_progress', models.DateField()),
                ('details_of_progress', models.TextField()),
                ('reminder_date', models.DateField(blank=True, null=True)),
                ('further_action_to_be_taken', models.TextField(blank=True)),
                ('remarks', models.TextField(blank=True)),
                ('is_completed', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('case', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='progress_entries', to='cases.case')),
                ('officer', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='progress_entries', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-date_of_progress']},
        ),
    ]
