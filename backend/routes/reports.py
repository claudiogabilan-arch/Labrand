"""PDF Report Generation Module - Enhanced v2
- Dynamic report title on cover
- Fetches data from all pillar collections (pillar_start, pillar_values, etc.)
- Proper text wrapping in tables (no text overlap)
- LaBrand logos: white on cover, black on interior headers
- Portuguese date formatting
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from io import BytesIO
import uuid
import os
import logging

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, Image
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.barcharts import VerticalBarChart

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Reports"])
logger = logging.getLogger(__name__)

# Colors
BRAND_DARK = colors.HexColor("#1a1a2e")
BRAND_PRIMARY = colors.HexColor("#e67e22")
BRAND_ACCENT = colors.HexColor("#f39c12")
BRAND_LIGHT_BG = colors.HexColor("#faf9f7")
BRAND_GRAY = colors.HexColor("#6b7280")
BRAND_LIGHT_GRAY = colors.HexColor("#9ca3af")
BRAND_GREEN = colors.HexColor("#22c55e")
BRAND_YELLOW = colors.HexColor("#f59e0b")
BRAND_RED = colors.HexColor("#ef4444")
BRAND_BLUE = colors.HexColor("#3b82f6")
WHITE = colors.white
BORDER_COLOR = colors.HexColor("#d1d5db")

PAGE_W, PAGE_H = A4

# Logo paths
ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
LOGO_WHITE = os.path.join(ASSETS_DIR, "labrand_logo_white.png")
LOGO_BLACK = os.path.join(ASSETS_DIR, "labrand_logo_black.png")

# Portuguese months
MESES_PT = {
    1: "janeiro", 2: "fevereiro", 3: "março", 4: "abril",
    5: "maio", 6: "junho", 7: "julho", 8: "agosto",
    9: "setembro", 10: "outubro", 11: "novembro", 12: "dezembro"
}

PILLAR_NAMES = {
    "start": "Ponto de Partida",
    "values": "Valores",
    "purpose": "Propósito",
    "promise": "Promessa",
    "positioning": "Posicionamento",
    "personality": "Personalidade",
    "universality": "Universalidade"
}

PILLAR_COLLECTIONS = {
    "start": "pillar_start",
    "values": "pillar_values",
    "purpose": "pillar_purpose",
    "promise": "pillar_promise",
    "positioning": "pillar_positioning",
    "personality": "pillar_personality",
    "universality": "pillar_universality"
}

PILLAR_FIELD_LABELS = {
    "desafio": "Desafio",
    "background": "Background",
    "urgencia": "Urgência",
    "finalidade_marca": "Finalidade da Marca",
    "cenario_competitivo": "Cenário Competitivo",
    "valores": "Valores",
    "necessidades": "Necessidades",
    "cruzamento": "Cruzamento",
    "proposito": "Propósito",
    "missao": "Missão",
    "visao": "Visão",
    "promessa_principal": "Promessa Principal",
    "promessa_emocional": "Promessa Emocional",
    "promessa_funcional": "Promessa Funcional",
    "declaracao_posicionamento": "Declaração de Posicionamento",
    "publico_alvo": "Público-Alvo",
    "diferencial": "Diferencial",
    "arquetipo_principal": "Arquétipo Principal",
    "arquetipo_secundario": "Arquétipo Secundário",
    "personalidade_customizada": "Personalidade Customizada",
    "atributos_desejados": "Atributos Desejados",
    "atributos_indesejados": "Atributos Indesejados",
    "narrativa_individual": "Narrativa Individual",
    "tom_de_voz": "Tom de Voz",
    "essencia": "Essência",
    "mantra": "Mantra",
    "receita_anual": "Receita Anual",
    "lucro_operacional": "Lucro Operacional",
    "role_of_brand": "Role of Brand",
    "custo_capital": "Custo de Capital",
    "margem_operacional": "Margem Operacional",
    "rbi_justificativa": "Justificativa RBI"
}


class PDFReportRequest(BaseModel):
    sections: List[str] = ["summary", "pillars", "score", "touchpoints", "recommendations"]
    include_charts: bool = True
    report_title: Optional[str] = "Relatório Executivo"
    language: str = "pt-BR"
    pillars_filter: Optional[List[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    prepared_by_name: Optional[str] = None
    prepared_by_email: Optional[str] = None


def _date_pt(dt: datetime = None) -> str:
    """Format date in Portuguese"""
    dt = dt or datetime.now()
    return f"{dt.day} de {MESES_PT[dt.month]} de {dt.year}"


def _date_short_pt(dt: datetime = None) -> str:
    dt = dt or datetime.now()
    return f"{dt.day:02d}/{dt.month:02d}/{dt.year}"


def _build_styles():
    styles = getSampleStyleSheet()
    s = {}
    s['cover_title'] = ParagraphStyle(
        'CoverTitle', parent=styles['Heading1'],
        fontSize=32, leading=38, spaceAfter=8,
        textColor=WHITE, fontName='Times-Bold', alignment=TA_LEFT
    )
    s['cover_sub'] = ParagraphStyle(
        'CoverSub', parent=styles['Normal'],
        fontSize=13, leading=18, textColor=colors.HexColor("#d4d4d8"),
        fontName='Helvetica'
    )
    s['section_title'] = ParagraphStyle(
        'SectionTitle', parent=styles['Heading2'],
        fontSize=16, leading=20, spaceBefore=16, spaceAfter=10,
        textColor=BRAND_DARK, fontName='Times-Bold'
    )
    s['section_num'] = ParagraphStyle(
        'SectionNum', parent=styles['Normal'],
        fontSize=10, textColor=BRAND_PRIMARY, fontName='Helvetica-Bold',
        spaceBefore=14, spaceAfter=2
    )
    s['editorial_quote'] = ParagraphStyle(
        'EditorialQuote', parent=styles['Normal'],
        fontSize=13, leading=18, textColor=BRAND_DARK,
        fontName='Times-Italic', alignment=TA_CENTER,
        spaceBefore=12, spaceAfter=12
    )
    s['body'] = ParagraphStyle(
        'Body', parent=styles['Normal'],
        fontSize=9, leading=13, textColor=colors.HexColor("#374151"),
        fontName='Helvetica'
    )
    s['body_bold'] = ParagraphStyle(
        'BodyBold', parent=styles['Normal'],
        fontSize=9, leading=13, textColor=colors.HexColor("#374151"),
        fontName='Helvetica-Bold'
    )
    s['cell'] = ParagraphStyle(
        'Cell', parent=styles['Normal'],
        fontSize=8, leading=11, textColor=colors.HexColor("#374151"),
        fontName='Helvetica', wordWrap='CJK'
    )
    s['cell_bold'] = ParagraphStyle(
        'CellBold', parent=styles['Normal'],
        fontSize=8, leading=11, textColor=colors.HexColor("#374151"),
        fontName='Helvetica-Bold', wordWrap='CJK'
    )
    s['cell_header'] = ParagraphStyle(
        'CellHeader', parent=styles['Normal'],
        fontSize=8, leading=11, textColor=WHITE,
        fontName='Helvetica-Bold', alignment=TA_CENTER, wordWrap='CJK'
    )
    s['cell_center'] = ParagraphStyle(
        'CellCenter', parent=styles['Normal'],
        fontSize=8, leading=11, textColor=colors.HexColor("#374151"),
        fontName='Helvetica', alignment=TA_CENTER, wordWrap='CJK'
    )
    s['metric_value'] = ParagraphStyle(
        'MetricValue', parent=styles['Normal'],
        fontSize=22, leading=26, textColor=BRAND_DARK,
        fontName='Helvetica-Bold', alignment=TA_CENTER
    )
    s['metric_label'] = ParagraphStyle(
        'MetricLabel', parent=styles['Normal'],
        fontSize=8, textColor=BRAND_GRAY,
        fontName='Helvetica', alignment=TA_CENTER
    )
    return s


def _header_footer(canvas, doc, brand_name: str, client_logo_path=None, primary_color=None):
    """Interior pages: client logo/brand name top-left, page count top-right, confidential footer"""
    canvas.saveState()
    effective_primary = primary_color or BRAND_PRIMARY

    # Top-left: Client logo or brand name
    if client_logo_path and os.path.exists(client_logo_path):
        try:
            canvas.drawImage(client_logo_path, 2*cm, PAGE_H - 1.6*cm, width=2.2*cm, height=0.7*cm,
                             preserveAspectRatio=True, mask='auto')
        except Exception:
            canvas.setFont("Helvetica-Bold", 8)
            canvas.setFillColor(BRAND_DARK)
            canvas.drawString(2*cm, PAGE_H - 1.2*cm, brand_name)
    else:
        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(BRAND_DARK)
        canvas.drawString(2*cm, PAGE_H - 1.2*cm, brand_name)

    # Top-right: Page number
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(BRAND_GRAY)
    canvas.drawRightString(PAGE_W - 2*cm, PAGE_H - 1.2*cm, f"Página {doc.page}")

    # Top line
    canvas.setStrokeColor(effective_primary)
    canvas.setLineWidth(1.5)
    canvas.line(2*cm, PAGE_H - 1.8*cm, PAGE_W - 2*cm, PAGE_H - 1.8*cm)

    # Footer
    canvas.setStrokeColor(colors.HexColor("#e0e0e0"))
    canvas.setLineWidth(0.5)
    canvas.line(2*cm, 1.5*cm, PAGE_W - 2*cm, 1.5*cm)

    canvas.setFont("Helvetica", 6.5)
    canvas.setFillColor(BRAND_LIGHT_GRAY)
    canvas.drawString(2*cm, 1.0*cm, f"Confidencial — uso restrito a {brand_name}")
    canvas.drawRightString(PAGE_W - 2*cm, 1.0*cm, f"{_date_short_pt()}  |  powered by LaBrand")
    canvas.restoreState()


def _score_bar(score: int, width: float = 420, height: float = 40) -> Drawing:
    d = Drawing(width, height)
    bar_h = 14
    bar_y = (height - bar_h) / 2

    d.add(Rect(0, bar_y, width, bar_h, fillColor=colors.HexColor("#e5e7eb"), strokeColor=None, rx=7))

    fill_color = BRAND_GREEN if score >= 70 else (BRAND_YELLOW if score >= 40 else BRAND_RED)
    fill_w = max(0, min(width * score / 100, width))
    if fill_w > 0:
        d.add(Rect(0, bar_y, fill_w, bar_h, fillColor=fill_color, strokeColor=None, rx=7))

    text_x = min(fill_w + 8, width - 25)
    d.add(String(text_x, bar_y + 2, f"{score}%", fontSize=9, fontName="Helvetica-Bold", fillColor=BRAND_DARK))
    return d


def _make_table(header_row, data_rows, col_widths, styles):
    """Build a table with Paragraph-wrapped cells (no text overflow)"""
    all_rows = []
    # Header
    hdr = [Paragraph(str(h), styles['cell_header']) for h in header_row]
    all_rows.append(hdr)
    # Data
    for row in data_rows:
        wrapped = []
        for i, val in enumerate(row):
            if isinstance(val, Paragraph):
                wrapped.append(val)
            else:
                st = styles['cell'] if i > 0 else styles['cell_bold']
                wrapped.append(Paragraph(str(val), st))
        all_rows.append(wrapped)

    table = Table(all_rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BRAND_LIGHT_BG]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ]))
    return table


def _format_value(val) -> str:
    """Format a value for display in the report"""
    if isinstance(val, list):
        if not val:
            return "-"
        items = []
        for item in val[:5]:
            if isinstance(item, dict):
                name = item.get('nome', item.get('name', ''))
                desc = item.get('descricao', item.get('description', ''))
                if name and desc:
                    items.append(f"{name}: {desc}")
                elif name:
                    items.append(name)
                else:
                    items.append(str(item)[:60])
            else:
                items.append(str(item))
        return "; ".join(items)
    elif isinstance(val, dict):
        parts = []
        for k, v in val.items():
            if v and str(v).strip():
                parts.append(f"{k}: {v}")
        return "; ".join(parts[:3]) if parts else "-"
    elif val is None or str(val).strip() == "":
        return "-"
    return str(val)


async def _fetch_all_pillar_data(brand_id: str) -> dict:
    """Fetch pillar data from ALL separate collections"""
    result = {}
    for pillar_key, collection_name in PILLAR_COLLECTIONS.items():
        doc = await db[collection_name].find_one({"brand_id": brand_id}, {"_id": 0})
        if doc:
            # Remove metadata fields
            data = {k: v for k, v in doc.items()
                    if k not in ("brand_id", "updated_at", "pillar_id", "created_at")}
            if any(v for v in data.values() if v and str(v).strip() and str(v) != "[]"):
                result[pillar_key] = data

    # Also check legacy 'pillars' collection
    legacy = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(20)
    for p in legacy:
        pt = p.get("pillar_type")
        if pt and pt not in result and p.get("answers"):
            result[pt] = p["answers"]

    return result


@router.post("/brands/{brand_id}/reports/executive-pdf")
async def generate_executive_pdf(brand_id: str, request: PDFReportRequest, user: dict = Depends(get_current_user)):
    """Generate enhanced executive PDF report with client branding"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")

    # Collect ALL data
    pillars_data = await _fetch_all_pillar_data(brand_id)
    maturity = await db.maturity_diagnosis.find_one({"brand_id": brand_id}, {"_id": 0})
    touchpoints = await db.touchpoints.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
    bvs_list = await db.bvs_scores.find({"brand_id": brand_id}, {"_id": 0}).sort("calculated_at", -1).to_list(1)
    culture = await db.brand_culture.find_one({"brand_id": brand_id}, {"_id": 0})
    tracking = await db.brand_tracking.find({"brand_id": brand_id}, {"_id": 0}).sort("created_at", -1).to_list(5)

    # Fetch white-label config for client colors
    wl = await db.white_label.find_one({"brand_id": brand_id}, {"_id": 0})
    client_primary = BRAND_PRIMARY
    client_accent = BRAND_ACCENT
    client_cover_bg = BRAND_DARK
    if wl and wl.get("enabled"):
        if wl.get("primary_color"):
            try:
                client_primary = colors.HexColor(wl["primary_color"])
                client_cover_bg = colors.HexColor(wl["primary_color"])
            except Exception:
                pass
        if wl.get("accent_color"):
            try:
                client_accent = colors.HexColor(wl["accent_color"])
            except Exception:
                pass

    # Resolve client logo path
    client_logo_path = None
    if brand.get("logo_url"):
        potential = os.path.join(os.path.dirname(os.path.dirname(__file__)), brand["logo_url"].lstrip("/"))
        if os.path.exists(potential):
            client_logo_path = potential

    # Computed metrics
    pillar_types = list(PILLAR_NAMES.keys())
    completed_pillars = sum(1 for pt in pillar_types if pt in pillars_data)
    completion_rate = int((completed_pillars / len(pillar_types)) * 100)

    tp_scores = [tp.get("nota", 0) for tp in touchpoints if tp.get("nota")]
    avg_tp = sum(tp_scores) / len(tp_scores) if tp_scores else 0

    bvs_score = bvs_list[0].get("bvs_score", bvs_list[0].get("score", 0)) if bvs_list else 0
    bvs_level = bvs_list[0].get("level", "") if bvs_list else ""
    bvs_components = bvs_list[0].get("components", {}) if bvs_list else {}

    brand_name = brand.get('name', 'Marca')
    report_title = request.report_title or "Relatório Executivo"
    prepared_name = request.prepared_by_name or user.get("name", "")
    prepared_email = request.prepared_by_email or user.get("email", "")

    st = _build_styles()

    # Build PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2.4*cm, bottomMargin=2*cm
    )

    story = []

    # ============ COVER PAGE ============
    cover_data = [
        [Spacer(1, 3.5*cm)],
        [Paragraph(report_title, st['cover_title'])],
        [Paragraph(f"<b>{brand_name}</b>", st['cover_title'])],
        [Spacer(1, 0.8*cm)],
        [Paragraph(f"Setor: {brand.get('industry', brand.get('sector', 'N/A'))}", st['cover_sub'])],
        [Paragraph(f"Completude: {completion_rate}%  |  BVS Score: {bvs_score}  |  Touchpoints: {len(touchpoints)}", st['cover_sub'])],
        [Spacer(1, 3*cm)],
    ]
    # Prepared by block
    if prepared_name:
        cover_data.append([Paragraph(f"Preparado por <b>{prepared_name}</b>", st['cover_sub'])])
    if prepared_email:
        cover_data.append([Paragraph(prepared_email, st['cover_sub'])])
    cover_data.append([Paragraph(_date_pt(), st['cover_sub'])])
    cover_data.append([Paragraph("Versão 1.0", st['cover_sub'])])

    cover_table = Table(cover_data, colWidths=[14*cm])
    cover_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(cover_table)
    story.append(PageBreak())

    # ============ TABLE OF CONTENTS ============
    story.append(Paragraph("ÍNDICE", st['section_num']))
    story.append(Paragraph("Conteúdo do Relatório", st['section_title']))
    story.append(HRFlowable(width="100%", thickness=1, color=client_primary, spaceAfter=10))

    sec_num = 1
    section_titles = {
        "summary": "Resumo Executivo",
        "pillars": "Pilares de Marca",
        "score": "BVS Score & Maturidade",
        "touchpoints": "Touchpoints",
        "recommendations": "Recomendações Estratégicas"
    }
    for sec_key in request.sections:
        if sec_key in section_titles:
            story.append(Paragraph(f"{sec_num}. {section_titles[sec_key]}", st['body']))
            story.append(Spacer(1, 0.15*cm))
            sec_num += 1

    story.append(PageBreak())

    # ============ SECTION: EXECUTIVE SUMMARY ============
    sec_idx = 1
    if "summary" in request.sections:
        story.append(Paragraph(f"SEÇÃO {sec_idx}", st['section_num']))
        story.append(Paragraph("Resumo Executivo", st['section_title']))
        story.append(HRFlowable(width="100%", thickness=1, color=client_primary, spaceAfter=10))

        # Key Metrics
        metrics = [
            [Paragraph(f"<b>{completion_rate}%</b>", st['metric_value']),
             Paragraph(f"<b>{bvs_score}</b>", st['metric_value']),
             Paragraph(f"<b>{len(touchpoints)}</b>", st['metric_value']),
             Paragraph(f"<b>{avg_tp:.1f}</b>", st['metric_value'])],
            [Paragraph("Completude", st['metric_label']),
             Paragraph("BVS Score", st['metric_label']),
             Paragraph("Touchpoints", st['metric_label']),
             Paragraph("Média TP", st['metric_label'])],
        ]
        m_table = Table(metrics, colWidths=[3.8*cm]*4)
        m_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (0, -1), 0.5, BORDER_COLOR),
            ('BOX', (1, 0), (1, -1), 0.5, BORDER_COLOR),
            ('BOX', (2, 0), (2, -1), 0.5, BORDER_COLOR),
            ('BOX', (3, 0), (3, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 12),
            ('BACKGROUND', (0, 0), (-1, -1), BRAND_LIGHT_BG),
        ]))
        story.append(m_table)
        story.append(Spacer(1, 0.6*cm))

        # Summary table
        summary_rows = [
            ["Pilares Preenchidos", f"{completed_pillars} de {len(pillar_types)}", "OK" if completed_pillars >= 5 else "Atenção"],
            ["Touchpoints Mapeados", str(len(touchpoints)), "OK" if len(touchpoints) >= 5 else "Atenção"],
            ["Score Médio TP", f"{avg_tp:.1f} / 10", "OK" if avg_tp >= 7 else "Atenção"],
            ["Maturidade", maturity.get("level", "Não avaliado") if maturity else "Não avaliado", "-"],
        ]
        story.append(_make_table(
            ["Métrica", "Valor", "Status"],
            summary_rows,
            [7*cm, 4.5*cm, 3.5*cm], st
        ))

        story.append(Spacer(1, 0.4*cm))
        story.append(Paragraph("<b>Progresso Geral</b>", st['body_bold']))
        story.append(Spacer(1, 0.15*cm))
        story.append(_score_bar(completion_rate))
        story.append(PageBreak())
        sec_idx += 1

    # ============ SECTION: PILLARS ============
    if "pillars" in request.sections:
        story.append(Paragraph(f"SEÇÃO {sec_idx}", st['section_num']))
        story.append(Paragraph("Pilares de Marca", st['section_title']))
        story.append(HRFlowable(width="100%", thickness=1, color=client_primary, spaceAfter=10))

        # Apply filter if provided
        filtered_pillar_types = pillar_types
        if request.pillars_filter:
            filtered_pillar_types = [pt for pt in pillar_types if pt in request.pillars_filter]

        # Status table
        pillar_rows = []
        for pt in filtered_pillar_types:
            has_data = pt in pillars_data
            status_para = Paragraph(
                f"<font color='{'#22c55e' if has_data else '#ef4444'}'><b>{'Completo' if has_data else 'Pendente'}</b></font>",
                st['cell_center']
            )
            pillar_rows.append([
                PILLAR_NAMES.get(pt, pt),
                status_para,
                "100%" if has_data else "0%"
            ])

        story.append(_make_table(
            ["Pilar", "Status", "Completude"],
            pillar_rows,
            [6.5*cm, 4.5*cm, 4*cm], st
        ))
        story.append(Spacer(1, 0.6*cm))

        # Pillar chart
        if request.include_charts:
            story.append(Paragraph("<b>Visão Geral dos Pilares</b>", st['body_bold']))
            story.append(Spacer(1, 0.2*cm))
            d = Drawing(430, 160)
            chart = VerticalBarChart()
            chart.x = 45
            chart.y = 25
            chart.height = 110
            chart.width = 360
            chart.data = [[100 if pt in pillars_data else 0 for pt in filtered_pillar_types]]
            chart.categoryAxis.categoryNames = [PILLAR_NAMES[pt][:10] for pt in filtered_pillar_types]
            chart.categoryAxis.labels.fontSize = 7
            chart.valueAxis.valueMin = 0
            chart.valueAxis.valueMax = 100
            chart.valueAxis.valueStep = 25
            chart.valueAxis.labels.fontSize = 7
            chart.bars[0].fillColor = client_primary
            chart.bars[0].strokeColor = None
            d.add(chart)
            story.append(d)
            story.append(Spacer(1, 0.4*cm))

        # Pillar details - data from each collection
        for pt in filtered_pillar_types:
            data = pillars_data.get(pt)
            if not data:
                continue

            story.append(Spacer(1, 0.3*cm))
            story.append(Paragraph(f"<b>{PILLAR_NAMES[pt]}</b>", st['body_bold']))
            story.append(Spacer(1, 0.1*cm))

            # Editorial quote for key pillar declarations
            editorial_fields = {
                "purpose": ["proposito", "missao"],
                "promise": ["promessa_principal", "promessa_emocional"],
                "positioning": ["declaracao_posicionamento"],
            }
            if pt in editorial_fields:
                for field in editorial_fields[pt]:
                    val = data.get(field)
                    if val and isinstance(val, str) and len(val) > 5:
                        story.append(Paragraph(f'"{val}"', st['editorial_quote']))
                        break

            detail_rows = []
            for field_key, field_val in data.items():
                if field_key in ("brand_id", "updated_at", "pillar_id", "created_at", "insights_ia"):
                    continue
                formatted = _format_value(field_val)
                if formatted != "-":
                    label = PILLAR_FIELD_LABELS.get(field_key, field_key.replace("_", " ").title())
                    detail_rows.append([label, formatted])

            if detail_rows:
                story.append(_make_table(
                    ["Campo", "Conteúdo"],
                    detail_rows,
                    [4.5*cm, 10.5*cm], st
                ))

        story.append(PageBreak())
        sec_idx += 1

    # ============ SECTION: BVS SCORE & MATURITY ============
    if "score" in request.sections:
        story.append(Paragraph(f"SEÇÃO {sec_idx}", st['section_num']))
        story.append(Paragraph("BVS Score & Maturidade", st['section_title']))
        story.append(HRFlowable(width="100%", thickness=1, color=client_primary, spaceAfter=10))

        story.append(Paragraph(f"<b>BVS Score Atual: {bvs_score}</b>", st['body_bold']))
        if bvs_level:
            story.append(Paragraph(f"Nível: {bvs_level}", st['body']))
        story.append(Spacer(1, 0.2*cm))
        story.append(_score_bar(min(int(bvs_score), 100)))
        story.append(Spacer(1, 0.4*cm))

        if bvs_score >= 70:
            txt = "Excelente! Sua marca está bem posicionada e demonstra forte equity."
        elif bvs_score >= 40:
            txt = "Boa base, mas há oportunidades significativas de melhoria."
        elif bvs_score > 0:
            txt = "Atenção: O score indica necessidade urgente de desenvolvimento estratégico."
        else:
            txt = "BVS Score não calculado. Complete os pilares para gerar a avaliação."
        story.append(Paragraph(txt, st['body']))
        story.append(Spacer(1, 0.4*cm))

        # BVS Components
        if bvs_components:
            comp_rows = []
            for comp_key, comp_val in bvs_components.items():
                if isinstance(comp_val, (int, float)):
                    comp_rows.append([comp_key.replace("_", " ").title(), str(comp_val)])
                elif isinstance(comp_val, dict):
                    score_v = comp_val.get("score", comp_val.get("value", "-"))
                    comp_rows.append([comp_key.replace("_", " ").title(), str(score_v)])
            if comp_rows:
                story.append(Paragraph("<b>Componentes do BVS</b>", st['body_bold']))
                story.append(Spacer(1, 0.1*cm))
                story.append(_make_table(
                    ["Componente", "Score"],
                    comp_rows,
                    [8*cm, 7*cm], st
                ))
                story.append(Spacer(1, 0.3*cm))

        # Maturity
        if maturity:
            story.append(Paragraph("<b>Diagnóstico de Maturidade</b>", st['body_bold']))
            story.append(Spacer(1, 0.1*cm))
            mat_rows = [["Nível Geral", maturity.get("level", "N/A")]]
            for k, v in maturity.items():
                if k not in ("brand_id", "user_id", "created_at", "updated_at", "level") and isinstance(v, (str, int, float)):
                    mat_rows.append([k.replace("_", " ").title(), str(v)])
            story.append(_make_table(["Dimensão", "Valor"], mat_rows, [7.5*cm, 7.5*cm], st))

        # Brand tracking
        if tracking:
            story.append(Spacer(1, 0.4*cm))
            story.append(Paragraph("<b>Evolução Recente</b>", st['body_bold']))
            story.append(Spacer(1, 0.1*cm))
            track_rows = []
            for t in tracking[:5]:
                dt = t.get("created_at", "")[:10] if t.get("created_at") else "-"
                track_rows.append([dt, t.get("event_type", t.get("type", "Registro")), str(t.get("score", "-"))])
            story.append(_make_table(["Data", "Evento", "Score"], track_rows, [4*cm, 7*cm, 4*cm], st))

        # Culture
        if culture:
            story.append(Spacer(1, 0.4*cm))
            story.append(Paragraph("<b>Cultura de Marca</b>", st['body_bold']))
            story.append(Spacer(1, 0.1*cm))
            cult_section = culture.get("section", "")
            cult_data = culture.get("data", {})
            if isinstance(cult_data, dict):
                cult_rows = []
                for ck, cv in cult_data.items():
                    formatted = _format_value(cv)
                    if formatted != "-":
                        cult_rows.append([ck.replace("_", " ").title(), formatted])
                if cult_rows:
                    story.append(_make_table(["Dimensão", "Descrição"], cult_rows, [5*cm, 10*cm], st))

        story.append(PageBreak())
        sec_idx += 1

    # ============ SECTION: TOUCHPOINTS ============
    if "touchpoints" in request.sections and touchpoints:
        story.append(Paragraph(f"SEÇÃO {sec_idx}", st['section_num']))
        story.append(Paragraph("Touchpoints da Marca", st['section_title']))
        story.append(HRFlowable(width="100%", thickness=1, color=client_primary, spaceAfter=10))

        story.append(Paragraph(
            f"Total de <b>{len(touchpoints)}</b> touchpoints mapeados com score médio de <b>{avg_tp:.1f}/10</b>.",
            st['body']
        ))
        story.append(Spacer(1, 0.3*cm))

        tp_rows = []
        for tp in sorted(touchpoints, key=lambda x: x.get("nota", 0), reverse=True)[:15]:
            nota = tp.get("nota", 0)
            status = "Excelente" if nota >= 8 else ("Bom" if nota >= 6 else ("Atenção" if nota >= 4 else "Crítico"))
            color = '#22c55e' if nota >= 8 else ('#3b82f6' if nota >= 6 else ('#f59e0b' if nota >= 4 else '#ef4444'))
            status_para = Paragraph(f"<font color='{color}'><b>{status}</b></font>", st['cell_center'])
            tp_rows.append([
                (tp.get("name", tp.get("titulo", "N/A")))[:35],
                tp.get("type", tp.get("tipo", "N/A")),
                f"{nota}/10",
                status_para
            ])

        if tp_rows:
            story.append(_make_table(
                ["Touchpoint", "Tipo", "Nota", "Status"],
                tp_rows,
                [5.5*cm, 4*cm, 2.5*cm, 3*cm], st
            ))

        story.append(PageBreak())
        sec_idx += 1

    # ============ SECTION: RECOMMENDATIONS ============
    if "recommendations" in request.sections:
        story.append(Paragraph(f"SEÇÃO {sec_idx}", st['section_num']))
        story.append(Paragraph("Recomendações Estratégicas", st['section_title']))
        story.append(HRFlowable(width="100%", thickness=1, color=client_primary, spaceAfter=10))

        recs = []

        if completion_rate < 100:
            pending = [PILLAR_NAMES[pt] for pt in pillar_types if pt not in pillars_data]
            names = ", ".join(pending[:3])
            if len(pending) > 3:
                names += f" (+{len(pending)-3})"
            recs.append(["Alta", f"Complete os pilares pendentes: {names}", "Solidez estratégica e BVS Score"])

        if len(touchpoints) < 5:
            recs.append(["Alta", "Mapeie mais touchpoints (mínimo: 5)", "Visão completa da experiência"])

        if avg_tp > 0 and avg_tp < 7:
            low = [tp.get("name", "?") for tp in touchpoints if tp.get("nota", 10) < 6][:2]
            extra = f": {', '.join(low)}" if low else ""
            recs.append(["Média", f"Melhore touchpoints com score baixo{extra}", "Consistência de marca"])

        if not maturity:
            recs.append(["Média", "Realize o diagnóstico de maturidade", "Identifica gaps de capacidade"])

        if bvs_score > 0 and bvs_score < 50:
            recs.append(["Alta", "BVS Score abaixo de 50 — foque nos pilares fundamentais", "Equity da marca"])

        if not recs:
            recs.append(["-", "Parabéns! Marca bem estruturada. Continue monitorando.", "Manutenção da excelência"])

        rec_rows = []
        for r in recs:
            color = '#ef4444' if r[0] == 'Alta' else ('#f59e0b' if r[0] == 'Média' else '#22c55e')
            pri_para = Paragraph(f"<font color='{color}'><b>{r[0]}</b></font>", st['cell_center'])
            rec_rows.append([pri_para, r[1], r[2]])

        story.append(_make_table(
            ["Prioridade", "Recomendação", "Impacto Esperado"],
            rec_rows,
            [2.5*cm, 8*cm, 4.5*cm], st
        ))

        story.append(Spacer(1, 1*cm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceAfter=10))
        story.append(Paragraph(
            "<i>Relatório gerado automaticamente pelo LaBrand · Brand OS. "
            "Para dúvidas ou suporte, entre em contato com a equipe de gestão.</i>",
            st['body']
        ))

    # ============ CONTRACAPA ============
    story.append(PageBreak())
    # Contracapa content will be rendered as last page via onLastPage-like approach
    # Add spacer then final content
    story.append(Spacer(1, 2*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=client_primary, spaceAfter=20))
    if prepared_name:
        story.append(Paragraph(f"<b>Preparado por</b>", st['body_bold']))
        story.append(Spacer(1, 0.2*cm))
        story.append(Paragraph(f"<b>{prepared_name}</b>", st['body_bold']))
        if prepared_email:
            story.append(Paragraph(prepared_email, st['body']))
        story.append(Paragraph(_date_pt(), st['body']))
        story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceAfter=10))
    story.append(Paragraph(
        f"<i>Este documento é confidencial e foi preparado exclusivamente para {brand_name}.</i>",
        st['body']
    ))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(
        "<i>powered by LaBrand · Brand OS</i>",
        st['body']
    ))

    # ============ BUILD ============
    def first_page(canvas, doc):
        canvas.saveState()
        # Dark background with client color
        canvas.setFillColor(client_cover_bg)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        # Accent bar at top
        canvas.setFillColor(client_accent)
        canvas.rect(0, PAGE_H - 0.8*cm, PAGE_W, 0.8*cm, fill=1, stroke=0)
        # Client logo at top-center (or brand name in large font)
        if client_logo_path and os.path.exists(client_logo_path):
            try:
                canvas.drawImage(client_logo_path, PAGE_W / 2 - 2*cm, PAGE_H - 3.5*cm,
                                 width=4*cm, height=1.5*cm, preserveAspectRatio=True, mask='auto')
            except Exception:
                canvas.setFont("Helvetica-Bold", 40)
                canvas.setFillColor(WHITE)
                canvas.drawCentredString(PAGE_W / 2, PAGE_H - 3*cm, brand_name)
        else:
            canvas.setFont("Helvetica-Bold", 40)
            canvas.setFillColor(WHITE)
            canvas.drawCentredString(PAGE_W / 2, PAGE_H - 3*cm, brand_name)
        # "powered by LaBrand" at bottom
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#71717a"))
        canvas.drawCentredString(PAGE_W / 2, 1.2*cm, "powered by LaBrand · Brand OS")
        canvas.restoreState()

    def later_pages(canvas, doc):
        _header_footer(canvas, doc, brand_name, client_logo_path, client_primary)

    doc.build(story, onFirstPage=first_page, onLaterPages=later_pages)

    # Save report record
    report_id = f"rep_{uuid.uuid4().hex[:12]}"
    await db.executive_reports.insert_one({
        "report_id": report_id,
        "brand_id": brand_id,
        "brand_name": brand_name,
        "report_title": report_title,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sections_included": request.sections,
        "pillars_filter": request.pillars_filter,
        "period_from": request.date_from,
        "period_to": request.date_to,
        "generated_by": user["user_id"],
        "completion_rate": completion_rate,
        "bvs_score": bvs_score,
        "pillars_completed": completed_pillars,
        "touchpoints_count": len(touchpoints)
    })

    buffer.seek(0)
    safe_name = brand_name.lower().replace(' ', '_').replace('/', '_')
    filename = f"labrand_{safe_name}_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/brands/{brand_id}/reports/history")
