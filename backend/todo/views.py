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
#filtrer par statut via l’API (optionnel)
    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get("status")
        if status == "completed":
            return qs.filter(completed=True)
        if status == "inprogress":
            return qs.filter(inprogress=True)
        if status == "open":
            return qs.filter(completed=False, inprogress=False)
        return qs