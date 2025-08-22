from rest_framework import viewsets, permissions, generics, status, response
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Todo
from .serializers import TodoSerializer, RegisterSerializer

class TodoViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TodoSerializer

    # ← renvoie uniquement les todos de l'utilisateur connecté
    def get_queryset(self):
        status_param = self.request.query_params.get("status")
        qs = Todo.objects.filter(owner=self.request.user).order_by("-id")
        if status_param == "completed":
            return qs.filter(completed=True)
        if status_param == "inprogress":
            return qs.filter(inprogress=True, completed=False)
        if status_param == "open":
            return qs.filter(inprogress=False, completed=False)
        return qs

    # ← attache automatiquement le owner à la création
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        # renvoyer directement les tokens pour connecter l’utilisateur côté front
        refresh = RefreshToken.for_user(user)
        return response.Response(
            {"access": str(refresh.access_token), "refresh": str(refresh)},
            status=status.HTTP_201_CREATED,
        )
