# tests/test_auth_and_todos.py
# -*- coding: utf-8 -*-
"""
Tests d'intégration Django REST Framework + SimpleJWT
-----------------------------------------------------
Objectifs :
- Vérifier l'authentification JWT (obtain pair, refresh, accès protégé).
- Vérifier la sécurité et le comportement de l'API Todo (filtrage par owner, filtres status).
- Fournir des exemples clairs pour débutant avec la structure AAA (Arrange–Act–Assert).

Conventions :
- Nommage : test_<comportement>_<condition>_<resultat_attendu>
- Chaque test est indépendant (données créées dans le test).
- Les endpoints ci-dessous peuvent être adaptés si ton routeur diffère.
"""

import time
from datetime import timedelta
from typing import Tuple

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

# Tous les tests utilisent la base de données
pytestmark = pytest.mark.django_db

# === Endpoints (adapte si besoin à ton routeur/urls) ==========================
REGISTER_URL = "/api/register/"
TOKEN_URL    = "/api/token/"
REFRESH_URL  = "/api/token/refresh/"
TODOS_URL    = "/api/todos/"
USERS_URL    = "/api/users/"

# === Helpers =================================================================

def _auth_client_with_access(access_token: str) -> APIClient:
    """
    Crée un client API authentifié avec un header Bearer prêt à l'emploi.
    """
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    return client


def _short_lived_pair_for_user(user, seconds: int = 1) -> Tuple[str, str]:
    """
    Crée un couple (access, refresh) où l'access expire rapidement.
    Utile pour simuler un 401 → puis un refresh côté client (comme ton interceptor React).
    """
    rt = RefreshToken.for_user(user)      # refresh token
    at = rt.access_token                  # access token
    at.set_exp(lifetime=timedelta(seconds=seconds))
    return str(at), str(rt)


def _obtain_pair(client: APIClient, username: str, password: str):
    """
    Appelle l'endpoint /api/token/ (obtain pair).
    """
    return client.post(TOKEN_URL, {"username": username, "password": password}, format="json")


def _refresh_access(client: APIClient, refresh_token: str):
    """
    Appelle l'endpoint /api/token/refresh/ pour obtenir un nouvel access.
    """
    return client.post(REFRESH_URL, {"refresh": refresh_token}, format="json")


def _create_todo(client: APIClient, **payload):
    """
    Crée un Todo via l'API.
    Le serializer de ton projet attend a priori : title, description, completed, inprogress.
    """
    base = {"title": "Tâche", "description": "", "completed": False, "inprogress": False}
    base.update(payload)
    return client.post(TODOS_URL, base, format="json")


# === Fixtures =================================================================

@pytest.fixture
def api_client() -> APIClient:
    return APIClient()

@pytest.fixture
def create_user(django_user_model):
    """
    Fabrique un utilisateur (ou admin si is_admin=True).
    Retourne l'instance créée.
    """
    def _create_user(username="alice", password="Password123!", is_admin=False, **extra):
        user = django_user_model.objects.create_user(
            username=username, password=password, **extra
        )
        if is_admin:
            user.is_staff = True
            user.is_superuser = True
            user.save()
        return user
    return _create_user


# === TESTS AUTH ===============================================================

def test_acces_liste_todos_retourne_401_quand_non_authentifie(api_client):
    # Arrange — aucun token
    # Act
    res = api_client.get(TODOS_URL)
    # Assert
    assert res.status_code == status.HTTP_401_UNAUTHORIZED


def test_obtention_token_pair_reussit_quand_identifiants_valides(api_client, create_user):
    # Arrange
    create_user(username="bob", password="Password123!")
    # Act
    res = _obtain_pair(api_client, "bob", "Password123!")
    # Assert
    assert res.status_code == status.HTTP_200_OK
    assert "access" in res.data and "refresh" in res.data
    assert isinstance(res.data["access"], str) and isinstance(res.data["refresh"], str)


def test_obtention_token_pair_echoue_quand_identifiants_invalides(api_client):
    # Arrange — user inconnu
    # Act
    res = _obtain_pair(api_client, "ghost", "wrong")
    # Assert
    assert res.status_code == status.HTTP_401_UNAUTHORIZED


def test_refresh_retourne_nouveau_access_quand_refresh_valide(api_client, create_user):
    # Arrange
    create_user(username="carol", password="Password123!")
    pair = _obtain_pair(api_client, "carol", "Password123!").data
    refresh = pair["refresh"]
    # Act
    res = _refresh_access(api_client, refresh)
    # Assert
    assert res.status_code == status.HTTP_200_OK
    assert "access" in res.data


