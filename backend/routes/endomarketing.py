"""'De Dentro Pra Fora' — Endomarketing diagnosis & gamified plan generator.

Methodology by Sandro Serzedello (LaBrand co-founder).
"""
from datetime import datetime, timezone
from io import BytesIO
import json
import re

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from config import db
from utils.helpers import call_llm, get_current_user
from models.endomarketing import DiagnosisInput

router = APIRouter(tags=["Endomarketing"])

# ── Static questionnaire (18 questions across 6 pillars) ──────────────────
QUESTIONS = [
    # ENGAJAMENTO
    {"pilar": "engajamento",      "pergunta": "Os colaboradores conhecem e se identificam com os valores e propósito da empresa?"},
    {"pilar": "engajamento",      "pergunta": "Existe uma comunicação interna estruturada e frequente sobre metas e resultados?"},
    {"pilar": "engajamento",      "pergunta": "Os líderes são agentes ativos na disseminação da cultura da marca?"},
    # MERITOCRACIA
    {"pilar": "meritocracia",     "pergunta": "Há critérios claros e públicos para reconhecimento e promoção?"},
    {"pilar": "meritocracia",     "pergunta": "O desempenho individual é avaliado de forma consistente e com feedback regular?"},
    {"pilar": "meritocracia",     "pergunta": "Quem entrega mais recebe reconhecimento diferenciado dos demais?"},
    # ALTA PERFORMANCE
    {"pilar": "alta_performance", "pergunta": "Existe uma cultura de metas desafiadoras e acompanhamento de performance?"},
    {"pilar": "alta_performance", "pergunta": "Os colaboradores são incentivados a superar seus próprios resultados anteriores?"},
    {"pilar": "alta_performance", "pergunta": "Há rituais de celebração de conquistas e superação de metas?"},
    # RESULTADOS
    {"pilar": "resultados",       "pergunta": "Os KPIs do negócio são conhecidos e acompanhados pelos times internos?"},
    {"pilar": "resultados",       "pergunta": "Os resultados são compartilhados com transparência com toda a equipe?"},
    {"pilar": "resultados",       "pergunta": "Há ciclos regulares de revisão de performance com ações concretas?"},
    # ECONOMIA
    {"pilar": "economia",         "pergunta": "As ações internas de engajamento são planejadas com orçamento definido?"},
    {"pilar": "economia",         "pergunta": "Existe mensuração do retorno das iniciativas de endomarketing?"},
    {"pilar": "economia",         "pergunta": "As iniciativas internas são simples, replicáveis e escaláveis?"},
    # PERTENCIMENTO
    {"pilar": "pertencimento",    "pergunta": "As pessoas sentem orgulho de trabalhar na empresa e falam bem dela externamente?"},
    {"pilar": "pertencimento",    "pergunta": "Há rituais, símbolos ou narrativas que criam senso de identidade coletiva?"},
    {"pilar": "pertencimento",    "pergunta": "A empresa é percebida como um lugar onde as pessoas querem crescer?"},
]

PILLAR_LABELS = {
    "engajamento":      "Engajamento",
    "meritocracia":     "Meritocracia",
    "alta_performance": "Alta Performance",
    "resultados":       "Resultados",
    "economia":         "Economia",
    "pertencimento":    "Pertencimento",
}


def _maturity_level(score: float) -> str:
    if score <= 25:
        return "Marca em Risco"
    if score <= 50:
        return "Marca em Construção"
    if score <= 75:
        return "Marca em Movimento"
    return "Marca Viva"


def _calc_scores(respostas: list) -> dict:
    """Score per pillar = (sum of pillar answers / 12) * 100. Score geral = avg."""
    by_pilar: dict = {}
    for r in respostas:
        by_pilar.setdefault(r["pilar"], []).append(r["resposta"])

    scores = {}
    for pilar in PILLAR_LABELS.keys():
        soma = sum(by_pilar.get(pilar, []))
        scores[pilar] = round((soma / 12) * 100, 1)

    geral = round(sum(scores.values()) / len(PILLAR_LABELS), 1)
    scores["geral"] = geral
    scores["nivel_maturidade"] = _maturity_level(geral)
    return scores


