📝 Tutoriel express (ce que fait chaque bloc)\
Settings : charge les librairies et crée une session HTTP réutilisable pour toute la suite (Suite Setup).
Variables : centralise les chemins (/token/, /users/, /register/) et les identifiants.
Keywords (Auth) :
Login And Get Tokens → récupère access et refresh (JWT).
Refresh Access Token → montre comment rafraîchir l’access.
Auth Header → construit Authorization: Bearer <access>.
Keywords (Users) :
Register Random User → crée un user avec un username aléatoire (évite les collisions).
List Users (Requires Auth) → appelle /users/ (200 si admin, 403 sinon).
Find User Id By Username → petit helper pour retrouver l’id.
Set User Staff, Set User Active, Update User Email, Delete User → opérations admin sur /users/{id}/.
Test Cases :
Valid Login + Refresh Token : smoke auth.
Users Non-Admin Flow (Expect 403) : vérifie le cas non-admin.
Users Flow (200 si admin) : liste les users (nécessite admin).
Users Admin Flow : flux complet admin (donner is_staff, modifier, désactiver, supprimer, vérifier 404).
✅ Bonnes pratiques appliquées
Aucun code lié aux todos (suite 100% Users).
expected_status=any utilisé là où un code ≠ 2xx peut être légitime ; les assertions comparent ensuite le status_code.
Slash final sur les routes DRF (/users/, /register/).
User aléatoire (robot_<suffix>) pour éviter les collisions entre runs.
Noms de mots-clés stables et commentaires pédagogiques.