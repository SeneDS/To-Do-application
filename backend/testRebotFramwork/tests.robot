*** Settings ***
# Librairies utilisées :
# - RequestsLibrary : appels HTTP
# - JSONLibrary / Collections : manipulation d'objets JSON et listes/dicts
# - String : utilitaires (générer des suffixes aléatoires, etc.)
Library           RequestsLibrary
Library           JSONLibrary
Library           Collections
Library           String

# On crée une seule session HTTP "api" pour toute la suite
Suite Setup       Create API Session


*** Variables ***
# Les endpoints DRF / SimpleJWT (adapter si besoin)
${BASE_URL}          http://localhost:8000/api
${AUTH_PATH}         /token/
${REFRESH_PATH}      /token/refresh/

# Endpoints Todo & Users (DRF router, avec slash final)
${TODOS_PATH}        /todos/
${USERS_PATH}        /users/

# Inscription publique (RegisterView)
${REGISTER_PATH}     /register/

# Identifiants pour se connecter et obtenir le JWT (compte existant)
${USERNAME}          etienne
${PASSWORD}          etienne


*** Keywords ***
# =========================
#         SETUP / AUTH
# =========================
Create API Session
    [Documentation]    Crée une session HTTP nommée "api" vers ${BASE_URL}.
    Create Session    api    ${BASE_URL}

Login And Get Tokens
    [Documentation]    POST /api/token/ avec ${USERNAME}/${PASSWORD}. Retourne ${ACCESS} et ${REFRESH}.
    &{payload}=        Create Dictionary    username=${USERNAME}    password=${PASSWORD}
    &{hdr}=            Create Dictionary    Content-Type=application/json
    ${resp}=           POST On Session      api    ${AUTH_PATH}    json=${payload}    headers=${hdr}
    Should Be Equal As Integers    ${resp.status_code}    200
    ${data}=           Set Variable         ${resp.json()}
    Dictionary Should Contain Key  ${data}    access
    Dictionary Should Contain Key  ${data}    refresh
    RETURN             ${data['access']}    ${data['refresh']}

Auth Header
    [Documentation]    Construit le header Authorization=Bearer <token>.
    [Arguments]        ${access}
    &{hdr}=            Create Dictionary    Authorization=Bearer ${access}
    RETURN             ${hdr}


# =========================
#        TODOS (CRUD)
# =========================
Create Todo
    [Documentation]    Crée une todo appartenant à l'utilisateur connecté (owner auto via perform_create).
    [Arguments]        ${access}    ${title}=Test todo    ${description}=From Robot    ${inprogress}=True    ${completed}=False
    ${HDR}=            Auth Header    ${access}
    &{payload}=        Create Dictionary    title=${title}    description=${description}    inprogress=${inprogress}    completed=${completed}
    ${resp}=           POST On Session      api    ${TODOS_PATH}    json=${payload}    headers=${HDR}
    Should Be Equal As Integers    ${resp.status_code}    201
    ${body}=           Set Variable         ${resp.json()}
    Dictionary Should Contain Key    ${body}    id
    RETURN             ${body}

Get Todo
    [Documentation]    Récupère le détail d’une todo par id (200 attendu si elle appartient au token courant).
    [Arguments]        ${access}    ${id}
    ${HDR}=            Auth Header    ${access}
    ${resp}=           GET On Session       api    ${TODOS_PATH}${id}/    headers=${HDR}
    Should Be Equal As Integers    ${resp.status_code}    200
    RETURN             ${resp.json()}

List Todos
    [Documentation]    Liste les todos de l’utilisateur (gère la pagination DRF: results[]).
    [Arguments]        ${access}
    ${HDR}=            Auth Header    ${access}
    ${resp}=           GET On Session       api    ${TODOS_PATH}    headers=${HDR}
    Should Be Equal As Integers    ${resp.status_code}    200
    ${data}=           Set Variable         ${resp.json()}
    # Si pagination DRF: {"count":...,"results":[...]} sinon liste brute
    ${has_results}=    Run Keyword And Return Status    Dictionary Should Contain Key    ${data}    results
    IF    ${has_results}
        ${results}=    Get From Dictionary    ${data}    results
        RETURN         ${results}
    ELSE
        RETURN         ${data}
    END

Update Todo
    [Documentation]    Met à jour partiellement une todo (PATCH). Respecte la validation (pas inprogress & completed à True).
    [Arguments]        ${access}    ${id}    ${new_title}=Updated by Robot    ${inprogress}=False    ${completed}=True
    ${HDR}=            Auth Header    ${access}
    &{payload}=        Create Dictionary    title=${new_title}    inprogress=${inprogress}    completed=${completed}
    ${resp}=           PATCH On Session     api    ${TODOS_PATH}${id}/    json=${payload}    headers=${HDR}
    Should Be Equal As Integers    ${resp.status_code}    200
    RETURN             ${resp.json()}