def _strip_id(doc: dict | None) -> dict | None:
    if not doc:
        return None
    return {k: v for k, v in doc.items() if k != "_id"}


# ── ROUTE 1 — Static questions ────────────────────────────────────────────
@router.get("/endomarketing/questions")
async def get_questions(user: dict = Depends(get_current_user)):
    grouped: dict = {}
    for q in QUESTIONS:
        grouped.setdefault(q["pilar"], []).append(q["pergunta"])
    return {
        "questions": QUESTIONS,
        "grouped": grouped,
        "labels": PILLAR_LABELS,
        "total": len(QUESTIONS),
    }


# ── ROUTE 2 — Save / upsert diagnosis ────────────────────────────────────
@router.post("/endomarketing/diagnosis")
async def save_diagnosis(data: DiagnosisInput, user: dict = Depends(get_current_user)):
    if len(data.respostas) != len(QUESTIONS):
        raise HTTPException(status_code=400, detail=f"Esperado {len(QUESTIONS)} respostas, recebido {len(data.respostas)}")

    respostas_dict = [r.model_dump() for r in data.respostas]
    scores = _calc_scores(respostas_dict)
    now = datetime.now(timezone.utc).isoformat()

    existing = await db.endomarketing.find_one({"brand_id": data.brand_id})
    payload = {
        "brand_id": data.brand_id,
        "user_id": user["user_id"],
        "respostas": respostas_dict,
        "scores": scores,
        "updated_at": now,
    }
    if existing:
        await db.endomarketing.update_one(
            {"brand_id": data.brand_id},
            {"$set": payload},
        )
    else:
        import uuid
        payload["id"] = str(uuid.uuid4())
        payload["created_at"] = now
        payload["plano_endomarketing"] = None
        payload["temporada_gamificada"] = None
        await db.endomarketing.insert_one(payload)

    saved = await db.endomarketing.find_one({"brand_id": data.brand_id})
    return _strip_id(saved)


