from django.db import models
from django.db.models import Q

# Create your models here.
class Todo(models.Model):
    title = models.CharField(max_length=120)
    description = models.TextField()
    inprogress = models.BooleanField(default=False)
    completed = models.BooleanField(default=False)
   ## MedalType = models.TextChoices("MedalType", "GOLD SILVER BRONZE")

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=~(Q(inprogress=True) & Q(completed=True)),
                name="todo_not_both_true",
            )
        ]

    def __str__(self):
        return self.title