Delete Todo
    [Documentation]    Supprime une todo (204 attendu). Un GET ensuite renverra 404.
    [Arguments]        ${access}    ${id}
    ${HDR}=            Auth Header    ${access}
    ${resp}=           DELETE On Session    api    ${TODOS_PATH}${id}/    headers=${HDR}
    Should Be Equal As Integers    ${resp.status_code}    204


# =========================
#        USERS (Admin)
# =========================
Register Random User
    [Documentation]    Crée un utilisateur public via /api/register/ (201). Le serializer exige first_name/last_name/email/password/username.
    ${suffix}=         Generate Random String    6    [LOWER]
    ${uname}=          Set Variable    robot_${suffix}
    &{payload}=        Create Dictionary
    ...                username=${uname}
    ...                password=Passw0rd!
    ...                email=${uname}@example.com
    ...                first_name=Robot
    ...                last_name=Tester
    &{hdr}=            Create Dictionary    Content-Type=application/json
    ${resp}=           POST On Session      api    ${REGISTER_PATH}    json=${payload}    headers=${hdr}    expected_status=201
    Should Be Equal As Integers    ${resp.status_code}    201
    RETURN             ${uname}

# ----- Helpers users -----
List Users (Requires Auth)
    [Documentation]    GET /api/users/ (IsAdminUser) → 200 si admin, 403 sinon. On renvoie la réponse brute.
    [Arguments]        ${access}
    ${HDR}=            Auth Header    ${access}
    ${resp}=           GET On Session    api    ${USERS_PATH}    headers=${HDR}    expected_status=any
    RETURN             ${resp}

Get User (Requires Auth)
    [Documentation]    GET /api/users/{id}/ (admin requis).
    [Arguments]        ${access}    ${id}
    ${HDR}=            Auth Header    ${access}
    ${resp}=           GET On Session    api    ${USERS_PATH}${id}/    headers=${HDR}    expected_status=any
    RETURN             ${resp}

Find User Id By Username
    [Documentation]    Cherche dans une liste de users (JSON) l’utilisateur par username et retourne son id (ou ${NONE}).
    [Arguments]        ${users_list}    ${username}
    ${n}=              Get Length    ${users_list}
    FOR    ${i}    IN RANGE    ${n}
        ${u}=        Get From List         ${users_list}    ${i}
        ${name}=     Get From Dictionary   ${u}             username
        IF    '${name}'=='${username}'
            ${id}=   Get From Dictionary   ${u}             id
            RETURN    ${id}
        END
    END
    RETURN    ${NONE}

Set User Staff
    [Documentation]    PATCH /api/users/{id}/ is_staff=True/False (admin requis).
    [Arguments]        ${access}    ${id}    ${is_staff}=True
    ${HDR}=            Auth Header    ${access}
    &{payload}=        Create Dictionary    is_staff=${is_staff}
    ${resp}=           PATCH On Session    api    ${USERS_PATH}${id}/    json=${payload}    headers=${HDR}    expected_status=any
    RETURN             ${resp}

Set User Active
    [Documentation]    PATCH /api/users/{id}/ is_active=True/False (admin requis).
    [Arguments]        ${access}    ${id}    ${is_active}=True
    ${HDR}=            Auth Header    ${access}
    &{payload}=        Create Dictionary    is_active=${is_active}
    ${resp}=           PATCH On Session    api    ${USERS_PATH}${id}/    json=${payload}    headers=${HDR}    expected_status=any
    RETURN             ${resp}

Update User Email
    [Documentation]    PATCH /api/users/{id}/ email=... (admin requis).
    [Arguments]        ${access}    ${id}    ${email}
    ${HDR}=            Auth Header    ${access}
    &{payload}=        Create Dictionary    email=${email}
    ${resp}=           PATCH On Session    api    ${USERS_PATH}${id}/    json=${payload}    headers=${HDR}    expected_status=any
    RETURN             ${resp}

Delete User (Admin Only)
    [Documentation]    DELETE /api/users/{id}/ (admin requis).
    [Arguments]        ${access}    ${id}
    ${HDR}=            Auth Header    ${access}
    ${resp}=           DELETE On Session    api    ${USERS_PATH}${id}/    headers=${HDR}    expected_status=any
    RETURN             ${resp}


*** Test Cases ***
# =========================
#        AUTH / TOKEN
# =========================
Valid Login
    [Documentation]    Vérifie qu'on récupère bien un access et un refresh token.
    ${ACCESS}    ${REFRESH}=    Login And Get Tokens
    Should Not Be Empty          ${ACCESS}
    Should Not Be Empty          ${REFRESH}

Refresh Token
    [Documentation]    Vérifie le refresh (POST /api/token/refresh/ → 200 + access).
    ${ACCESS}    ${REFRESH}=    Login And Get Tokens
    &{payload}=                 Create Dictionary    refresh=${REFRESH}
    &{hdr}=                     Create Dictionary    Content-Type=application/json
    ${resp}=                    POST On Session      api    ${REFRESH_PATH}    json=${payload}    headers=${hdr}
    Should Be Equal As Integers    ${resp.status_code}    200
    ${data}=                    Set Variable         ${resp.json()}
    Dictionary Should Contain Key    ${data}    access

