"""
LaBrand - Role-Based Access Control (RBAC)
Defines roles, permissions, and helper functions for authorization.
"""
from fastapi import HTTPException, Depends
from config import db
from utils.helpers import get_current_user

# ── Platform-level roles ──────────────────────────
PLATFORM_ROLES = {
    "super_admin": {
        "label": "Super Admin",
        "level": 100,
        "description": "Controle total da plataforma e todos os clientes",
    },
    "estrategista": {
        "label": "Estrategista",
        "level": 50,
        "description": "Profissional da agência — gerencia marcas atribuídas",
    },
}

# ── Team-level roles (per brand) ─────────────────
TEAM_ROLES = {
    "owner": {
        "label": "Dono",
        "level": 100,
        "group": "agency",
        "description": "Criador da marca — controle total",
    },
    "lider_projeto": {
        "label": "Líder de Projeto",
        "level": 90,
        "group": "agency",
        "description": "Edita tudo, gerencia equipe, configura integrações",
    },
    "editor": {
        "label": "Editor",
        "level": 70,
        "group": "agency",
        "description": "Edita pilares, cria tarefas e campanhas",
    },
    "colaborador": {
        "label": "Colaborador",
        "level": 50,
        "group": "agency",
        "description": "Comenta e sugere alterações",
    },
    "visualizador": {
        "label": "Visualizador",
        "level": 20,
        "group": "agency",
        "description": "Somente leitura",
    },
    "cliente_admin": {
        "label": "Cliente Admin",
        "level": 60,
        "group": "client",
        "description": "Visualiza tudo, aprova/rejeita entregas, convida externos",
    },
    "aprovador": {
        "label": "Aprovador",
        "level": 30,
        "group": "client",
        "description": "Aprova/rejeita entregas compartilhadas",
    },
    "convidado": {
        "label": "Convidado",
        "level": 10,
        "group": "client",
        "description": "Visualiza relatórios específicos",
    },
}

# ── Module permissions matrix ─────────────────────
# action: "full" | "edit" | "comment" | "approve" | "read" | None
PERMISSIONS = {
    "pillars":          {"owner": "full", "lider_projeto": "full", "editor": "edit", "colaborador": "comment", "visualizador": "read", "cliente_admin": "approve", "aprovador": "approve", "convidado": "read"},
    "naming":           {"owner": "full", "lider_projeto": "full", "editor": "full", "colaborador": "read",    "visualizador": "read", "cliente_admin": "read",    "aprovador": None,     "convidado": None},
    "planning":         {"owner": "full", "lider_projeto": "full", "editor": "edit", "colaborador": "read",    "visualizador": "read", "cliente_admin": "read",    "aprovador": None,     "convidado": None},
    "campaigns":        {"owner": "full", "lider_projeto": "full", "editor": "edit", "colaborador": "read",    "visualizador": "read", "cliente_admin": "read",    "aprovador": None,     "convidado": None},
    "social":           {"owner": "full", "lider_projeto": "full", "editor": "edit", "colaborador": "read",    "visualizador": "read", "cliente_admin": "read",    "aprovador": None,     "convidado": None},
    "reports":          {"owner": "full", "lider_projeto": "full", "editor": "full", "colaborador": "read",    "visualizador": "read", "cliente_admin": "read",    "aprovador": "read",   "convidado": "read"},
    "team":             {"owner": "full", "lider_projeto": "full", "editor": None,   "colaborador": None,      "visualizador": None,   "cliente_admin": "edit",    "aprovador": None,     "convidado": None},
    "integrations":     {"owner": "full", "lider_projeto": "full", "editor": None,   "colaborador": None,      "visualizador": None,   "cliente_admin": None,      "aprovador": None,     "convidado": None},
    "settings":         {"owner": "full", "lider_projeto": "edit", "editor": None,   "colaborador": None,      "visualizador": None,   "cliente_admin": None,      "aprovador": None,     "convidado": None},
    "white_label":      {"owner": "full", "lider_projeto": None,   "editor": None,   "colaborador": None,      "visualizador": None,   "cliente_admin": None,      "aprovador": None,     "convidado": None},
    "dashboard":        {"owner": "full", "lider_projeto": "full", "editor": "read", "colaborador": "read",    "visualizador": "read", "cliente_admin": "read",    "aprovador": "read",   "convidado": "read"},
}


async def get_user_brand_role(user: dict, brand_id: str) -> str:
    """Get the effective role of a user for a specific brand"""
    # Super admin has full access everywhere
    if user.get("is_admin") or user.get("platform_role") == "super_admin":
        return "owner"

    # Check if user is the brand owner
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0, "owner_id": 1})
    if brand and brand.get("owner_id") == user["user_id"]:
        return "owner"

    # Check team membership
    member = await db.team_members.find_one(
        {"brand_id": brand_id, "user_id": user["user_id"]},
        {"_id": 0, "role": 1},
    )
    if member:
        return member.get("role", "visualizador")

    return None


def check_permission(role: str, module: str, min_level: str = "read") -> bool:
    """Check if a role has at least the minimum permission level for a module"""
    if role == "owner" or role == "super_admin":
        return True

    level_order = {None: 0, "read": 1, "comment": 2, "approve": 3, "edit": 4, "full": 5}
    module_perms = PERMISSIONS.get(module, {})
    user_perm = module_perms.get(role)

    return level_order.get(user_perm, 0) >= level_order.get(min_level, 1)


async def require_permission(user: dict, brand_id: str, module: str, min_level: str = "read"):
    """Raise 403 if user lacks permission for the given module and brand"""
    role = await get_user_brand_role(user, brand_id)
    if role is None:
        raise HTTPException(status_code=403, detail="Você não tem acesso a esta marca")
    if not check_permission(role, module, min_level):
        raise HTTPException(status_code=403, detail=f"Sem permissão para {min_level} em {module}")
    return role


# ── API Endpoints ─────────────────────────────────
from fastapi import APIRouter
router = APIRouter(tags=["permissions"])


@router.get("/permissions/roles")
async def list_roles(user: dict = Depends(get_current_user)):
    """List all available roles for team management"""
    team_roles = []
    for key, info in TEAM_ROLES.items():
        if key == "owner":
            continue
        team_roles.append({
            "value": key,
            "label": info["label"],
            "group": info["group"],
            "description": info["description"],
            "level": info["level"],
        })
    return {"roles": sorted(team_roles, key=lambda r: -r["level"])}


@router.get("/permissions/my-role/{brand_id}")
async def get_my_role(brand_id: str, user: dict = Depends(get_current_user)):
    """Get the current user's role and permissions for a specific brand"""
    role = await get_user_brand_role(user, brand_id)
    if role is None:
        raise HTTPException(status_code=403, detail="Sem acesso a esta marca")

    role_info = TEAM_ROLES.get(role, {})
    permissions = {}
    for module, perms in PERMISSIONS.items():
        perm = "full" if role == "owner" else perms.get(role)
        permissions[module] = perm

    return {
        "role": role,
        "label": role_info.get("label", role),
        "group": role_info.get("group", "agency"),
        "level": role_info.get("level", 0),
        "permissions": permissions,
        "is_platform_admin": user.get("is_admin", False) or user.get("platform_role") == "super_admin",
    }
