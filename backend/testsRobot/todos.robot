*** Settings ***
# ───────────────────────────────────────────────────────────────────────────
# Librairies :
# - RequestsLibrary : appels HTTP (sessions + GET/POST/PATCH/DELETE)
# - JSONLibrary / Collections : manipuler les objets JSON (dict/list)
# - String : utilitaires si besoin (non utilisé ici, mais pratique)
# ───────────────────────────────────────────────────────────────────────────
Library           RequestsLibrary
Library           JSONLibrary
Library           Collections
Library           String

# Suite Setup : on ouvre UNE session HTTP "api" vers ${BASE_URL} pour toute la suite.
Suite Setup       Create API Session


*** Variables ***
# ───────────────────────────────────────────────────────────────────────────
# Configuration Backend (adapte ${BASE_URL} si nécessaire)
# ───────────────────────────────────────────────────────────────────────────
${BASE_URL}          http://localhost:8000/api

# Auth (SimpleJWT)
${AUTH_PATH}         /token/
${REFRESH_PATH}      /token/refresh/

# Endpoints Todo (DRF router → slash final requis)
${TODOS_PATH}        /todos/

# Identifiants pour obtenir un JWT (compte qui EXISTE côté Django)
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
    &{payload}=        Create Dictionary
    ...                title=${title}    
    ...                description=${description}    
    ...                inprogress=${inprogress}    
    ...                completed=${completed}
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
    [Documentation]    Liste les todos de l’utilisateur (gère éventuellement la pagination DRF: results[]).
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
    &{payload}=        Create Dictionary
    ...                title=${new_title}
    ...                inprogress=${inprogress}
    ...                completed=${completed}
    ${resp}=           PATCH On Session     api    ${TODOS_PATH}${id}/    json=${payload}    headers=${HDR}
    Should Be Equal As Integers    ${resp.status_code}    200
    RETURN             ${resp.json()}

Delete Todo
    [Documentation]    Supprime une todo (204 attendu). Un GET ensuite renverra 404.
    [Arguments]        ${access}    ${id}
    ${HDR}=            Auth Header    ${access}
    ${resp}=           DELETE On Session    api    ${TODOS_PATH}${id}/    headers=${HDR}
    Should Be Equal As Integers    ${resp.status_code}    204


*** Test Cases ***

# =========================
#     SMOKE AUTH (Todos)
# =========================
Auth Smoke For Todos
    [Documentation]    Vérifie qu'on obtient bien un access/refresh pour pouvoir tester /todos/.
    ${ACCESS}    ${REFRESH}=    Login And Get Tokens
    Should Not Be Empty          ${ACCESS}
    Should Not Be Empty          ${REFRESH}

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
