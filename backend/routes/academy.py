"""LaBrand Academy - Knowledge hub for brand building"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["LaBrand Academy"])


class ArticleCreate(BaseModel):
    title: str
    summary: str = ""
    content: str = ""
    category: str = "geral"
    tags: List[str] = []
    cover_url: Optional[str] = None
    published: bool = False


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    cover_url: Optional[str] = None
    published: Optional[bool] = None


CATEGORIES = [
    {"id": "estrategia", "name": "Estratégia de Marca", "icon": "target"},
    {"id": "identidade", "name": "Identidade Visual", "icon": "palette"},
    {"id": "posicionamento", "name": "Posicionamento", "icon": "crosshair"},
    {"id": "cultura", "name": "Cultura & Pessoas", "icon": "users"},
    {"id": "digital", "name": "Marketing Digital", "icon": "globe"},
    {"id": "metricas", "name": "Métricas & Analytics", "icon": "bar-chart"},
    {"id": "cases", "name": "Cases & Referências", "icon": "bookmark"},
    {"id": "geral", "name": "Geral", "icon": "book"},
]


@router.get("/academy/categories")
async def get_categories():
    return {"categories": CATEGORIES}


@router.get("/brands/{brand_id}/academy")
async def get_articles(brand_id: str, category: Optional[str] = None, user: dict = Depends(get_current_user)):
    """List articles for a brand"""
    query = {"brand_id": brand_id}
    if category:
        query["category"] = category

    articles = await db.academy_articles.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)

    stats = {
        "total": len(articles),
        "published": sum(1 for a in articles if a.get("published")),
        "draft": sum(1 for a in articles if not a.get("published")),
        "by_category": {}
    }
    for a in articles:
        cat = a.get("category", "geral")
        stats["by_category"][cat] = stats["by_category"].get(cat, 0) + 1

    return {"articles": articles, "stats": stats}


@router.post("/brands/{brand_id}/academy")
async def create_article(brand_id: str, article: ArticleCreate, user: dict = Depends(get_current_user)):
    """Create a new article"""
    doc = {
        "article_id": f"art_{uuid.uuid4().hex[:12]}",
        "brand_id": brand_id,
        "title": article.title,
        "summary": article.summary,
        "content": article.content,
        "category": article.category,
        "tags": article.tags,
        "cover_url": article.cover_url,
        "published": article.published,
        "author_id": user["user_id"],
        "author_name": user.get("name", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "views": 0
    }
    await db.academy_articles.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/brands/{brand_id}/academy/{article_id}")
async def get_article(brand_id: str, article_id: str, user: dict = Depends(get_current_user)):
    """Get a single article"""
    article = await db.academy_articles.find_one(
        {"brand_id": brand_id, "article_id": article_id}, {"_id": 0}
    )
    if not article:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")

    await db.academy_articles.update_one(
        {"article_id": article_id}, {"$inc": {"views": 1}}
    )
    return article


@router.put("/brands/{brand_id}/academy/{article_id}")
async def update_article(brand_id: str, article_id: str, update: ArticleUpdate, user: dict = Depends(get_current_user)):
    """Update an article"""
    updates = {k: v for k, v in update.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.academy_articles.update_one(
        {"brand_id": brand_id, "article_id": article_id}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    return {"success": True, "message": "Artigo atualizado!"}


@router.delete("/brands/{brand_id}/academy/{article_id}")
async def delete_article(brand_id: str, article_id: str, user: dict = Depends(get_current_user)):
    """Delete an article"""
    result = await db.academy_articles.delete_one({"brand_id": brand_id, "article_id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    return {"success": True, "message": "Artigo removido!"}
