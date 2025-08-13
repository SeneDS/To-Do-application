from django.shortcuts import render
from rest_framework import viewsets
from .serializers import TodoSerializer
from .models import Todo


from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication


# Create your views here.

class TodoView(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = TodoSerializer
    queryset = Todo.objects.all()