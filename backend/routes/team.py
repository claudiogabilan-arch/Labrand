"""
LaBrand - Team & Profile Routes
Handles profile photo upload and team member invitations
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import shutil

from config import db
from utils.helpers import get_current_user
from services.email_service import send_email

router = APIRouter(tags=["team"])

UPLOAD_DIR = "/app/backend/uploads/avatars"
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


class TeamInviteRequest(BaseModel):
    email: EmailStr
    role: str = "editor"  # "admin" or "editor"
    brand_id: str


class TeamMemberUpdate(BaseModel):
    role: str


# ==================== PROFILE PHOTO ====================

@router.post("/users/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload user profile photo"""
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Formato não suportado. Use: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read and check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo: 2MB")
    
    # Generate unique filename
    filename = f"{user['user_id']}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Delete old avatar if exists
    old_picture = user.get("picture")
    if old_picture and old_picture.startswith("/api/uploads/avatars/"):
        old_filename = old_picture.split("/")[-1]
        old_path = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
    
    # Save new file
    with open(filepath, "wb") as f:
        f.write(contents)
    
    # Update user in database
    picture_url = f"/api/uploads/avatars/{filename}"
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"picture": picture_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "picture_url": picture_url,
        "message": "Foto de perfil atualizada!"
    }


@router.delete("/users/me/avatar")
async def delete_avatar(user: dict = Depends(get_current_user)):
    """Remove user profile photo"""
    old_picture = user.get("picture")
    if old_picture and old_picture.startswith("/api/uploads/avatars/"):
        old_filename = old_picture.split("/")[-1]
        old_path = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"picture": None, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Foto removida"}


# ==================== TEAM INVITATIONS ====================