async def get_report_history(brand_id: str, user: dict = Depends(get_current_user)):
    reports = await db.executive_reports.find(
        {"brand_id": brand_id}, {"_id": 0}
    ).sort("generated_at", -1).to_list(50)
    return {"reports": reports, "total": len(reports)}


@router.get("/brands/{brand_id}/reports/{report_id}/download")
async def download_report(brand_id: str, report_id: str, user: dict = Depends(get_current_user)):
    report = await db.executive_reports.find_one({"report_id": report_id, "brand_id": brand_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Relatório não encontrado")
    req = PDFReportRequest(
        sections=report.get("sections_included", ["summary", "pillars", "recommendations"]),
        report_title=report.get("report_title", "Relatório Executivo")
    )
    return await generate_executive_pdf(brand_id, req, user)


# ═══════════════════════════════════════════════════════════════════════
# VALUATION PITCH DECK — Landscape A4, slide-style
# ═══════════════════════════════════════════════════════════════════════

class ValuationDeckRequest(BaseModel):
    prepared_by_name: str
    prepared_by_email: str
    version: str = "1.0"


DECK_W, DECK_H = landscape(A4)


def _fmt_brl(value: float) -> str:
    """Format value as R$ with appropriate suffix"""
    if value >= 1_000_000_000:
        return f"R$ {value / 1_000_000_000:.1f}B"
    if value >= 1_000_000:
        return f"R$ {value / 1_000_000:.1f}M"
    if value >= 1_000:
        return f"R$ {value / 1_000:.0f}K"
    return f"R$ {value:,.0f}"


def _deck_slide_bg(canvas, color):
    """Draw full-page background color"""
    canvas.setFillColor(color)
    canvas.rect(0, 0, DECK_W, DECK_H, fill=True, stroke=False)


def _deck_draw_logo(canvas, brand, brand_logo_path):
    """Draw brand logo or name at top center"""
    if brand_logo_path and os.path.exists(brand_logo_path):
        try:
            canvas.drawImage(brand_logo_path, DECK_W / 2 - 2 * cm, DECK_H - 3.5 * cm,
                             width=4 * cm, height=2 * cm, preserveAspectRatio=True, mask='auto')
        except Exception:
            canvas.setFont("Helvetica-Bold", 20)
            canvas.setFillColor(WHITE)
            canvas.drawCentredString(DECK_W / 2, DECK_H - 3 * cm, brand.get("name", ""))
    else:
        canvas.setFont("Helvetica-Bold", 20)
        canvas.setFillColor(WHITE)
        canvas.drawCentredString(DECK_W / 2, DECK_H - 3 * cm, brand.get("name", ""))


@router.post("/brands/{brand_id}/reports/valuation-deck")
async def generate_valuation_deck(brand_id: str, request: ValuationDeckRequest, user: dict = Depends(get_current_user)):
    """Generate Landscape Pitch Deck PDF for Brand Valuation"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")

    # Fetch latest valuation
    valuation = await db.brand_valuations.find_one(
        {"brand_id": brand_id}, {"_id": 0},
        sort=[("created_at", -1)]
    )
    if not valuation:
        raise HTTPException(status_code=400, detail="Complete a avaliação de marca antes de gerar o pitch deck")

    # Fetch white-label
    wl = await db.white_label.find_one({"brand_id": brand_id}, {"_id": 0})
    primary_color = BRAND_DARK
    if wl and wl.get("enabled") and wl.get("primary_color"):
        try:
            primary_color = colors.HexColor(wl["primary_color"])
        except Exception:
            pass

    # Fetch brand logo path
    brand_logo_path = None
    if brand.get("logo_url"):
        potential_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), brand["logo_url"].lstrip("/"))
        if os.path.exists(potential_path):
            brand_logo_path = potential_path

    # Fetch pillar data for purpose and scores
    pillars_data = await _fetch_all_pillar_data(brand_id)
    purpose_text = ""
    if "purpose" in pillars_data:
        purpose_text = pillars_data["purpose"].get("proposito", "") or pillars_data["purpose"].get("missao", "")

    # Pillar scores for brand strength drivers
    pillar_scores = {}
    bs_fields = ["clareza", "comprom", "governa", "respons", "autent", "relev", "diferenc", "consist", "presenca", "engaj"]
    for field in bs_fields:
        pillar_scores[field] = valuation.get(f"bs_{field}", 50)

    # Disaster check / risks
    disaster = await db.disaster_check.find_one({"brand_id": brand_id}, {"_id": 0})

    brand_name = brand.get("name", "Marca")
    now = datetime.now(timezone.utc)

    # ── BUILD PDF ──
    buffer = BytesIO()

    from reportlab.lib.pagesizes import landscape as ls_fn
    from reportlab.pdfgen import canvas as pdf_canvas

    c = pdf_canvas.Canvas(buffer, pagesize=landscape(A4))
    c.setTitle(f"Pitch Deck Valuation - {brand_name}")

    # ════════ SLIDE 1 — CAPA ════════
    _deck_slide_bg(c, primary_color)
    _deck_draw_logo(c, brand, brand_logo_path)

    c.setFont("Times-Bold", 48)
    c.setFillColor(WHITE)
    c.drawCentredString(DECK_W / 2, DECK_H / 2 + 0.5 * cm, "Avaliação de Marca")

    c.setFont("Times-Italic", 24)
    c.drawCentredString(DECK_W / 2, DECK_H / 2 - 1.5 * cm, brand_name)

    c.setFont("Helvetica", 11)
    c.setFillColor(colors.HexColor("#d4d4d8"))
    footer_y = 2 * cm
    c.drawCentredString(DECK_W / 2, footer_y + 0.5 * cm,
                        f"{_date_pt(now)}  •  Versão {request.version}")
    c.setFont("Helvetica", 8)
    c.drawCentredString(DECK_W / 2, footer_y - 0.3 * cm, "powered by LaBrand")
    c.showPage()

    # ════════ SLIDE 2 — SUMÁRIO EXECUTIVO ════════
    c.setFillColor(WHITE)
    c.rect(0, 0, DECK_W, DECK_H, fill=True, stroke=False)

    c.setFont("Times-Bold", 36)
    c.setFillColor(BRAND_DARK)
    c.drawString(3 * cm, DECK_H - 3 * cm, "Resumo")

    # 3 big numbers
    col_w = (DECK_W - 6 * cm) / 3
    metrics_data = [
        (_fmt_brl(valuation.get("brand_mid", 0)), "Brand Value"),
        (str(valuation.get("bs_score", 0)), "Força da Marca / 100"),
        (f"{valuation.get('rbi_score', 0)}%", "% atribuído à marca"),
    ]
    y_metric = DECK_H / 2 + 1 * cm
    for i, (value, label) in enumerate(metrics_data):
        x = 3 * cm + i * col_w + col_w / 2
        c.setFont("Helvetica-Bold", 60)
        c.setFillColor(primary_color)
        c.drawCentredString(x, y_metric, value)
        c.setFont("Helvetica", 13)
        c.setFillColor(BRAND_GRAY)
        c.drawCentredString(x, y_metric - 1.2 * cm, label)

    # Decorative line
    c.setStrokeColor(colors.HexColor("#e5e7eb"))
    c.setLineWidth(1)
    c.line(3 * cm, DECK_H / 2 - 1.5 * cm, DECK_W - 3 * cm, DECK_H / 2 - 1.5 * cm)

    # Purpose quote
    if purpose_text:
        c.setFont("Times-Italic", 18)
        c.setFillColor(BRAND_GRAY)
        # Truncate if too long
        display_purpose = purpose_text[:120] + ("..." if len(purpose_text) > 120 else "")
        c.drawCentredString(DECK_W / 2, 3.5 * cm, f'"{display_purpose}"')

    c.showPage()

    # ════════ SLIDE 3 — METODOLOGIA ════════
    c.setFillColor(WHITE)
    c.rect(0, 0, DECK_W, DECK_H, fill=True, stroke=False)

    c.setFont("Times-Bold", 36)
    c.setFillColor(BRAND_DARK)
    c.drawString(3 * cm, DECK_H - 3 * cm, "Como chegamos a esse número")

    # 4 quadrants (2x2)
    quadrants = [
        ("1. Análise Financeira", f"Receita: {_fmt_brl(valuation.get('receita', 0))}",
         f"EBITDA: {_fmt_brl(valuation.get('ebitda', 0))} • Múltiplo: {valuation.get('multiplo_final', 0)}x"),
        ("2. RBI — Role of Brand", f"Score: {valuation.get('rbi_score', 0)}/100",
         "% do valor do negócio atribuído à marca"),
        ("3. Brand Strength", f"Score: {valuation.get('bs_score', 0)}/100",
         "Consolidação de 10 fatores Interbrand"),
        ("4. Resultado", _fmt_brl(valuation.get("brand_mid", 0)),
         f"{valuation.get('brand_share_pct', 0)}% do Enterprise Value"),
    ]

    q_w = (DECK_W - 7 * cm) / 2
    q_h = (DECK_H - 7 * cm) / 2
    start_x = 3 * cm
    start_y = DECK_H - 5 * cm

    for i, (title, metric, desc) in enumerate(quadrants):
        col = i % 2
        row = i // 2
        qx = start_x + col * (q_w + 1 * cm)
        qy = start_y - row * (q_h + 0.5 * cm)

        # Border
        c.setStrokeColor(colors.HexColor("#d1d5db"))
        c.setLineWidth(0.5)
        c.roundRect(qx, qy - q_h, q_w, q_h, 6, fill=False, stroke=True)

        # Title
        c.setFont("Helvetica-Bold", 14)
        c.setFillColor(BRAND_DARK)
        c.drawString(qx + 0.8 * cm, qy - 1.2 * cm, title)

        # Metric
        c.setFont("Helvetica-Bold", 22)
        c.setFillColor(primary_color)
        c.drawString(qx + 0.8 * cm, qy - 2.5 * cm, metric)

        # Desc
        c.setFont("Helvetica", 10)
        c.setFillColor(BRAND_GRAY)
        c.drawString(qx + 0.8 * cm, qy - 3.5 * cm, desc[:55])

    c.showPage()

    # ════════ SLIDE 4 — DRIVERS DE VALOR ════════
    c.setFillColor(WHITE)
    c.rect(0, 0, DECK_W, DECK_H, fill=True, stroke=False)

    c.setFont("Times-Bold", 36)
    c.setFillColor(BRAND_DARK)
    c.drawString(3 * cm, DECK_H - 3 * cm, "O que constrói o valor")

    # Horizontal bar chart for BS factors
    bs_labels_map = {
        "clareza": "Clareza", "comprom": "Compromisso", "governa": "Governança",
        "respons": "Responsividade", "autent": "Autenticidade", "relev": "Relevância",
        "diferenc": "Diferenciação", "consist": "Consistência", "presenca": "Presença",
        "engaj": "Engajamento"
    }
    sorted_factors = sorted(pillar_scores.items(), key=lambda x: x[1], reverse=True)

    bar_start_y = DECK_H - 4.5 * cm
    bar_max_w = 12 * cm
    bar_h = 0.7 * cm
    gap = 0.35 * cm

    for i, (key, score) in enumerate(sorted_factors):
        y = bar_start_y - i * (bar_h + gap)
        if y < 2 * cm:
            break
        # Label
        c.setFont("Helvetica", 10)
        c.setFillColor(BRAND_DARK)
        c.drawRightString(6 * cm, y + 0.15 * cm, bs_labels_map.get(key, key))
        # Bar background
        c.setFillColor(colors.HexColor("#f3f4f6"))
        c.rect(6.5 * cm, y, bar_max_w, bar_h, fill=True, stroke=False)
        # Bar fill
        fill_w = bar_max_w * score / 100
        c.setFillColor(primary_color)
        c.rect(6.5 * cm, y, fill_w, bar_h, fill=True, stroke=False)
        # Score value
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(BRAND_DARK)
        c.drawString(6.5 * cm + fill_w + 0.3 * cm, y + 0.15 * cm, str(score))

    # Top 3 strengths on right side
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(BRAND_DARK)
    c.drawString(DECK_W - 8 * cm, DECK_H - 4.5 * cm, "Pontos Fortes")
    c.setFont("Helvetica", 10)
    c.setFillColor(BRAND_GRAY)
    for i, (key, score) in enumerate(sorted_factors[:3]):
        c.drawString(DECK_W - 8 * cm, DECK_H - 5.5 * cm - i * 1.2 * cm,
                     f"• {bs_labels_map.get(key, key)} ({score}/100)")

    c.showPage()

    # ════════ SLIDE 5 — RISCOS E ATENÇÃO ════════
    c.setFillColor(WHITE)
    c.rect(0, 0, DECK_W, DECK_H, fill=True, stroke=False)

    c.setFont("Times-Bold", 36)
    c.setFillColor(BRAND_DARK)
    c.drawString(3 * cm, DECK_H - 3 * cm, "Onde precisamos cuidar")

    # Find weakest 3 BS factors as risks
    weakest = sorted_factors[-3:] if len(sorted_factors) >= 3 else sorted_factors

    has_risk_data = disaster and disaster.get("risks")
    if has_risk_data:
        risks = disaster["risks"][:3]
    else:
        # Generate risk cards from weakest factors
        risks = [
            {"category": bs_labels_map.get(k, k), "severity": "Atenção" if v >= 30 else "Crítico",
             "mitigation": f"Fortalecer {bs_labels_map.get(k, k).lower()} para elevar Brand Strength"}
            for k, v in weakest
        ]

    if not risks:
        c.setFont("Helvetica", 16)
        c.setFillColor(BRAND_GRAY)
        c.drawCentredString(DECK_W / 2, DECK_H / 2,
                            "Análise de riscos pendente — recomendamos completar o módulo Disaster Check")
    else:
        card_w = (DECK_W - 8 * cm) / 3
        for i, risk in enumerate(risks):
            rx = 3 * cm + i * (card_w + 1 * cm)
            ry = DECK_H / 2 + 1 * cm

            # Card border
            c.setStrokeColor(colors.HexColor("#fecaca") if risk.get("severity") == "Crítico" else colors.HexColor("#fed7aa"))
            c.setLineWidth(1)
            c.roundRect(rx, ry - 4 * cm, card_w, 4 * cm, 6, fill=False, stroke=True)

            # Category
            c.setFont("Helvetica-Bold", 13)
            c.setFillColor(BRAND_DARK)
            c.drawString(rx + 0.6 * cm, ry - 1 * cm, str(risk.get("category", ""))[:25])

            # Severity badge
            sev = risk.get("severity", "Atenção")
            badge_color = BRAND_RED if sev == "Crítico" else BRAND_YELLOW
            c.setFillColor(badge_color)
            c.roundRect(rx + 0.6 * cm, ry - 1.8 * cm, 3 * cm, 0.6 * cm, 3, fill=True, stroke=False)
            c.setFont("Helvetica-Bold", 8)
            c.setFillColor(WHITE)
            c.drawString(rx + 0.9 * cm, ry - 1.65 * cm, sev)

            # Mitigation
            c.setFont("Helvetica", 9)
            c.setFillColor(BRAND_GRAY)
            mit = str(risk.get("mitigation", risk.get("acao_sugerida", "")))[:60]
            c.drawString(rx + 0.6 * cm, ry - 2.8 * cm, mit[:35])
            if len(mit) > 35:
                c.drawString(rx + 0.6 * cm, ry - 3.2 * cm, mit[35:])

    c.showPage()

    # ════════ SLIDE 6 — PROJEÇÃO ════════
    c.setFillColor(WHITE)
    c.rect(0, 0, DECK_W, DECK_H, fill=True, stroke=False)

    c.setFont("Times-Bold", 36)
    c.setFillColor(BRAND_DARK)
    c.drawString(3 * cm, DECK_H - 3 * cm, "Cenários")

    brand_mid = valuation.get("brand_mid", 0)
    scenarios = [
        ("Conservador", brand_mid * 0.85, colors.HexColor("#6b7280")),
        ("Base", brand_mid, primary_color),
        ("Otimista", brand_mid * 1.15, BRAND_GREEN),
    ]
    scenario_w = (DECK_W - 8 * cm) / 3
    for i, (label, val, clr) in enumerate(scenarios):
        sx = 3 * cm + i * (scenario_w + 1 * cm)
        sy = DECK_H / 2

        c.setFont("Helvetica-Bold", 16)
        c.setFillColor(BRAND_DARK)
        c.drawCentredString(sx + scenario_w / 2, sy + 2 * cm, label)

        c.setFont("Helvetica-Bold", 40)
        c.setFillColor(clr)
        c.drawCentredString(sx + scenario_w / 2, sy - 0.5 * cm, _fmt_brl(val))

        c.setFont("Helvetica", 11)
        c.setFillColor(BRAND_GRAY)
        c.drawCentredString(sx + scenario_w / 2, sy - 1.8 * cm, "projeção 3 anos")

    c.showPage()

    # ════════ SLIDE 7 — RECOMENDAÇÕES ════════
    c.setFillColor(WHITE)
    c.rect(0, 0, DECK_W, DECK_H, fill=True, stroke=False)

    c.setFont("Times-Bold", 36)
    c.setFillColor(BRAND_DARK)
    c.drawString(3 * cm, DECK_H - 3 * cm, "Próximos passos")

    # Generate recommendations from weakest factors
    recommendations = []
    for key, score in sorted_factors[-5:]:
        label = bs_labels_map.get(key, key)
        recommendations.append((label, f"Investir em {label.lower()} para elevar de {score} para {min(100, score + 20)}"))

    rec_y = DECK_H - 5 * cm
    for i, (title, desc) in enumerate(recommendations[:5]):
        if rec_y < 2 * cm:
            break
        # Number circle
        cx = 4 * cm
        c.setFillColor(primary_color)
        c.circle(cx, rec_y + 0.2 * cm, 0.5 * cm, fill=True, stroke=False)
        c.setFont("Helvetica-Bold", 14)
        c.setFillColor(WHITE)
        c.drawCentredString(cx, rec_y - 0.05 * cm, str(i + 1))

        # Title
        c.setFont("Helvetica-Bold", 14)
        c.setFillColor(BRAND_DARK)
        c.drawString(5.5 * cm, rec_y + 0.1 * cm, title)

        # Description
        c.setFont("Helvetica", 11)
        c.setFillColor(BRAND_GRAY)
        c.drawString(5.5 * cm, rec_y - 0.7 * cm, desc[:80])

        rec_y -= 2.2 * cm

    c.showPage()

    # ════════ SLIDE 8 — CONTRACAPA ════════
    _deck_slide_bg(c, primary_color)

    c.setFont("Helvetica", 14)
    c.setFillColor(colors.HexColor("#a1a1aa"))
    c.drawCentredString(DECK_W / 2, DECK_H / 2 + 3 * cm, "Preparado por")

    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(WHITE)
    c.drawCentredString(DECK_W / 2, DECK_H / 2 + 1.5 * cm, request.prepared_by_name)

    c.setFont("Helvetica", 14)
    c.setFillColor(colors.HexColor("#d4d4d8"))
    c.drawCentredString(DECK_W / 2, DECK_H / 2 + 0.3 * cm, request.prepared_by_email)

    c.setFont("Helvetica", 12)
    c.drawCentredString(DECK_W / 2, DECK_H / 2 - 1 * cm, f"{_date_pt(now)}  •  Versão {request.version}")

    c.setFont("Helvetica-Oblique", 10)
    c.setFillColor(colors.HexColor("#a1a1aa"))
    c.drawCentredString(DECK_W / 2, 3.5 * cm,
                        f"Documento confidencial — uso restrito a {brand_name}")

    # LaBrand logo footer
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#71717a"))
    c.drawCentredString(DECK_W / 2, 2 * cm, "powered by LaBrand · Brand OS")

    c.showPage()
    c.save()

    # Persist to reports collection
    report_id = f"rpt_{uuid.uuid4().hex[:12]}"
    await db.executive_reports.insert_one({
        "report_id": report_id,
        "brand_id": brand_id,
        "type": "valuation_deck",
        "report_title": f"Pitch Deck Valuation - {brand_name}",
        "generated_by": user["user_id"],
        "generated_by_name": request.prepared_by_name,
        "generated_at": now.isoformat(),
        "version": request.version,
    })

    buffer.seek(0)
    date_str = now.strftime("%Y%m%d")
    filename = f"PitchDeck_{brand_name.replace(' ', '_')}_{date_str}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
