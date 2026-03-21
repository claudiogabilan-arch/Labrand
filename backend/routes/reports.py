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
from reportlab.lib.pagesizes import A4
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
        fontSize=28, leading=34, spaceAfter=8,
        textColor=WHITE, fontName='Helvetica-Bold', alignment=TA_LEFT
    )
    s['cover_sub'] = ParagraphStyle(
        'CoverSub', parent=styles['Normal'],
        fontSize=13, leading=18, textColor=colors.HexColor("#d4d4d8"),
        fontName='Helvetica'
    )
    s['section_title'] = ParagraphStyle(
        'SectionTitle', parent=styles['Heading2'],
        fontSize=16, leading=20, spaceBefore=16, spaceAfter=10,
        textColor=BRAND_DARK, fontName='Helvetica-Bold'
    )
    s['section_num'] = ParagraphStyle(
        'SectionNum', parent=styles['Normal'],
        fontSize=10, textColor=BRAND_PRIMARY, fontName='Helvetica-Bold',
        spaceBefore=14, spaceAfter=2
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


def _header_footer(canvas, doc, brand_name: str):
    """Interior pages: black logo top-left, brand name + date top-right"""
    canvas.saveState()

    # Top: Black logo
    if os.path.exists(LOGO_BLACK):
        canvas.drawImage(LOGO_BLACK, 2*cm, PAGE_H - 1.6*cm, width=2.2*cm, height=0.7*cm,
                         preserveAspectRatio=True, mask='auto')

    # Top-right: Brand name + date
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(BRAND_GRAY)
    canvas.drawRightString(PAGE_W - 2*cm, PAGE_H - 1.2*cm, f"{brand_name}  |  {_date_short_pt()}")

    # Top line
    canvas.setStrokeColor(BRAND_PRIMARY)
    canvas.setLineWidth(1.5)
    canvas.line(2*cm, PAGE_H - 1.8*cm, PAGE_W - 2*cm, PAGE_H - 1.8*cm)

    # Footer
    canvas.setFont("Helvetica", 6.5)
    canvas.setFillColor(BRAND_LIGHT_GRAY)
    canvas.drawCentredString(PAGE_W / 2, 1.2*cm, f"Página {doc.page}  —  Relatório gerado por LaBrand · Brand OS")

    canvas.setStrokeColor(colors.HexColor("#e0e0e0"))
    canvas.setLineWidth(0.5)
    canvas.line(2*cm, 1.5*cm, PAGE_W - 2*cm, 1.5*cm)
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
    """Generate enhanced executive PDF report"""
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
        [Spacer(1, 4*cm)],
        [Paragraph(report_title, st['cover_title'])],
        [Paragraph(f"<b>{brand_name}</b>", st['cover_title'])],
        [Spacer(1, 0.8*cm)],
        [Paragraph(f"Setor: {brand.get('industry', brand.get('sector', 'N/A'))}", st['cover_sub'])],
        [Paragraph(f"Gerado em: {_date_pt()}", st['cover_sub'])],
        [Spacer(1, 0.4*cm)],
        [Paragraph(f"Completude: {completion_rate}%  |  BVS Score: {bvs_score}  |  Touchpoints: {len(touchpoints)}", st['cover_sub'])],
    ]
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
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_PRIMARY, spaceAfter=10))

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
        story.append(HRFlowable(width="100%", thickness=1, color=BRAND_PRIMARY, spaceAfter=10))

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
        story.append(HRFlowable(width="100%", thickness=1, color=BRAND_PRIMARY, spaceAfter=10))

        # Status table
        pillar_rows = []
        for pt in pillar_types:
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
            chart.data = [[100 if pt in pillars_data else 0 for pt in pillar_types]]
            chart.categoryAxis.categoryNames = [PILLAR_NAMES[pt][:10] for pt in pillar_types]
            chart.categoryAxis.labels.fontSize = 7
            chart.valueAxis.valueMin = 0
            chart.valueAxis.valueMax = 100
            chart.valueAxis.valueStep = 25
            chart.valueAxis.labels.fontSize = 7
            chart.bars[0].fillColor = BRAND_PRIMARY
            chart.bars[0].strokeColor = None
            d.add(chart)
            story.append(d)
            story.append(Spacer(1, 0.4*cm))

        # Pillar details - data from each collection
        for pt in pillar_types:
            data = pillars_data.get(pt)
            if not data:
                continue

            story.append(Spacer(1, 0.3*cm))
            story.append(Paragraph(f"<b>{PILLAR_NAMES[pt]}</b>", st['body_bold']))
            story.append(Spacer(1, 0.1*cm))

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
        story.append(HRFlowable(width="100%", thickness=1, color=BRAND_PRIMARY, spaceAfter=10))

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
        story.append(HRFlowable(width="100%", thickness=1, color=BRAND_PRIMARY, spaceAfter=10))

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
        story.append(HRFlowable(width="100%", thickness=1, color=BRAND_PRIMARY, spaceAfter=10))

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

    # ============ BUILD ============
    def first_page(canvas, doc):
        canvas.saveState()
        # Dark background
        canvas.setFillColor(BRAND_DARK)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        # Accent bar
        canvas.setFillColor(BRAND_PRIMARY)
        canvas.rect(0, PAGE_H - 0.8*cm, PAGE_W, 0.8*cm, fill=1, stroke=0)
        # White logo at bottom
        if os.path.exists(LOGO_WHITE):
            canvas.drawImage(LOGO_WHITE, 2*cm, 2*cm, width=3*cm, height=1*cm,
                             preserveAspectRatio=True, mask='auto')
        # Footer text
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(BRAND_LIGHT_GRAY)
        canvas.drawString(2*cm, 1.2*cm, "LaBrand · Brand OS  —  " + report_title)
        canvas.restoreState()

    def later_pages(canvas, doc):
        _header_footer(canvas, doc, brand_name)

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