# ── ROUTE 3 — Get diagnosis ──────────────────────────────────────────────
@router.get("/endomarketing/diagnosis/{brand_id}")
async def get_diagnosis(brand_id: str, user: dict = Depends(get_current_user)):
    doc = await db.endomarketing.find_one({"brand_id": brand_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Diagnóstico não encontrado para esta marca")
    return _strip_id(doc)


# ── ROUTE 4 — Generate plan + gamification via LLM ───────────────────────
async def _gather_pillar_text(brand_id: str) -> dict:
    """Best-effort fetch of brand pillars to enrich the LLM prompt."""
    out = {"valores": "", "proposito": "", "promessa": "", "posicionamento": "", "personalidade": ""}
    pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(20)
    for p in pillars:
        pt = p.get("pillar_type")
        ans = p.get("answers") or {}
        flat = " ".join(str(v) for v in ans.values() if isinstance(v, (str, int, float)) and v)[:400]
        if pt == "values":
            out["valores"] = flat
        elif pt == "purpose":
            out["proposito"] = flat
        elif pt == "promise":
            out["promessa"] = flat
        elif pt == "positioning":
            out["posicionamento"] = flat
        elif pt == "personality":
            out["personalidade"] = flat
    return out


def _extract_json(text: str) -> dict:
    """LLM may wrap JSON in ```json fences; tolerate that."""
    text = text.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    # Last-resort: substring between first { and last }
    if not text.startswith("{"):
        first = text.find("{")
        last = text.rfind("}")
        if first != -1 and last != -1:
            text = text[first:last + 1]
    return json.loads(text)


@router.post("/endomarketing/generate/{brand_id}")
async def generate_plan(brand_id: str, user: dict = Depends(get_current_user)):
    diagnosis = await db.endomarketing.find_one({"brand_id": brand_id})
    if not diagnosis:
        raise HTTPException(status_code=404, detail="Diagnóstico não encontrado. Salve o diagnóstico primeiro.")

    s = diagnosis["scores"]
    brand_pillars = await _gather_pillar_text(brand_id)

    system_prompt = (
        "Você é Sandro Serzedello, cofundador da LaBrand e maior autoridade em "
        "Endomarketing e Branding do Brasil. Sempre responda APENAS com JSON válido, "
        "sem explicações antes ou depois, sem fences ```. Use português brasileiro."
    )

    user_prompt = f"""Com base nos dados da marca e no diagnóstico de endomarketing abaixo, gere um plano completo.

DADOS DA MARCA:
Valores: {brand_pillars['valores'] or 'não informado'}
Propósito: {brand_pillars['proposito'] or 'não informado'}
Promessa: {brand_pillars['promessa'] or 'não informado'}
Posicionamento: {brand_pillars['posicionamento'] or 'não informado'}
Personalidade: {brand_pillars['personalidade'] or 'não informado'}

SCORES DO DIAGNÓSTICO:
Engajamento: {s.get('engajamento', 0)}/100
Meritocracia: {s.get('meritocracia', 0)}/100
Alta Performance: {s.get('alta_performance', 0)}/100
Resultados: {s.get('resultados', 0)}/100
Economia: {s.get('economia', 0)}/100
Pertencimento: {s.get('pertencimento', 0)}/100
Score Geral: {s.get('geral', 0)}/100
Nível: {s.get('nivel_maturidade', '')}

Retorne APENAS um JSON válido com esta estrutura exata:
{{
  "plano_endomarketing": {{
    "diagnostico_executivo": "string com 3 parágrafos sobre a situação atual",
    "principais_gaps": ["gap1", "gap2", "gap3"],
    "recomendacoes_por_pilar": {{
      "engajamento": "string",
      "meritocracia": "string",
      "alta_performance": "string",
      "resultados": "string",
      "economia": "string",
      "pertencimento": "string"
    }},
    "plano_90_dias": [
      {{ "mes": 1, "foco": "string", "acoes": ["acao1", "acao2", "acao3"] }},
      {{ "mes": 2, "foco": "string", "acoes": ["acao1", "acao2", "acao3"] }},
      {{ "mes": 3, "foco": "string", "acoes": ["acao1", "acao2", "acao3"] }}
    ],
    "indicadores_sugeridos": ["kpi1", "kpi2", "kpi3"]
  }},
  "temporada_gamificada": {{
    "nome_da_temporada": "string criativo baseado na identidade da marca",
    "duracao_dias": 90,
    "narrativa": "string com o tema e a história da temporada",
    "kpi_principal": "string",
    "kpi_secundario": "string",
    "competicao": {{ "estrutura_ranking": "string", "criterio": "string", "ciclo": "string" }},
    "palco": {{ "ritual_semanal": "string", "ritual_encerramento": "string", "premio_principal": "string" }},
    "comunidade": {{ "nome_do_time": "string criativo", "identidade": "string", "ritual_de_pertencimento": "string" }},
    "trilhas_de_vitoria": [
      {{ "perfil": "Vendedor Competitivo", "trilha": "string" }},
      {{ "perfil": "Técnico Colaborativo", "trilha": "string" }},
      {{ "perfil": "Criativo", "trilha": "string" }}
    ],
    "mecanica_do_game": {{
      "pontos": "string como são ganhos",
      "niveis": ["Nível 1", "Nível 2", "Nível 3", "Nível 4"],
      "missoes_semanais": ["missão1", "missão2", "missão3"],
      "certificacoes": ["certificação1", "certificação2"]
    }},
    "cronograma": {{
      "abertura": "string como celebrar o lançamento",
      "checkpoints": "string rituais semanais",
      "encerramento": "string como celebrar o fim"
    }}
  }}
}}"""

    try:
        raw = await call_llm(system_prompt, user_prompt)
        parsed = _extract_json(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"Resposta da IA não é JSON válido: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao gerar plano com IA: {str(e)}")

    plano = parsed.get("plano_endomarketing")
    temporada = parsed.get("temporada_gamificada")
    if not plano or not temporada:
        raise HTTPException(status_code=502, detail="A IA não retornou os campos esperados")

    now = datetime.now(timezone.utc).isoformat()
    await db.endomarketing.update_one(
        {"brand_id": brand_id},
        {"$set": {
            "plano_endomarketing": plano,
            "temporada_gamificada": temporada,
            "updated_at": now,
        }},
    )
    saved = await db.endomarketing.find_one({"brand_id": brand_id})
    return _strip_id(saved)


# ── ROUTE 5 — Export PDF ──────────────────────────────────────────────────
def _footer(canv, doc):
    canv.saveState()
    canv.setFont("Helvetica-Oblique", 8)
    canv.setFillColor(colors.HexColor("#6B7280"))
    canv.drawString(2 * cm, 1.2 * cm, "De Dentro Pra Fora · Sandro Serzedello · LaBrand")
    canv.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Pág. {doc.page}")
    canv.restoreState()


@router.get("/endomarketing/export-pdf/{brand_id}")
async def export_pdf(brand_id: str, user: dict = Depends(get_current_user)):
    diagnosis = await db.endomarketing.find_one({"brand_id": brand_id})
    if not diagnosis:
        raise HTTPException(status_code=404, detail="Diagnóstico não encontrado")

    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    brand_name = brand.get("name", "Marca") if brand else "Marca"

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()

    H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=22, leading=26, textColor=colors.HexColor("#0D0E10"), spaceAfter=14)
    H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=15, leading=18, textColor=colors.HexColor("#FF5C00"), spaceAfter=10)
    H3 = ParagraphStyle("H3", parent=styles["Heading3"], fontSize=12, leading=15, textColor=colors.HexColor("#0D0E10"), spaceAfter=6)
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=10, leading=14, textColor=colors.HexColor("#1F2124"))
    small = ParagraphStyle("small", parent=styles["BodyText"], fontSize=9, leading=12, textColor=colors.HexColor("#6B7280"), alignment=TA_CENTER)
    quote = ParagraphStyle("quote", parent=body, alignment=TA_LEFT, leftIndent=12, textColor=colors.HexColor("#1F2124"), fontName="Helvetica-Oblique")

    story = []

    # ── Capa ──
    story.append(Spacer(1, 4 * cm))
    story.append(Paragraph("<b>LA</b><font color='#FF5C00'>Brand</font>", ParagraphStyle("brand", fontSize=28, alignment=TA_CENTER)))
    story.append(Spacer(1, 0.8 * cm))
    story.append(Paragraph("Metodologia Sandro Serzedello · Cofundador LaBrand", small))
    story.append(Spacer(1, 1.6 * cm))
    story.append(Paragraph("De Dentro Pra Fora", ParagraphStyle("cover", fontSize=36, alignment=TA_CENTER, textColor=colors.HexColor("#0D0E10"), spaceAfter=8)))
    story.append(Paragraph("Diagnóstico de Endomarketing & Cultura de Marca", ParagraphStyle("subc", fontSize=14, alignment=TA_CENTER, textColor=colors.HexColor("#6B7280"))))
    story.append(Spacer(1, 2 * cm))
    story.append(Paragraph(f"<b>{brand_name}</b>", ParagraphStyle("bn", fontSize=16, alignment=TA_CENTER)))
    story.append(Paragraph(datetime.now().strftime("%d de %B de %Y"), small))
    story.append(PageBreak())

    # ── Score ──
    s = diagnosis.get("scores", {})
    story.append(Paragraph("Score & Maturidade", H1))
    story.append(Paragraph(f"<font size='42' color='#FF5C00'><b>{s.get('geral', 0)}</b></font> / 100", ParagraphStyle("score", alignment=TA_CENTER, fontSize=14)))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(f"<para align='center'><b>{s.get('nivel_maturidade', '')}</b></para>", body))
    story.append(Spacer(1, 1 * cm))

    # Pillars table
    story.append(Paragraph("Scores por Pilar", H2))
    rows = [["Pilar", "Score"]]
    for k, label in PILLAR_LABELS.items():
        rows.append([label, f"{s.get(k, 0)}/100"])
    t = Table(rows, colWidths=[10 * cm, 4 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0D0E10")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F9FAFB"), colors.white]),
        ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#FF5C00")),
    ]))
    story.append(t)
    story.append(PageBreak())

    # ── Plano ──
    plano = diagnosis.get("plano_endomarketing")
    if plano:
        story.append(Paragraph("Plano de Endomarketing", H1))
        story.append(Paragraph("Diagnóstico Executivo", H2))
        for para in (plano.get("diagnostico_executivo") or "").split("\n\n"):
            if para.strip():
                story.append(Paragraph(para, body))
                story.append(Spacer(1, 0.2 * cm))

        story.append(Paragraph("Principais Gaps", H2))
        for gap in plano.get("principais_gaps", []):
            story.append(Paragraph(f"• {gap}", body))
        story.append(Spacer(1, 0.4 * cm))

        story.append(Paragraph("Recomendações por Pilar", H2))
        for k, label in PILLAR_LABELS.items():
            rec = (plano.get("recomendacoes_por_pilar") or {}).get(k, "—")
            story.append(Paragraph(f"<b>{label}</b>", H3))
            story.append(Paragraph(rec, body))
            story.append(Spacer(1, 0.2 * cm))

        story.append(Paragraph("Plano 90 Dias", H2))
        for mes in plano.get("plano_90_dias", []):
            story.append(Paragraph(f"<b>Mês {mes.get('mes')}: {mes.get('foco', '')}</b>", H3))
            for acao in mes.get("acoes", []):
                story.append(Paragraph(f"• {acao}", body))
            story.append(Spacer(1, 0.2 * cm))

        story.append(Paragraph("Indicadores Sugeridos", H2))
        for kpi in plano.get("indicadores_sugeridos", []):
            story.append(Paragraph(f"• {kpi}", body))
        story.append(PageBreak())

    # ── Temporada ──
    tg = diagnosis.get("temporada_gamificada")
    if tg:
        story.append(Paragraph("Temporada Gamificada", H1))
        story.append(Paragraph(f"<b>{tg.get('nome_da_temporada', '')}</b> · {tg.get('duracao_dias', 90)} dias", H2))
        story.append(Paragraph(tg.get("narrativa", ""), quote))
        story.append(Spacer(1, 0.4 * cm))
        story.append(Paragraph(f"<b>KPI Principal:</b> {tg.get('kpi_principal', '—')}", body))
        story.append(Paragraph(f"<b>KPI Secundário:</b> {tg.get('kpi_secundario', '—')}", body))
        story.append(Spacer(1, 0.5 * cm))

        for section_key, section_label in [
            ("competicao", "Competição"),
            ("palco", "Palco"),
            ("comunidade", "Comunidade"),
            ("mecanica_do_game", "O Game"),
            ("cronograma", "Cronograma"),
        ]:
            data_sec = tg.get(section_key) or {}
            story.append(Paragraph(section_label, H2))
            for k, v in data_sec.items():
                if isinstance(v, list):
                    story.append(Paragraph(f"<b>{k.replace('_', ' ').title()}:</b>", H3))
                    for item in v:
                        story.append(Paragraph(f"• {item}", body))
                else:
                    story.append(Paragraph(f"<b>{k.replace('_', ' ').title()}:</b> {v}", body))
            story.append(Spacer(1, 0.3 * cm))

        story.append(Paragraph("Trilhas de Vitória", H2))
        for trilha in tg.get("trilhas_de_vitoria", []):
            story.append(Paragraph(f"<b>{trilha.get('perfil', '')}</b>", H3))
            story.append(Paragraph(trilha.get("trilha", ""), body))
            story.append(Spacer(1, 0.2 * cm))

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    buf.seek(0)
    safe_name = re.sub(r"[^a-zA-Z0-9_-]+", "_", brand_name)[:40]
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="DeDentroProFora_{safe_name}.pdf"'},
    )
