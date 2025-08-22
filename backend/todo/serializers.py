from rest_framework import serializers
from .models import Todo
from django.contrib.auth.models import User

class TodoSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")  # ← pas besoin de l’envoyer du front
    class Meta:
        model = Todo
        fields = ('id', 'title', 'description',"inprogress", 'completed', 'owner')

    def validate(self, attrs):
        if attrs.get("inprogress") and attrs.get("completed"):
            raise serializers.ValidationError(
                "Une tâche ne peut pas être à la fois 'in progress' et 'completed'."
            )
        return attrs
    

class RegisterSerializer(serializers.ModelSerializer):
        email = serializers.EmailField(required=True)
        first_name = serializers.CharField(required=True)
        last_name = serializers.CharField(required=True)
        password = serializers.CharField(write_only=True, min_length=8)

        class Meta:
            model = User
            fields = ["username", "password", "first_name", "last_name", "email"]      

        def validate_email(self, value):
            if User.objects.filter(email__iexact=value).exists():
                raise serializers.ValidationError("Un compte existe déjà avec cet email.")
            return value     

        def create(self, validated_data):
            # crée l'utilisateur avec mot de passe hashé
            return User.objects.create_user(**validated_data)