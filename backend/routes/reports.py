"""PDF Report Generation Module - Enhanced"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from io import BytesIO
import uuid

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.graphics.shapes import Drawing, Rect, String, Circle, Line
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Reports"])

# Brand colors
BRAND_DARK = colors.HexColor("#1a1a2e")
BRAND_PRIMARY = colors.HexColor("#e67e22")
BRAND_ACCENT = colors.HexColor("#f39c12")
BRAND_LIGHT_BG = colors.HexColor("#faf9f7")
BRAND_GRAY = colors.HexColor("#6b7280")
BRAND_GREEN = colors.HexColor("#22c55e")
BRAND_YELLOW = colors.HexColor("#f59e0b")
BRAND_RED = colors.HexColor("#ef4444")
BRAND_BLUE = colors.HexColor("#3b82f6")
WHITE = colors.white

PAGE_W, PAGE_H = A4

class PDFReportRequest(BaseModel):
    sections: List[str] = ["summary", "pillars", "score", "touchpoints", "recommendations"]
    include_charts: bool = True
    language: str = "pt-BR"


def _header_footer(canvas, doc, brand_name: str, brand_color: str = None):
    """Professional header and footer for each page"""
    canvas.saveState()
    accent = colors.HexColor(brand_color) if brand_color else BRAND_PRIMARY

    # Header line
    canvas.setStrokeColor(accent)
    canvas.setLineWidth(2)
    canvas.line(2*cm, PAGE_H - 1.6*cm, PAGE_W - 2*cm, PAGE_H - 1.6*cm)

    # Header left: LaBrand
    canvas.setFont("Helvetica-Bold", 9)
    canvas.setFillColor(BRAND_DARK)
    canvas.drawString(2*cm, PAGE_H - 1.4*cm, "LaBrand")

    # Header right: brand name + date
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(BRAND_GRAY)
    canvas.drawRightString(PAGE_W - 2*cm, PAGE_H - 1.4*cm, f"{brand_name}  |  {datetime.now().strftime('%d/%m/%Y')}")

    # Footer
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(BRAND_GRAY)
    canvas.drawCentredString(PAGE_W / 2, 1.2*cm, f"Página {doc.page}  —  Relatório gerado por LaBrand · Brand OS")

    # Footer line
    canvas.setStrokeColor(colors.HexColor("#e0e0e0"))
    canvas.setLineWidth(0.5)
    canvas.line(2*cm, 1.5*cm, PAGE_W - 2*cm, 1.5*cm)

    canvas.restoreState()


def _score_bar(score: int, width: float = 400, height: float = 50) -> Drawing:
    """Horizontal score bar with gradient-like segments"""
    d = Drawing(width, height)
    bar_h = 16
    bar_y = (height - bar_h) / 2

    # Background
    d.add(Rect(0, bar_y, width, bar_h, fillColor=colors.HexColor("#e5e7eb"), strokeColor=None, rx=8))

    # Score fill
    if score >= 70:
        fill = BRAND_GREEN
    elif score >= 40:
        fill = BRAND_YELLOW
    else:
        fill = BRAND_RED

    fill_w = max(0, (width * score / 100))
    d.add(Rect(0, bar_y, fill_w, bar_h, fillColor=fill, strokeColor=None, rx=8))

    # Score text
    d.add(String(fill_w + 8 if fill_w < width - 40 else fill_w - 35, bar_y + 3, f"{score}%",
                 fontSize=10, fontName="Helvetica-Bold",
                 fillColor=BRAND_DARK if fill_w < width - 40 else WHITE))
    return d


def _pillar_chart(pillar_data: dict, pillar_types: list, pillar_names: dict) -> Drawing:
    """Bar chart for pillar completion"""
    d = Drawing(450, 180)

    chart = VerticalBarChart()
    chart.x = 50
    chart.y = 30
    chart.height = 120
    chart.width = 370
    chart.data = [[100 if pillar_data.get(pt, {}).get("answers") else 0 for pt in pillar_types]]
    chart.categoryAxis.categoryNames = [pillar_names.get(pt, pt)[:8] for pt in pillar_types]
    chart.categoryAxis.labels.fontSize = 7
    chart.categoryAxis.labels.angle = 0
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = 100
    chart.valueAxis.valueStep = 25
    chart.valueAxis.labels.fontSize = 7
    chart.bars[0].fillColor = BRAND_PRIMARY
    chart.bars[0].strokeColor = None

    d.add(chart)
    return d


def _build_styles():
    """Build all paragraph styles"""
    styles = getSampleStyleSheet()

    cover_title = ParagraphStyle(
        'CoverTitle', parent=styles['Heading1'],
        fontSize=32, leading=38, spaceAfter=12,
        textColor=WHITE, fontName='Helvetica-Bold', alignment=TA_LEFT
    )
    cover_sub = ParagraphStyle(
        'CoverSub', parent=styles['Normal'],
        fontSize=14, leading=18, textColor=colors.HexColor("#d4d4d8"),
        fontName='Helvetica'
    )
    section_title = ParagraphStyle(
        'SectionTitle', parent=styles['Heading2'],
        fontSize=18, leading=22, spaceBefore=24, spaceAfter=12,
        textColor=BRAND_DARK, fontName='Helvetica-Bold'
    )
    section_num = ParagraphStyle(
        'SectionNum', parent=styles['Normal'],
        fontSize=11, textColor=BRAND_PRIMARY, fontName='Helvetica-Bold',
        spaceBefore=20, spaceAfter=2
    )
    body = ParagraphStyle(
        'Body', parent=styles['Normal'],
        fontSize=10, leading=15, textColor=colors.HexColor("#374151"),
        fontName='Helvetica'
    )
    body_bold = ParagraphStyle(
        'BodyBold', parent=body,
        fontName='Helvetica-Bold'
    )
    metric_value = ParagraphStyle(
        'MetricValue', parent=styles['Normal'],
        fontSize=24, leading=28, textColor=BRAND_DARK,
        fontName='Helvetica-Bold', alignment=TA_CENTER
    )
    metric_label = ParagraphStyle(
        'MetricLabel', parent=styles['Normal'],
        fontSize=9, textColor=BRAND_GRAY,
        fontName='Helvetica', alignment=TA_CENTER
    )
    rec_item = ParagraphStyle(
        'RecItem', parent=body,
        leftIndent=12, spaceBefore=4, spaceAfter=4,
        bulletIndent=0
    )
    return {
        'cover_title': cover_title, 'cover_sub': cover_sub,
        'section_title': section_title, 'section_num': section_num,
        'body': body, 'body_bold': body_bold,
        'metric_value': metric_value, 'metric_label': metric_label,
        'rec_item': rec_item
    }


def _table_style_header():
    """Standard table style with professional look"""
    return TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BRAND_LIGHT_BG]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
    ])


@router.post("/brands/{brand_id}/reports/executive-pdf")
async def generate_executive_pdf(brand_id: str, request: PDFReportRequest, user: dict = Depends(get_current_user)):
    """Generate enhanced executive PDF report"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")

    # Collect data
    pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(20)
    maturity = await db.maturity_diagnosis.find_one({"brand_id": brand_id}, {"_id": 0})
    touchpoints = await db.touchpoints.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
    bvs = await db.bvs_scores.find({"brand_id": brand_id}, {"_id": 0}).sort("created_at", -1).to_list(1)
    culture = await db.brand_culture.find_one({"brand_id": brand_id}, {"_id": 0})
    tracking = await db.brand_tracking.find({"brand_id": brand_id}, {"_id": 0}).sort("created_at", -1).to_list(5)

    # Computed metrics
    pillar_types = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    pillar_names = {
        "start": "Ponto de Partida", "values": "Valores", "purpose": "Propósito",
        "promise": "Promessa", "positioning": "Posicionamento",
        "personality": "Personalidade", "universality": "Universalidade"
    }
    pillars_data = {p.get("pillar_type"): p for p in pillars}
    completed_pillars = sum(1 for pt in pillar_types if pt in pillars_data and pillars_data[pt].get("answers"))
    completion_rate = int((completed_pillars / len(pillar_types)) * 100)

    tp_scores = [tp.get("nota", 5) for tp in touchpoints if tp.get("nota")]
    avg_tp = sum(tp_scores) / len(tp_scores) if tp_scores else 0

    bvs_score = bvs[0].get("score", 0) if bvs else 0
    brand_name = brand.get('name', 'Marca')
    brand_color = brand.get('color', '#e67e22')

    st = _build_styles()

    # --- Build PDF ---
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2.2*cm, bottomMargin=2*cm
    )

    story = []

    # ============== COVER PAGE ==============
    # Dark cover background drawn via onFirstPage
    cover_table_data = [
        [Paragraph("Relatório Executivo", st['cover_title'])],
        [Paragraph(f"<b>{brand_name}</b>", st['cover_title'])],
        [Spacer(1, 0.5*cm)],
        [Paragraph(f"Setor: {brand.get('industry', brand.get('sector', 'N/A'))}", st['cover_sub'])],
        [Paragraph(f"Gerado em: {datetime.now().strftime('%d de %B de %Y, %H:%M')}", st['cover_sub'])],
        [Spacer(1, 0.3*cm)],
        [Paragraph(f"Completude: {completion_rate}%  |  BVS Score: {bvs_score}  |  Touchpoints: {len(touchpoints)}", st['cover_sub'])],
    ]
    cover_table = Table(cover_table_data, colWidths=[14*cm])
    cover_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(Spacer(1, 5*cm))
    story.append(cover_table)
    story.append(PageBreak())

    # ============== TABLE OF CONTENTS ==============
    story.append(Paragraph("SEÇÃO 0", st['section_num']))
    story.append(Paragraph("Índice", st['section_title']))
    story.append(Spacer(1, 0.3*cm))

    toc_items = []
    section_num = 1
    if "summary" in request.sections:
        toc_items.append(f"{section_num}. Resumo Executivo")
        section_num += 1
    if "pillars" in request.sections:
        toc_items.append(f"{section_num}. Pilares de Marca")
        section_num += 1
    if "score" in request.sections:
        toc_items.append(f"{section_num}. BVS Score & Maturidade")
        section_num += 1
    if "touchpoints" in request.sections:
        toc_items.append(f"{section_num}. Touchpoints")
        section_num += 1
    if "recommendations" in request.sections:
        toc_items.append(f"{section_num}. Recomendações Estratégicas")
        section_num += 1

    for item in toc_items:
        story.append(Paragraph(item, st['body']))
        story.append(Spacer(1, 0.2*cm))

    story.append(PageBreak())

    # ============== SECTION: EXECUTIVE SUMMARY ==============
    section_idx = 1
    if "summary" in request.sections:
        story.append(Paragraph(f"SEÇÃO {section_idx}", st['section_num']))
        story.append(Paragraph("Resumo Executivo", st['section_title']))
        story.append(HRFlowable(width="100%", thickness=1, color=BRAND_PRIMARY, spaceAfter=12))

        # Key Metrics in cards-like table
        metrics_data = [
            [Paragraph(f"<b>{completion_rate}%</b>", st['metric_value']),
             Paragraph(f"<b>{bvs_score}</b>", st['metric_value']),
             Paragraph(f"<b>{len(touchpoints)}</b>", st['metric_value']),
             Paragraph(f"<b>{avg_tp:.1f}</b>", st['metric_value'])],
            [Paragraph("Completude", st['metric_label']),
             Paragraph("BVS Score", st['metric_label']),
             Paragraph("Touchpoints", st['metric_label']),
             Paragraph("Média TP", st['metric_label'])],
        ]
        metrics_table = Table(metrics_data, colWidths=[3.7*cm]*4)
        metrics_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (0, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('BOX', (1, 0), (1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('BOX', (2, 0), (2, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('BOX', (3, 0), (3, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('TOPPADDING', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
            ('TOPPADDING', (0, 1), (-1, 1), 2),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 14),
            ('BACKGROUND', (0, 0), (-1, -1), BRAND_LIGHT_BG),
        ]))
        story.append(metrics_table)
        story.append(Spacer(1, 0.8*cm))

        # Summary table
        summary_rows = [
            ["Métrica", "Valor", "Status"],
            ["Pilares Preenchidos", f"{completed_pillars} de {len(pillar_types)}", "OK" if completed_pillars >= 5 else "Atenção"],
            ["Touchpoints Mapeados", str(len(touchpoints)), "OK" if len(touchpoints) >= 5 else "Atenção"],
            ["Score Médio Touchpoints", f"{avg_tp:.1f} / 10", "OK" if avg_tp >= 7 else "Atenção"],
            ["Maturidade", maturity.get("level", "Não avaliado") if maturity else "Não avaliado", "-"],
        ]
        summary_table = Table(summary_rows, colWidths=[7*cm, 4*cm, 3*cm])
        summary_table.setStyle(_table_style_header())
        story.append(summary_table)
        story.append(Spacer(1, 0.5*cm))

        # Completion bar
        story.append(Paragraph("<b>Progresso Geral</b>", st['body_bold']))
        story.append(Spacer(1, 0.2*cm))
        story.append(_score_bar(completion_rate, width=450))
        story.append(PageBreak())
        section_idx += 1

    # ============== SECTION: PILLARS ==============
    if "pillars" in request.sections:
        story.append(Paragraph(f"SEÇÃO {section_idx}", st['section_num']))
        story.append(Paragraph("Pilares de Marca", st['section_title']))
        story.append(HRFlowable(width="100%", thickness=1, color=BRAND_PRIMARY, spaceAfter=12))

        pillar_rows = [["Pilar", "Status", "Completude"]]
        for pt in pillar_types:
            pillar = pillars_data.get(pt, {})
            has_data = bool(pillar.get("answers"))
            pillar_rows.append([
                pillar_names.get(pt, pt.title()),
                "Completo" if has_data else "Pendente",
                "100%" if has_data else "0%"
            ])

        pillar_table = Table(pillar_rows, colWidths=[6*cm, 4*cm, 4*cm])
        pillar_table.setStyle(_table_style_header())

        # Color rows based on status
        for i in range(1, len(pillar_rows)):
            if pillar_rows[i][1] == "Completo":
                pillar_table.setStyle(TableStyle([
                    ('TEXTCOLOR', (1, i), (1, i), BRAND_GREEN),
                    ('FONTNAME', (1, i), (1, i), 'Helvetica-Bold'),
                ]))
            else:
                pillar_table.setStyle(TableStyle([
                    ('TEXTCOLOR', (1, i), (1, i), BRAND_RED),
                    ('FONTNAME', (1, i), (1, i), 'Helvetica-Bold'),
                ]))

        story.append(pillar_table)
        story.append(Spacer(1, 0.8*cm))

        # Pillar chart
        if request.include_charts:
            story.append(Paragraph("<b>Visão Geral dos Pilares</b>", st['body_bold']))
            story.append(Spacer(1, 0.3*cm))
            story.append(_pillar_chart(pillars_data, pillar_types, pillar_names))

        # Pillar details
        story.append(Spacer(1, 0.5*cm))
        for pt in pillar_types:
            pillar = pillars_data.get(pt, {})
            answers = pillar.get("answers", {})
            if answers:
                story.append(Paragraph(f"<b>{pillar_names.get(pt, pt)}</b>", st['body_bold']))
                for key, value in list(answers.items())[:3]:
                    if isinstance(value, str) and value.strip():
                        label = key.replace("_", " ").title()
                        text = value[:200] + "..." if len(value) > 200 else value
                        story.append(Paragraph(f"<i>{label}:</i> {text}", st['body']))
                story.append(Spacer(1, 0.3*cm))

        story.append(PageBreak())
        section_idx += 1

    # ============== SECTION: BVS SCORE & MATURITY ==============
    if "score" in request.sections:
        story.append(Paragraph(f"SEÇÃO {section_idx}", st['section_num']))
        story.append(Paragraph("BVS Score & Maturidade", st['section_title']))
        story.append(HRFlowable(width="100%", thickness=1, color=BRAND_PRIMARY, spaceAfter=12))

        # BVS Score
        story.append(Paragraph(f"<b>BVS Score Atual: {bvs_score}</b>", st['body_bold']))
        story.append(Spacer(1, 0.3*cm))
        story.append(_score_bar(min(bvs_score, 100), width=450))
        story.append(Spacer(1, 0.5*cm))

        if bvs_score >= 70:
            bvs_text = "Excelente! Sua marca está bem posicionada e demonstra forte equity."
        elif bvs_score >= 40:
            bvs_text = "Boa base, mas há oportunidades significativas de melhoria em diversos pilares."
        elif bvs_score > 0:
            bvs_text = "Atenção: O score indica necessidade urgente de desenvolvimento estratégico."
        else:
            bvs_text = "BVS Score não calculado. Complete os pilares para gerar a avaliação."
        story.append(Paragraph(bvs_text, st['body']))
        story.append(Spacer(1, 0.5*cm))

        # Maturity
        if maturity:
            story.append(Paragraph("<b>Diagnóstico de Maturidade</b>", st['body_bold']))
            story.append(Spacer(1, 0.2*cm))
            mat_data = [
                ["Dimensão", "Nível"],
                ["Nível Geral", maturity.get("level", "N/A")],
            ]
            for key, val in maturity.items():
                if key not in ("brand_id", "user_id", "created_at", "updated_at", "level", "brand_id") and isinstance(val, (str, int, float)):
                    mat_data.append([key.replace("_", " ").title(), str(val)])

            if len(mat_data) > 1:
                mat_table = Table(mat_data, colWidths=[7*cm, 7*cm])
                mat_table.setStyle(_table_style_header())
                story.append(mat_table)

        # Brand tracking
        if tracking:
            story.append(Spacer(1, 0.5*cm))
            story.append(Paragraph("<b>Evolução Recente</b>", st['body_bold']))
            track_rows = [["Data", "Evento", "Score"]]
            for t in tracking[:5]:
                track_rows.append([
                    t.get("created_at", "")[:10] if t.get("created_at") else "-",
                    t.get("event_type", t.get("type", "Registro")),
                    str(t.get("score", "-"))
                ])
            if len(track_rows) > 1:
                track_table = Table(track_rows, colWidths=[4*cm, 6*cm, 4*cm])
                track_table.setStyle(_table_style_header())
                story.append(track_table)

        story.append(PageBreak())
        section_idx += 1

    # ============== SECTION: TOUCHPOINTS ==============
    if "touchpoints" in request.sections and touchpoints:
        story.append(Paragraph(f"SEÇÃO {section_idx}", st['section_num']))
        story.append(Paragraph("Touchpoints da Marca", st['section_title']))
        story.append(HRFlowable(width="100%", thickness=1, color=BRAND_PRIMARY, spaceAfter=12))

        story.append(Paragraph(
            f"Total de <b>{len(touchpoints)}</b> touchpoints mapeados com score médio de <b>{avg_tp:.1f}/10</b>.",
            st['body']
        ))
        story.append(Spacer(1, 0.4*cm))

        tp_rows = [["Touchpoint", "Tipo", "Nota", "Status"]]
        for tp in sorted(touchpoints, key=lambda x: x.get("nota", 0), reverse=True)[:15]:
            nota = tp.get("nota", 0)
            status = "Excelente" if nota >= 8 else ("Bom" if nota >= 6 else ("Atenção" if nota >= 4 else "Crítico"))
            tp_rows.append([
                (tp.get("name", tp.get("titulo", "N/A")))[:30],
                tp.get("type", tp.get("tipo", "N/A")),
                f"{nota}/10",
                status
            ])

        if len(tp_rows) > 1:
            tp_table = Table(tp_rows, colWidths=[5.5*cm, 3.5*cm, 2.5*cm, 2.5*cm])
            tp_table.setStyle(_table_style_header())

            for i in range(1, len(tp_rows)):
                status = tp_rows[i][3]
                color = BRAND_GREEN if status == "Excelente" else (BRAND_BLUE if status == "Bom" else (BRAND_YELLOW if status == "Atenção" else BRAND_RED))
                tp_table.setStyle(TableStyle([
                    ('TEXTCOLOR', (3, i), (3, i), color),
                    ('FONTNAME', (3, i), (3, i), 'Helvetica-Bold'),
                ]))

            story.append(tp_table)

        story.append(PageBreak())
        section_idx += 1

    # ============== SECTION: RECOMMENDATIONS ==============
    if "recommendations" in request.sections:
        story.append(Paragraph(f"SEÇÃO {section_idx}", st['section_num']))
        story.append(Paragraph("Recomendações Estratégicas", st['section_title']))
        story.append(HRFlowable(width="100%", thickness=1, color=BRAND_PRIMARY, spaceAfter=12))

        recs = []

        # Priority recommendations
        if completion_rate < 100:
            pending = [pillar_names[pt] for pt in pillar_types if pt not in pillars_data or not pillars_data.get(pt, {}).get("answers")]
            recs.append({
                "priority": "Alta",
                "text": f"Complete os pilares pendentes: {', '.join(pending[:3])}{'...' if len(pending) > 3 else ''}",
                "impact": "Aumenta a solidez estratégica e o BVS Score"
            })

        if len(touchpoints) < 5:
            recs.append({
                "priority": "Alta",
                "text": "Mapeie mais touchpoints da jornada do cliente (mínimo recomendado: 5)",
                "impact": "Visão completa da experiência de marca"
            })

        if avg_tp > 0 and avg_tp < 7:
            low_tps = [tp.get("name", tp.get("titulo", "?")) for tp in touchpoints if tp.get("nota", 10) < 6]
            recs.append({
                "priority": "Média",
                "text": f"Melhore touchpoints com score baixo{': ' + ', '.join(low_tps[:2]) if low_tps else ''}",
                "impact": "Consistência da experiência de marca"
            })

        if not maturity:
            recs.append({
                "priority": "Média",
                "text": "Realize o diagnóstico de maturidade organizacional",
                "impact": "Identifica gaps de capacidade da equipe"
            })

        if bvs_score > 0 and bvs_score < 50:
            recs.append({
                "priority": "Alta",
                "text": "O BVS Score está abaixo de 50. Foque nos pilares fundamentais (Start, Valores, Propósito)",
                "impact": "Fortalecimento do equity da marca"
            })

        if not recs:
            recs.append({
                "priority": "-",
                "text": "Parabéns! Sua marca está bem estruturada. Continue monitorando os indicadores.",
                "impact": "Manutenção da excelência"
            })

        rec_rows = [["Prioridade", "Recomendação", "Impacto Esperado"]]
        for r in recs:
            rec_rows.append([r["priority"], r["text"], r["impact"]])

        rec_table = Table(rec_rows, colWidths=[2.5*cm, 7.5*cm, 4*cm])
        rec_table.setStyle(_table_style_header())

        for i in range(1, len(rec_rows)):
            pri = rec_rows[i][0]
            color = BRAND_RED if pri == "Alta" else (BRAND_YELLOW if pri == "Média" else BRAND_GREEN)
            rec_table.setStyle(TableStyle([
                ('TEXTCOLOR', (0, i), (0, i), color),
                ('FONTNAME', (0, i), (0, i), 'Helvetica-Bold'),
            ]))

        story.append(rec_table)
        story.append(Spacer(1, 1*cm))

        # Closing
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#d1d5db"), spaceAfter=12))
        story.append(Paragraph(
            "<i>Este relatório foi gerado automaticamente pelo LaBrand · Brand OS. "
            "Para dúvidas ou suporte, entre em contato com a equipe de gestão.</i>",
            st['body']
        ))

    # ============== BUILD PDF ==============
    def first_page(canvas, doc):
        # Dark cover background
        canvas.saveState()
        canvas.setFillColor(BRAND_DARK)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

        # Accent bar
        accent = colors.HexColor(brand_color) if brand_color else BRAND_PRIMARY
        canvas.setFillColor(accent)
        canvas.rect(0, PAGE_H - 0.8*cm, PAGE_W, 0.8*cm, fill=1, stroke=0)

        # Footer on cover
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#9ca3af"))
        canvas.drawString(2*cm, 2*cm, "LaBrand · Brand OS  —  Relatório Executivo de Marca")
        canvas.restoreState()

    def later_pages(canvas, doc):
        _header_footer(canvas, doc, brand_name, brand_color)

    doc.build(story, onFirstPage=first_page, onLaterPages=later_pages)

    # Save report record
    report_id = f"rep_{uuid.uuid4().hex[:12]}"
    await db.executive_reports.insert_one({
        "report_id": report_id,
        "brand_id": brand_id,
        "brand_name": brand_name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sections_included": request.sections,
        "generated_by": user["user_id"],
        "completion_rate": completion_rate,
        "bvs_score": bvs_score,
        "pillars_completed": completed_pillars,
        "touchpoints_count": len(touchpoints)
    })

    buffer.seek(0)
    filename = f"labrand_relatorio_{brand_name.lower().replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/brands/{brand_id}/reports/history")
async def get_report_history(brand_id: str, user: dict = Depends(get_current_user)):
    """Get report generation history"""
    reports = await db.executive_reports.find(
        {"brand_id": brand_id},
        {"_id": 0}
    ).sort("generated_at", -1).to_list(50)
    return {"reports": reports, "total": len(reports)}


@router.get("/brands/{brand_id}/reports/{report_id}/download")
async def download_report(brand_id: str, report_id: str, user: dict = Depends(get_current_user)):
    """Re-download a previously generated report"""
    report = await db.executive_reports.find_one({"report_id": report_id, "brand_id": brand_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Relatório não encontrado")
    request = PDFReportRequest(sections=report.get("sections_included", ["summary", "pillars", "recommendations"]))
    return await generate_executive_pdf(brand_id, request, user)