def test_app_retourne_401_quand_access_expire_puis_refresh_permet_reacces(api_client, create_user):
    # Arrange
    user = create_user(username="dave", password="Password123!")
    access, refresh = _short_lived_pair_for_user(user, seconds=1)
    auth_client = _auth_client_with_access(access)

    # Access encore valide → création OK
    res_create = _create_todo(auth_client, title="avant-expiration")
    assert res_create.status_code == status.HTTP_201_CREATED

    # Act — attendre l’expiration de l’access
    time.sleep(2)  # > 1s pour être sûr
    res_after = auth_client.get(TODOS_URL)

    # Assert — l’access expiré doit provoquer un 401
    assert res_after.status_code == status.HTTP_401_UNAUTHORIZED

    # Act — on rafraîchit (comme le ferait ton interceptor React)
    res_refresh = _refresh_access(api_client, refresh)
    assert res_refresh.status_code == status.HTTP_200_OK
    new_access = res_refresh.data["access"]

    # Requête avec le nouvel access
    auth_client2 = _auth_client_with_access(new_access)
    res_list = auth_client2.get(TODOS_URL)

    # Assert — on retrouve un accès 200
    assert res_list.status_code == status.HTTP_200_OK


# === TESTS TODOS (sécurité + logique) ========================================

def test_liste_ne_retourne_que_les_taches_de_l_utilisateur_quand_authentifie(create_user):
    # Arrange
    u1 = create_user(username="user1")
    u2 = create_user(username="user2")
    c1 = _auth_client_with_access(str(RefreshToken.for_user(u1).access_token))
    c2 = _auth_client_with_access(str(RefreshToken.for_user(u2).access_token))
    _create_todo(c1, title="miennes-1")
    _create_todo(c2, title="siennes-1")
    _create_todo(c1, title="miennes-2")

    # Act
    res = c1.get(TODOS_URL)

    # Assert
    assert res.status_code == status.HTTP_200_OK
    titres = [t["title"] for t in res.data]
    assert set(titres) == {"miennes-1", "miennes-2"}


def test_creation_attache_automatiquement_le_owner_quand_payload_propose_owner(create_user):
    # Arrange
    u1 = create_user(username="user1")
    u2 = create_user(username="user2")
    c1 = _auth_client_with_access(str(RefreshToken.for_user(u1).access_token))
    # payload "malin" avec owner imposé (doit être ignoré par perform_create)
    payload = {"title": "triche", "owner": u2.id}

    # Act
    res = c1.post(TODOS_URL, payload, format="json")

    # Assert
    # Selon ton serializer : soit 400 (owner refusé), soit 201 mais owner=requérant.
    assert res.status_code in (status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST)
    if res.status_code == status.HTTP_201_CREATED:
        # L’autre utilisateur ne doit pas voir cette ressource
        c2 = _auth_client_with_access(str(RefreshToken.for_user(u2).access_token))
        ids_u2 = [t["id"] for t in c2.get(TODOS_URL).data]
        assert res.data["id"] not in ids_u2


def test_filtre_completed_ne_retourne_que_des_completed_quand_status_completed(create_user):
    # Arrange
    u = create_user(username="filtre")
    c = _auth_client_with_access(str(RefreshToken.for_user(u).access_token))
    _create_todo(c, title="a", completed=True)
    _create_todo(c, title="b", inprogress=True, completed=False)
    _create_todo(c, title="c", inprogress=False, completed=False)

    # Act
    res = c.get(f"{TODOS_URL}?status=completed")

    # Assert
    assert res.status_code == status.HTTP_200_OK
    assert len(res.data) >= 1
    assert all(item.get("completed") is True for item in res.data)


def test_detail_retourne_404_quand_tache_n_appartient_pas_au_demandeur(create_user):
    # Arrange
    u1 = create_user(username="user1")
    u2 = create_user(username="user2")
    c1 = _auth_client_with_access(str(RefreshToken.for_user(u1).access_token))
    c2 = _auth_client_with_access(str(RefreshToken.for_user(u2).access_token))
    todo = _create_todo(c1, title="privé").data
    detail_url = f"{TODOS_URL}{todo['id']}/"

    # Act
    res = c2.get(detail_url)

    # Assert
    assert res.status_code == status.HTTP_404_NOT_FOUND


# === TESTS droits admin (UserViewSet IsAdminUser) ============================

def test_liste_utilisateurs_interdite_quand_non_admin(create_user):
    # Arrange
    u = create_user(username="user")
    c = _auth_client_with_access(str(RefreshToken.for_user(u).access_token))

    # Act
    res = c.get(USERS_URL)

    # Assert
    # Selon ta config de routes, 403 (forbidden) ou 404 (route non exposée aux non-admins)
    assert res.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)


def test_liste_utilisateurs_autorisee_quand_admin(create_user):
    # Arrange
    admin = create_user(username="admin", is_admin=True)
    c = _auth_client_with_access(str(RefreshToken.for_user(admin).access_token))

    # Act
    res = c.get(USERS_URL)

    # Assert
    assert res.status_code == status.HTTP_200_OK
    assert isinstance(res.data, list)