Call Todos With Bearer
    [Documentation]    Smoke test sur /api/todos/ avec Authorization Bearer (doit renvoyer 200).
    ${ACCESS}    ${REFRESH}=    Login And Get Tokens
    ${HDR}=                     Auth Header    ${ACCESS}
    ${resp}=                    GET On Session    api    ${TODOS_PATH}    headers=${HDR}
    Should Be Equal As Integers    ${resp.status_code}    200


# =========================
#        TODOS FLOW
# =========================
CRUD Todo End-To-End
    [Documentation]    Crée → lit → liste → met à jour → supprime une todo, puis vérifie le 404 post-suppression.
    ${ACCESS}    ${REFRESH}=    Login And Get Tokens

    # CREATE
    ${todo}=      Create Todo    ${ACCESS}    title=Todo depuis Robot    description=Première passe    inprogress=True    completed=False
    ${todo_id}=   Set Variable   ${todo['id']}
    Should Not Be Equal    ${todo_id}    ${NONE}

    # READ
    ${t1}=        Get Todo       ${ACCESS}    ${todo_id}
    Should Be Equal As Integers    ${t1['id']}    ${todo_id}

    # LIST
    ${all}=       List Todos     ${ACCESS}
    ${count}=     Get Length     ${all}
    Should Be True    ${count} >= 1

    # UPDATE (respecte la validation: inprogress=False, completed=True)
    ${t2}=        Update Todo    ${ACCESS}    ${todo_id}    new_title=Todo modifié par Robot    inprogress=False    completed=True
    Should Be Equal As Strings    ${t2['title']}         Todo modifié par Robot
    Should Be Equal As Strings    ${t2['completed']}     True
    Should Be Equal As Strings    ${t2['inprogress']}    False

    # DELETE
    Delete Todo   ${ACCESS}    ${todo_id}
    ${HDR}=       Auth Header    ${ACCESS}
    ${resp404}=   GET On Session    api    ${TODOS_PATH}${todo_id}/    headers=${HDR}    expected_status=any
    Should Be Equal As Integers    ${resp404.status_code}    404


# =========================
#        USERS FLOW
# =========================
Users Flow
    [Documentation]    Crée un user public, puis tente /users/ (200 si admin, 403 sinon).
    ${new_user}=   Register Random User
    ${ACCESS}    ${REFRESH}=    Login And Get Tokens

    ${resp}=       List Users (Requires Auth)    ${ACCESS}
    ${code}=       Convert To Integer    ${resp.status_code}
    # Si ton compte n'est pas admin, ce test échouera ici (normal) → utilise le test "Users Non-Admin Flow" si tu veux juste vérifier 403.
    Should Be Equal As Integers    ${code}    200

    ${users}=      Set Variable    ${resp.json()}
    ${n}=          Get Length      ${users}
    Should Be True    ${n} >= 1

Users Admin Flow (Requires staff)
    [Documentation]    Nécessite que ${USERNAME} soit staff/superuser. Démontre les opérations admin (is_staff, is_active, delete).
    ${ACCESS}    ${REFRESH}=    Login And Get Tokens

    # Créer un nouvel utilisateur public via /register/
    ${new_user}=  Register Random User

    # Lister les users
    ${resp}=      List Users (Requires Auth)    ${ACCESS}
    Should Be Equal As Integers    ${resp.status_code}    200
    ${users}=     Set Variable    ${resp.json()}

    # Récupérer l'id du user créé
    ${uid}=       Find User Id By Username    ${users}    ${new_user}
    Should Not Be Equal    ${uid}    ${NONE}

    # Donner le flag staff au nouveau user
    ${resp_staff}=    Set User Staff    ${ACCESS}    ${uid}    True
    Should Be Equal As Integers    ${resp_staff.status_code}    200
    ${body}=          Set Variable    ${resp_staff.json()}
    Dictionary Should Contain Key    ${body}    is_staff
    Should Be Equal As Strings       ${body['is_staff']}    True

    # Modifier son email
    ${resp_upd}=      Update User Email    ${ACCESS}    ${uid}    test_changed@example.com
    Should Be Equal As Integers    ${resp_upd.status_code}    200

    # Désactiver le compte
    ${resp_active}=   Set User Active     ${ACCESS}    ${uid}    False
    Should Be Equal As Integers    ${resp_active.status_code}    200

    # Supprimer le user
    ${resp_del}=      Delete User (Admin Only)    ${ACCESS}    ${uid}
    Should Be Equal As Integers    ${resp_del.status_code}    204

    # Vérifier qu'il n'existe plus
    ${resp_get}=      Get User (Requires Auth)    ${ACCESS}    ${uid}
    Should Be Equal As Integers    ${resp_get.status_code}    404
