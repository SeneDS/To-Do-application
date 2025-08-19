from rest_framework import serializers
from .models import Todo

class TodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Todo
        fields = ('id', 'title', 'description',"inprogress", 'completed')

    def validate(self, attrs):
        if attrs.get("inprogress") and attrs.get("completed"):
            raise serializers.ValidationError(
                "Une tâche ne peut pas être à la fois 'in progress' et 'completed'."
            )
        return attrs