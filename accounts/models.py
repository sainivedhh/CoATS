from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):

    ROLE_CHOICES = (
        ('SUPERVISOR', 'Supervisory Officer'),
        ('CASE', 'Case Holding Officer'),
    )

    BRANCH_CHOICES = (
        ('HQ', 'Headquarters'),
        ('CNI', 'Chennai'),
        ('MDU', 'Madurai'),
        ('CMB', 'Coimbatore'),
    )

    role   = models.CharField(max_length=15, choices=ROLE_CHOICES)
    branch = models.CharField(max_length=10, choices=BRANCH_CHOICES)
    photo  = models.ImageField(upload_to='officer_photos/', blank=True, null=True)
