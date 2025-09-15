*** Settings ***
# ───────────────────────────────────────────────────────────────────────────
# Librairies :
# - RequestsLibrary : appels HTTP (sessions, GET/POST/PATCH/DELETE)
# - JSONLibrary / Collections : manipuler les objets JSON (dict/list)
# - String : utilitaires (générer un suffixe aléatoire pour username)
# ───────────────────────────────────────────────────────────────────────────
Library           RequestsLibrary
Library           JSONLibrary
Library           Collections
Library           String

# Suite Setup : on crée une session HTTP "api" vers ${BASE_URL} (une fois pour tous les tests)
Suite Setup       Create API Session


*** Variables ***
# ───────────────────────────────────────────────────────────────────────────
# Configuration Back-end (modifie ${BASE_URL}
# ───────────────────────────────────────────────────────────────────────────
${BASE_URL}          http://localhost:8000/api

# Auth (SimpleJWT)
${AUTH_PATH}         /token/
${REFRESH_PATH}      /token/refresh/

# Endpoints Users (DRF router → slash final requis)
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


#Refresh Token
Refresh Access Token
    [Documentation]   POST ${REFRESH_PATH} avec un refresh → renvoie un nouvel access (Vérifie le refresh (POST /api/token/refresh/ → 200 + access)).
    [Arguments]        ${refresh}
    &{payload}=        Create Dictionary    refresh=${refresh}
    &{hdr}=            Create Dictionary    Content-Type=application/json
    ${resp}=           POST On Session      api    ${REFRESH_PATH}    json=${payload}    headers=${hdr}
    Should Be Equal As Integers    ${resp.status_code}    200
    ${data}=           Set Variable         ${resp.json()}
    Dictionary Should Contain Key          ${data}    access
    RETURN             ${data['access']}

Auth Header
    [Documentation]    Construit le header Authorization=Bearer <token>.
    [Arguments]        ${access}
    &{hdr}=            Create Dictionary    Authorization=Bearer ${access}
    RETURN             ${hdr}


# =========================
#        USERS HELPERS
# =========================
Register Random User
    [Documentation]    Crée un utilisateur public via ${REGISTER_PATH} (/api/register/) (201). Le serializer exige: first_name,last_name, email, password, username.
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
    # On accepte les erreurs pour pouvoir afficher un log utile si 4xx   
    Should Be Equal As Integers    ${resp.status_code}    201
    RETURN             ${uname}

List Users (Requires Auth)
    [Documentation]    GET  ${USERS_PATH} (/api/users/ (IsAdminUser)) → 200 si admin, 403 sinon. On renvoie la réponse brute.
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

Assert Users Non-Admin Friendly
    [Documentation]    Vérifie le comportement de /users/ pour un compte potentiellement non-admin.
    ...                - 403  : OK (non-admin confirmé) → test passe.
    ...                - 200  : l'utilisateur est admin → on SKIP ce test (scénario non-admin).
    ...                - autre: on FAIL (statut inattendu).
    [Arguments]        ${access}
    ${resp}=           List Users (Requires Auth)    ${access}
    ${code}=           Convert To Integer    ${resp.status_code}

    Run Keyword If     ${code} == 403    Log To Console    OK: non-admin → /users/ renvoie 403 comme prévu.
    ...    ELSE IF     ${code} == 200    Skip    L'utilisateur est admin (200). On saute ce test dédié au non-admin.
    ...    ELSE        Fail    Statut inattendu pour /users/: ${code}. Réponse: ${resp.text}

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
#        AUTH DE BASE
# =========================
Valid Login
    [Documentation]    Vérifie qu'on récupère bien un access et un refresh token.
    ${ACCESS}    ${REFRESH}=    Login And Get Tokens
    Should Not Be Empty          ${ACCESS}
    Should Not Be Empty          ${REFRESH}

Refresh Token
    [Documentation]    Vérifie le refresh (POST ${REFRESH_PATH} → 200 + access).
    ${ACCESS}    ${REFRESH}=    Login And Get Tokens
    ${NEW}=                   Refresh Access Token    ${REFRESH}
    Should Not Be Empty       ${NEW}


# =========================
#        USERS FLOW
# =========================
Users Non-Admin Flow (Expect 403)
    [Documentation]    Si ${USERNAME} n'est pas staff/superuser, /users/ doit renvoyer 403 mais le test ne casse pas si le compte est admin :
    ...                - 403  : OK (non-admin confirmé) → test passe.
    ...                - 200  : l'utilisateur est admin → on SKIP ce test (scénario non-admin).
    ...                - autre: on FAIL (statut inattendu).
    ${ACCESS}    ${REFRESH}=    Login And Get Tokens
    Assert Users Non-Admin Friendly    ${ACCESS}

Users Flow (200 si admin)
    [Documentation]    Crée un user public, puis liste /users/ (200 si ${USERNAME} est admin).
    ${new_user}=   Register Random User
    ${ACCESS}    ${REFRESH}=    Login And Get Tokens

    ${resp}=       List Users (Requires Auth)    ${ACCESS}
    Should Be Equal As Integers    ${resp.status_code}    200

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
    Log to console    ${resp_get.status_code}
    Should Be Equal As Integers    ${resp_get.status_code}    404