@router.post("/team/invite")
async def invite_team_member(
    request: TeamInviteRequest,
    user: dict = Depends(get_current_user)
):
    """Send invitation to join a brand team"""
    # Check if user has permission (must be brand owner or admin)
    brand = await db.brands.find_one({"brand_id": request.brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    # Check permissions
    is_owner = brand.get("owner_id") == user["user_id"]
    team_member = await db.team_members.find_one({
        "brand_id": request.brand_id,
        "user_id": user["user_id"],
        "role": "admin"
    }, {"_id": 0})
    
    if not is_owner and not team_member:
        raise HTTPException(status_code=403, detail="Sem permissão para convidar membros")
    
    # Check if already invited or member
    existing_invite = await db.team_invites.find_one({
        "email": request.email,
        "brand_id": request.brand_id,
        "status": "pending"
    }, {"_id": 0})
    
    if existing_invite:
        raise HTTPException(status_code=400, detail="Convite já enviado para este email")
    
    existing_member = await db.team_members.find_one({
        "brand_id": request.brand_id,
        "email": request.email
    }, {"_id": 0})
    
    if existing_member:
        raise HTTPException(status_code=400, detail="Usuário já é membro desta marca")
    
    # Check if inviting self
    if request.email == user["email"]:
        raise HTTPException(status_code=400, detail="Você não pode convidar a si mesmo")
    
    # Create invite
    invite_id = f"invite_{uuid.uuid4().hex[:12]}"
    invite_token = uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    invite_doc = {
        "invite_id": invite_id,
        "brand_id": request.brand_id,
        "brand_name": brand.get("name", ""),
        "email": request.email,
        "role": request.role,
        "invited_by": user["user_id"],
        "invited_by_name": user.get("name", ""),
        "token": invite_token,
        "status": "pending",
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.team_invites.insert_one(invite_doc)
    
    # Send invitation email
    frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "https://labrand.com.br").replace("/api", "")
    invite_link = f"{frontend_url}/invite/{invite_token}"
    
    html_content = get_invite_email_template(
        brand_name=brand.get("name", ""),
        inviter_name=user.get("name", "Alguém"),
        role=request.role,
        invite_link=invite_link
    )
    
    email_result = await send_email(
        to=[request.email],
        subject=f"Convite para equipe - {brand.get('name', 'LaBrand')}",
        html_content=html_content
    )
    
    return {
        "success": True,
        "invite_id": invite_id,
        "message": f"Convite enviado para {request.email}!",
        "email_sent": email_result.get("success", False)
    }


@router.get("/team/invites/{brand_id}")
async def list_pending_invites(
    brand_id: str,
    user: dict = Depends(get_current_user)
):
    """List pending invitations for a brand"""
    invites = await db.team_invites.find(
        {"brand_id": brand_id, "status": "pending"},
        {"_id": 0, "token": 0}
    ).to_list(100)
    
    return {"invites": invites}


@router.delete("/team/invites/{invite_id}")
async def cancel_invite(
    invite_id: str,
    user: dict = Depends(get_current_user)
):
    """Cancel a pending invitation"""
    invite = await db.team_invites.find_one({"invite_id": invite_id}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    
    # Check permission
    brand = await db.brands.find_one({"brand_id": invite["brand_id"]}, {"_id": 0})
    if brand.get("owner_id") != user["user_id"]:
        team_member = await db.team_members.find_one({
            "brand_id": invite["brand_id"],
            "user_id": user["user_id"],
            "role": "admin"
        }, {"_id": 0})
        if not team_member:
            raise HTTPException(status_code=403, detail="Sem permissão")
    
    await db.team_invites.delete_one({"invite_id": invite_id})
    
    return {"success": True, "message": "Convite cancelado"}


@router.post("/team/accept/{token}")
async def accept_invite(token: str, user: dict = Depends(get_current_user)):
    """Accept a team invitation"""
    invite = await db.team_invites.find_one({"token": token, "status": "pending"}, {"_id": 0})
    
    if not invite:
        raise HTTPException(status_code=404, detail="Convite não encontrado ou expirado")
    
    # Check expiration
    expires_at = datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        await db.team_invites.update_one(
            {"token": token},
            {"$set": {"status": "expired"}}
        )
        raise HTTPException(status_code=400, detail="Convite expirado")
    
    # Check if email matches
    if invite["email"] != user["email"]:
        raise HTTPException(status_code=403, detail="Este convite foi enviado para outro email")
    
    # Add to team
    member_doc = {
        "member_id": f"member_{uuid.uuid4().hex[:12]}",
        "brand_id": invite["brand_id"],
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "picture": user.get("picture"),
        "role": invite["role"],
        "joined_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.team_members.insert_one(member_doc)
    
    # Update invite status
    await db.team_invites.update_one(
        {"token": token},
        {"$set": {"status": "accepted", "accepted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Auto-complete onboarding for invited users (they don't need to fill it)
    await db.users.update_one(
        {"user_id": user["user_id"], "onboarding_completed": {"$ne": True}},
        {"$set": {"onboarding_completed": True}}
    )
    
    return {
        "success": True,
        "brand_id": invite["brand_id"],
        "brand_name": invite.get("brand_name", ""),
        "role": invite["role"],
        "message": f"Você agora faz parte da equipe!"
    }


@router.get("/team/members/{brand_id}")
async def list_team_members(
    brand_id: str,
    user: dict = Depends(get_current_user)
):
    """List all team members for a brand"""
    # Get brand owner
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    owner = await db.users.find_one({"user_id": brand.get("owner_id")}, {"_id": 0, "password": 0})
    
    # Get team members
    members = await db.team_members.find(
        {"brand_id": brand_id},
        {"_id": 0}
    ).to_list(100)
    
    # Format owner as member
    owner_member = {
        "member_id": "owner",
        "user_id": owner["user_id"] if owner else "",
        "email": owner["email"] if owner else "",
        "name": owner.get("name", "") if owner else "",
        "picture": owner.get("picture") if owner else None,
        "role": "owner",
        "joined_at": brand.get("created_at", "")
    }
    
    return {
        "owner": owner_member,
        "members": members,
        "total": len(members) + 1
    }


@router.put("/team/members/{member_id}")
async def update_team_member(
    member_id: str,
    update: TeamMemberUpdate,
    user: dict = Depends(get_current_user)
):
    """Update team member role"""
    member = await db.team_members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    # Check permission (only owner can change roles)
    brand = await db.brands.find_one({"brand_id": member["brand_id"]}, {"_id": 0})
    if brand.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Apenas o dono pode alterar papéis")
    
    await db.team_members.update_one(
        {"member_id": member_id},
        {"$set": {"role": update.role}}
    )
    
    return {"success": True, "message": "Papel atualizado"}


@router.delete("/team/members/{member_id}")
async def remove_team_member(
    member_id: str,
    user: dict = Depends(get_current_user)
):
    """Remove a team member"""
    member = await db.team_members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    # Check permission
    brand = await db.brands.find_one({"brand_id": member["brand_id"]}, {"_id": 0})
    is_owner = brand.get("owner_id") == user["user_id"]
    is_self = member["user_id"] == user["user_id"]
    
    if not is_owner and not is_self:
        raise HTTPException(status_code=403, detail="Sem permissão para remover este membro")
    
    await db.team_members.delete_one({"member_id": member_id})
    
    return {"success": True, "message": "Membro removido da equipe"}


@router.get("/team/my-teams")
async def get_my_teams(user: dict = Depends(get_current_user)):
    """Get all brands the user is a member of"""
    memberships = await db.team_members.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    teams = []
    for membership in memberships:
        brand = await db.brands.find_one({"brand_id": membership["brand_id"]}, {"_id": 0})
        if brand:
            teams.append({
                "brand_id": brand["brand_id"],
                "brand_name": brand.get("name", ""),
                "role": membership["role"],
                "joined_at": membership["joined_at"]
            })
    
    return {"teams": teams}


# Email template for invitations
def get_invite_email_template(brand_name: str, inviter_name: str, role: str, invite_link: str) -> str:
    role_label = "Administrador" if role == "admin" else "Editor"
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <tr>
                <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 32px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                        <span style="color: #ffffff;">LA</span><span style="font-weight: 400;">Brand</span>
                    </h1>
                </td>
            </tr>
            
            <!-- Content -->
            <tr>
                <td style="padding: 40px 32px;">
                    <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 22px;">
                        Você foi convidado! 🎉
                    </h2>
                    
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        <strong>{inviter_name}</strong> convidou você para fazer parte da equipe 
                        <strong>{brand_name}</strong> no LaBrand como <strong>{role_label}</strong>.
                    </p>
                    
                    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Seu papel:</p>
                        <p style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">{role_label}</p>
                        <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 13px;">
                            {"Acesso total para gerenciar a marca" if role == "admin" else "Pode editar conteúdo da marca"}
                        </p>
                    </div>
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="text-align: center;">
                                <a href="{invite_link}" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                                    Aceitar Convite
                                </a>
                            </td>
                        </tr>
                    </table>
                    
                    <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px; text-align: center;">
                        Este convite expira em 7 dias.
                    </p>
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td style="background: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                        Se você não esperava este convite, pode ignorar este email.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
