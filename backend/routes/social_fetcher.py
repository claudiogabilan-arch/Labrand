"""Social Media Fetcher - Pulls real data from connected platform APIs"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import httpx
import uuid
import logging

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Social Fetcher"])
logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.facebook.com/v21.0"
INSTAGRAM_GRAPH = "https://graph.instagram.com/v21.0"
YOUTUBE_API = "https://www.googleapis.com/youtube/v3"
LINKEDIN_API = "https://api.linkedin.com/rest"
TIKTOK_API = "https://open.tiktokapis.com/v2"

# ── Sentiment (reuse from social_listening) ────────────────────────
POSITIVE_KW = {"ótimo","excelente","incrível","maravilhoso","perfeito","amei","adorei","recomendo","top","melhor","parabéns","sucesso","qualidade","satisfeito","obrigado","grato","love","great","amazing","awesome","best","perfect","thank"}
NEGATIVE_KW = {"péssimo","horrível","terrível","ruim","pior","decepcionado","problema","falha","erro","demora","lento","caro","fraude","reclamação","insatisfeito","raiva","hate","worst","terrible","horrible","bad","awful","scam","disappointed"}


def _sentiment(text: str) -> dict:
    lower = text.lower()
    pos = sum(1 for w in POSITIVE_KW if w in lower)
    neg = sum(1 for w in NEGATIVE_KW if w in lower)
    if pos > neg:
        return {"label": "positive", "score": min(0.9, 0.5 + pos * 0.1), "confidence": "rule_based"}
    if neg > pos:
        return {"label": "negative", "score": max(0.1, 0.5 - neg * 0.1), "confidence": "rule_based"}
    return {"label": "neutral", "score": 0.5, "confidence": "rule_based"}


async def _get_credentials(brand_id: str, platform: str) -> dict:
    conn = await db.social_connections.find_one(
        {"brand_id": brand_id, "platform": platform, "status": "connected"},
    )
    if not conn:
        raise HTTPException(status_code=400, detail=f"{platform} não está conectado. Conecte em Social Listening.")
    return conn.get("credentials", {})


async def _save_mentions(brand_id: str, platform: str, items: list) -> int:
    """Save fetched items as social mentions, skip duplicates by external_id"""
    saved = 0
    for item in items:
        ext_id = item.get("external_id", "")
        if ext_id:
            existing = await db.social_mentions.find_one({"brand_id": brand_id, "external_id": ext_id})
            if existing:
                continue
        doc = {
            "mention_id": f"mention_{uuid.uuid4().hex[:12]}",
            "brand_id": brand_id,
            "platform": platform,
            "external_id": ext_id,
            "content": item.get("content", ""),
            "author": item.get("author", ""),
            "url": item.get("url", ""),
            "engagement": item.get("engagement", {}),
            "sentiment": _sentiment(item.get("content", "")),
            "media_type": item.get("media_type", ""),
            "posted_at": item.get("posted_at", datetime.now(timezone.utc).isoformat()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source": "api",
            "raw_metrics": item.get("raw_metrics", {}),
        }
        await db.social_mentions.insert_one(doc)
        saved += 1
    return saved


# ──────────────────────────────────────────────────
# INSTAGRAM
# ──────────────────────────────────────────────────
@router.post("/brands/{brand_id}/social-fetcher/instagram")
async def fetch_instagram(brand_id: str, user: dict = Depends(get_current_user)):
    """Fetch recent posts from Instagram Graph API"""
    creds = await _get_credentials(brand_id, "instagram")
    token = creds.get("access_token", "")
    if not token:
        raise HTTPException(status_code=400, detail="Access Token do Instagram não configurado")

    items = []
    async with httpx.AsyncClient(timeout=20.0) as client:
        # Get user profile
        me_resp = await client.get(f"{INSTAGRAM_GRAPH}/me", params={
            "fields": "id,username,name,followers_count,media_count",
            "access_token": token,
        })
        if me_resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Erro Instagram API: {me_resp.text[:300]}")
        profile = me_resp.json()

        # Save profile stats
        await db.social_profiles.update_one(
            {"brand_id": brand_id, "platform": "instagram"},
            {"$set": {
                "brand_id": brand_id, "platform": "instagram",
                "username": profile.get("username", ""),
                "name": profile.get("name", ""),
                "followers": profile.get("followers_count", 0),
                "media_count": profile.get("media_count", 0),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

        # Fetch recent media
        media_resp = await client.get(f"{INSTAGRAM_GRAPH}/me/media", params={
            "fields": "id,caption,like_count,comments_count,timestamp,media_type,permalink",
            "limit": "25",
            "access_token": token,
        })
        if media_resp.status_code == 200:
            for post in media_resp.json().get("data", []):
                items.append({
                    "external_id": f"ig_{post['id']}",
                    "content": post.get("caption", ""),
                    "author": profile.get("username", ""),
                    "url": post.get("permalink", ""),
                    "media_type": post.get("media_type", ""),
                    "engagement": {
                        "likes": post.get("like_count", 0),
                        "comments": post.get("comments_count", 0),
                    },
                    "posted_at": post.get("timestamp", ""),
                    "raw_metrics": post,
                })

    saved = await _save_mentions(brand_id, "instagram", items)
    return {
        "success": True,
        "platform": "instagram",
        "fetched": len(items),
        "new_saved": saved,
        "profile": {
            "username": profile.get("username"),
            "followers": profile.get("followers_count", 0),
            "media_count": profile.get("media_count", 0),
        },
    }


# ──────────────────────────────────────────────────
# FACEBOOK
# ──────────────────────────────────────────────────
@router.post("/brands/{brand_id}/social-fetcher/facebook")
async def fetch_facebook(brand_id: str, user: dict = Depends(get_current_user)):
    """Fetch recent posts from Facebook Pages API"""
    creds = await _get_credentials(brand_id, "facebook")
    token = creds.get("page_access_token", "")
    if not token:
        raise HTTPException(status_code=400, detail="Page Access Token do Facebook não configurado")

    items = []
    async with httpx.AsyncClient(timeout=20.0) as client:
        # Get page info
        me_resp = await client.get(f"{GRAPH_API}/me", params={
            "fields": "id,name,fan_count,followers_count",
            "access_token": token,
        })
        if me_resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Erro Facebook API: {me_resp.text[:300]}")
        page = me_resp.json()

        await db.social_profiles.update_one(
            {"brand_id": brand_id, "platform": "facebook"},
            {"$set": {
                "brand_id": brand_id, "platform": "facebook",
                "name": page.get("name", ""),
                "page_id": page.get("id", ""),
                "fans": page.get("fan_count", 0),
                "followers": page.get("followers_count", 0),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

        # Fetch posts
        posts_resp = await client.get(f"{GRAPH_API}/me/posts", params={
            "fields": "id,message,created_time,likes.summary(true),comments.summary(true),shares",
            "limit": "25",
            "access_token": token,
        })
        if posts_resp.status_code == 200:
            for post in posts_resp.json().get("data", []):
                likes = post.get("likes", {}).get("summary", {}).get("total_count", 0)
                comments = post.get("comments", {}).get("summary", {}).get("total_count", 0)
                shares = post.get("shares", {}).get("count", 0)
                items.append({
                    "external_id": f"fb_{post['id']}",
                    "content": post.get("message", ""),
                    "author": page.get("name", ""),
                    "url": f"https://facebook.com/{post['id']}",
                    "engagement": {"likes": likes, "comments": comments, "shares": shares},
                    "posted_at": post.get("created_time", ""),
                    "raw_metrics": {"likes": likes, "comments": comments, "shares": shares},
                })

    saved = await _save_mentions(brand_id, "facebook", items)
    return {
        "success": True,
        "platform": "facebook",
        "fetched": len(items),
        "new_saved": saved,
        "profile": {
            "name": page.get("name"),
            "fans": page.get("fan_count", 0),
            "followers": page.get("followers_count", 0),
        },
    }


# ──────────────────────────────────────────────────
# YOUTUBE
# ──────────────────────────────────────────────────
@router.post("/brands/{brand_id}/social-fetcher/youtube")
async def fetch_youtube(brand_id: str, user: dict = Depends(get_current_user)):
    """Fetch channel stats and recent videos from YouTube Data API v3"""
    creds = await _get_credentials(brand_id, "youtube")
    api_key = creds.get("api_key", "")
    channel_id = creds.get("channel_id", "")
    if not api_key or not channel_id:
        raise HTTPException(status_code=400, detail="API Key e Channel ID são obrigatórios")

    items = []
    async with httpx.AsyncClient(timeout=20.0) as client:
        # Channel stats
        ch_resp = await client.get(f"{YOUTUBE_API}/channels", params={
            "part": "snippet,statistics,contentDetails",
            "id": channel_id,
            "key": api_key,
        })
        if ch_resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Erro YouTube API: {ch_resp.text[:300]}")

        ch_data = ch_resp.json()
        if not ch_data.get("items"):
            raise HTTPException(status_code=404, detail="Canal não encontrado")

        channel = ch_data["items"][0]
        stats = channel.get("statistics", {})
        snippet = channel.get("snippet", {})
        uploads_id = channel.get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads", "")

        await db.social_profiles.update_one(
            {"brand_id": brand_id, "platform": "youtube"},
            {"$set": {
                "brand_id": brand_id, "platform": "youtube",
                "name": snippet.get("title", ""),
                "channel_id": channel_id,
                "subscribers": int(stats.get("subscriberCount", 0)),
                "total_views": int(stats.get("viewCount", 0)),
                "video_count": int(stats.get("videoCount", 0)),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

        # Get recent videos from uploads playlist
        if uploads_id:
            pl_resp = await client.get(f"{YOUTUBE_API}/playlistItems", params={
                "part": "snippet", "playlistId": uploads_id, "maxResults": "15", "key": api_key,
            })
            if pl_resp.status_code == 200:
                video_ids = [it["snippet"]["resourceId"]["videoId"] for it in pl_resp.json().get("items", [])]
                if video_ids:
                    vids_resp = await client.get(f"{YOUTUBE_API}/videos", params={
                        "part": "snippet,statistics",
                        "id": ",".join(video_ids),
                        "key": api_key,
                    })
                    if vids_resp.status_code == 200:
                        for vid in vids_resp.json().get("items", []):
                            vs = vid.get("statistics", {})
                            items.append({
                                "external_id": f"yt_{vid['id']}",
                                "content": vid["snippet"].get("title", ""),
                                "author": snippet.get("title", ""),
                                "url": f"https://youtube.com/watch?v={vid['id']}",
                                "media_type": "VIDEO",
                                "engagement": {
                                    "likes": int(vs.get("likeCount", 0)),
                                    "comments": int(vs.get("commentCount", 0)),
                                    "views": int(vs.get("viewCount", 0)),
                                },
                                "posted_at": vid["snippet"].get("publishedAt", ""),
                                "raw_metrics": vs,
                            })

    saved = await _save_mentions(brand_id, "youtube", items)
    return {
        "success": True,
        "platform": "youtube",
        "fetched": len(items),
        "new_saved": saved,
        "profile": {
            "name": snippet.get("title"),
            "subscribers": int(stats.get("subscriberCount", 0)),
            "total_views": int(stats.get("viewCount", 0)),
            "video_count": int(stats.get("videoCount", 0)),
        },
    }


# ──────────────────────────────────────────────────
# LINKEDIN
# ──────────────────────────────────────────────────
@router.post("/brands/{brand_id}/social-fetcher/linkedin")
async def fetch_linkedin(brand_id: str, user: dict = Depends(get_current_user)):
    """Fetch organization posts from LinkedIn API"""
    creds = await _get_credentials(brand_id, "linkedin")
    token = creds.get("access_token", "")
    if not token:
        raise HTTPException(status_code=400, detail="Access Token do LinkedIn não configurado")

    items = []
    headers = {"Authorization": f"Bearer {token}", "X-Restli-Protocol-Version": "2.0.0", "Linkedin-Version": "202603"}

    async with httpx.AsyncClient(timeout=20.0) as client:
        # Get organization info
        me_resp = await client.get(f"{LINKEDIN_API}/me", headers=headers)
        org_name = ""
        org_id = ""

        if me_resp.status_code == 200:
            me_data = me_resp.json()
            org_name = me_data.get("localizedFirstName", "") + " " + me_data.get("localizedLastName", "")

        # Try to get organization posts
        org_resp = await client.get(
            f"{LINKEDIN_API}/ugcPosts",
            params={"q": "authors", "count": "15"},
            headers=headers,
        )
        if org_resp.status_code == 200:
            for post in org_resp.json().get("elements", []):
                text = ""
                specific = post.get("specificContent", {}).get("com.linkedin.ugc.ShareContent", {})
                if specific:
                    text = specific.get("shareCommentary", {}).get("text", "")
                items.append({
                    "external_id": f"li_{post.get('id', uuid.uuid4().hex[:8])}",
                    "content": text,
                    "author": org_name,
                    "url": "",
                    "engagement": {},
                    "posted_at": datetime.fromtimestamp(post.get("created", {}).get("time", 0) / 1000, tz=timezone.utc).isoformat() if post.get("created", {}).get("time") else "",
                    "raw_metrics": {},
                })

        await db.social_profiles.update_one(
            {"brand_id": brand_id, "platform": "linkedin"},
            {"$set": {
                "brand_id": brand_id, "platform": "linkedin",
                "name": org_name,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

    saved = await _save_mentions(brand_id, "linkedin", items)
    return {
        "success": True,
        "platform": "linkedin",
        "fetched": len(items),
        "new_saved": saved,
        "profile": {"name": org_name},
    }


# ──────────────────────────────────────────────────
# TIKTOK (Creator / Organic)
# ──────────────────────────────────────────────────
@router.post("/brands/{brand_id}/social-fetcher/tiktok")
async def fetch_tiktok(brand_id: str, user: dict = Depends(get_current_user)):
    """Fetch user videos from TikTok Content Posting API / Display API"""
    creds = await _get_credentials(brand_id, "tiktok")
    token = creds.get("access_token", "")
    if not token:
        raise HTTPException(status_code=400, detail="Access Token do TikTok não configurado")

    items = []
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=20.0) as client:
        # Get user info
        user_resp = await client.get(f"{TIKTOK_API}/user/info/", params={
            "fields": "display_name,follower_count,following_count,likes_count,video_count,avatar_url",
        }, headers=headers)

        profile_data = {}
        if user_resp.status_code == 200:
            udata = user_resp.json().get("data", {}).get("user", {})
            profile_data = {
                "name": udata.get("display_name", ""),
                "followers": udata.get("follower_count", 0),
                "following": udata.get("following_count", 0),
                "likes": udata.get("likes_count", 0),
                "video_count": udata.get("video_count", 0),
            }
            await db.social_profiles.update_one(
                {"brand_id": brand_id, "platform": "tiktok"},
                {"$set": {
                    "brand_id": brand_id, "platform": "tiktok",
                    **profile_data,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
                upsert=True,
            )

        # Get user videos
        vids_resp = await client.post(f"{TIKTOK_API}/video/list/", json={
            "max_count": 20,
        }, headers=headers)
        if vids_resp.status_code == 200:
            for vid in vids_resp.json().get("data", {}).get("videos", []):
                items.append({
                    "external_id": f"tt_{vid.get('id', '')}",
                    "content": vid.get("title", "") or vid.get("video_description", ""),
                    "author": profile_data.get("name", ""),
                    "url": vid.get("share_url", ""),
                    "media_type": "VIDEO",
                    "engagement": {
                        "likes": vid.get("like_count", 0),
                        "comments": vid.get("comment_count", 0),
                        "views": vid.get("view_count", 0),
                        "shares": vid.get("share_count", 0),
                    },
                    "posted_at": datetime.fromtimestamp(vid.get("create_time", 0), tz=timezone.utc).isoformat() if vid.get("create_time") else "",
                    "raw_metrics": vid,
                })

    saved = await _save_mentions(brand_id, "tiktok", items)
    return {
        "success": True,
        "platform": "tiktok",
        "fetched": len(items),
        "new_saved": saved,
        "profile": profile_data,
    }


# ──────────────────────────────────────────────────
# UNIVERSAL: Fetch all connected platforms at once
# ──────────────────────────────────────────────────
@router.post("/brands/{brand_id}/social-fetcher/all")
async def fetch_all_platforms(brand_id: str, user: dict = Depends(get_current_user)):
    """Fetch data from all connected platforms"""
    connections = await db.social_connections.find(
        {"brand_id": brand_id, "status": "connected"},
        {"_id": 0, "platform": 1},
    ).to_list(10)

    if not connections:
        raise HTTPException(status_code=400, detail="Nenhuma rede social conectada")

    results = {}
    fetchers = {
        "instagram": fetch_instagram,
        "facebook": fetch_facebook,
        "youtube": fetch_youtube,
        "linkedin": fetch_linkedin,
        "tiktok": fetch_tiktok,
    }

    for conn in connections:
        platform = conn["platform"]
        if platform in fetchers:
            try:
                result = await fetchers[platform](brand_id, user)
                results[platform] = result
            except Exception as exc:
                results[platform] = {"success": False, "error": str(exc)}

    return {"results": results, "platforms_fetched": len(results)}


# ──────────────────────────────────────────────────
# PROFILES: Get stored profile data
# ──────────────────────────────────────────────────
@router.get("/brands/{brand_id}/social-profiles")
async def get_social_profiles(brand_id: str, user: dict = Depends(get_current_user)):
    """Get stored social media profile metrics"""
    profiles = await db.social_profiles.find(
        {"brand_id": brand_id}, {"_id": 0}
    ).to_list(10)
    return {"profiles": profiles}
