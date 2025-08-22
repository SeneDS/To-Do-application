from django.db import models
from django.db.models import Q
from django.contrib.auth.models import User

class Todo(models.Model):
    owner = models.ForeignKey(  # ← lie chaque todo à un user
        User, on_delete=models.CASCADE, related_name="todos",
        null=True, blank=True  # mets null=True pour ne pas casser les anciennes lignes
    )
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    inprogress = models.BooleanField(default=False)
    completed = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=~(Q(inprogress=True) & Q(completed=True)),
                name="todo_not_both_true",
            )
        ]

    def __str__(self):
        return self.title
