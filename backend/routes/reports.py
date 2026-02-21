"""PDF Report Generation Module"""
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
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.graphics.shapes import Drawing, Rect
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Reports"])

class PDFReportRequest(BaseModel):
    sections: List[str] = ["summary", "pillars", "score", "recommendations"]
    include_charts: bool = True
    language: str = "pt-BR"

def create_header(canvas, doc, brand_name: str):
    """Add header to each page"""
    canvas.saveState()
    canvas.setFont("Helvetica-Bold", 10)
    canvas.setFillColor(colors.HexColor("#1a1a1a"))
    canvas.drawString(2*cm, A4[1] - 1.5*cm, f"LaBrand - {brand_name}")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.grey)
    canvas.drawRightString(A4[0] - 2*cm, A4[1] - 1.5*cm, datetime.now().strftime("%d/%m/%Y"))
    canvas.line(2*cm, A4[1] - 1.8*cm, A4[0] - 2*cm, A4[1] - 1.8*cm)
    canvas.restoreState()

def create_footer(canvas, doc):
    """Add footer to each page"""
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.grey)
    canvas.drawCentredString(A4[0]/2, 1.5*cm, f"Página {doc.page}")
    canvas.drawRightString(A4[0] - 2*cm, 1.5*cm, "Gerado por LaBrand - Brand OS")
    canvas.restoreState()

def create_score_chart(score: int, width: int = 200, height: int = 100) -> Drawing:
    """Create a visual score representation"""
    d = Drawing(width, height)
    
    # Background bar
    d.add(Rect(10, 40, width - 20, 20, fillColor=colors.HexColor("#e0e0e0"), strokeColor=None))
    
    # Score bar
    score_width = (width - 20) * (score / 100)
    if score >= 70:
        fill_color = colors.HexColor("#22c55e")
    elif score >= 40:
        fill_color = colors.HexColor("#f59e0b")
    else:
        fill_color = colors.HexColor("#ef4444")
    
    d.add(Rect(10, 40, score_width, 20, fillColor=fill_color, strokeColor=None))
    
    return d

@router.post("/brands/{brand_id}/reports/executive-pdf")
async def generate_executive_pdf(brand_id: str, request: PDFReportRequest, user: dict = Depends(get_current_user)):
    """Generate a real PDF executive report"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    # Collect all data
    pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    maturity = await db.maturity_diagnosis.find_one({"brand_id": brand_id}, {"_id": 0})
    touchpoints = await db.touchpoints.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
    
    # Calculate scores
    pillar_types = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    pillars_data = {p.get("pillar_type"): p for p in pillars}
    completed_pillars = sum(1 for pt in pillar_types if pt in pillars_data and pillars_data[pt].get("answers"))
    completion_rate = int((completed_pillars / len(pillar_types)) * 100)
    
    # Touchpoint stats
    touchpoint_scores = [tp.get("nota", 5) for tp in touchpoints]
    avg_touchpoint = sum(touchpoint_scores) / len(touchpoint_scores) if touchpoint_scores else 0
    
    # Generate PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2.5*cm,
        bottomMargin=2*cm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        textColor=colors.HexColor("#1a1a1a")
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceBefore=20,
        spaceAfter=10,
        textColor=colors.HexColor("#1a1a1a")
    )
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=11,
        leading=16
    )
    
    # Build content
    story = []
    
    # Cover
    story.append(Spacer(1, 3*cm))
    story.append(Paragraph(f"Relatório Executivo de Marca", title_style))
    story.append(Paragraph(f"<b>{brand.get('name', 'N/A')}</b>", heading_style))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(f"Setor: {brand.get('industry', 'N/A')}", body_style))
    story.append(Paragraph(f"Gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}", body_style))
    story.append(PageBreak())
    
    # Executive Summary
    if "summary" in request.sections:
        story.append(Paragraph("1. Resumo Executivo", heading_style))
        
        summary_data = [
            ["Métrica", "Valor", "Status"],
            ["Completude dos Pilares", f"{completion_rate}%", "✓" if completion_rate >= 70 else "⚠"],
            ["Pilares Preenchidos", f"{completed_pillars}/{len(pillar_types)}", ""],
            ["Touchpoints Mapeados", str(len(touchpoints)), "✓" if len(touchpoints) >= 5 else "⚠"],
            ["Score Médio Touchpoints", f"{avg_touchpoint:.1f}/10", "✓" if avg_touchpoint >= 7 else "⚠"],
            ["Maturidade", maturity.get("level", "Não avaliado") if maturity else "Não avaliado", ""],
        ]
        
        summary_table = Table(summary_data, colWidths=[8*cm, 4*cm, 2*cm])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1a1a1a")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f5f5f5")),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#e0e0e0")),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 1*cm))
    
    # Pillars Detail
    if "pillars" in request.sections:
        story.append(Paragraph("2. Status dos Pilares de Marca", heading_style))
        
        pillar_names = {
            "start": "Ponto de Partida",
            "values": "Valores",
            "purpose": "Propósito",
            "promise": "Promessa",
            "positioning": "Posicionamento",
            "personality": "Personalidade",
            "universality": "Universalidade"
        }
        
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
        pillar_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1a1a1a")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#e0e0e0")),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(pillar_table)
        story.append(Spacer(1, 1*cm))
    
    # Recommendations
    if "recommendations" in request.sections:
        story.append(Paragraph("3. Recomendações Estratégicas", heading_style))
        
        recommendations = []
        if completion_rate < 100:
            recommendations.append(f"• Complete os pilares de marca pendentes ({len(pillar_types) - completed_pillars} restantes)")
        if len(touchpoints) < 5:
            recommendations.append("• Mapeie mais touchpoints da jornada do cliente")
        if avg_touchpoint < 7:
            recommendations.append("• Trabalhe na melhoria dos touchpoints com score baixo")
        if not maturity:
            recommendations.append("• Realize um diagnóstico de maturidade organizacional")
        
        if not recommendations:
            recommendations.append("• Parabéns! Sua marca está bem estruturada. Continue monitorando os indicadores.")
        
        for rec in recommendations:
            story.append(Paragraph(rec, body_style))
            story.append(Spacer(1, 0.3*cm))
    
    # Build PDF
    brand_name = brand.get('name', 'Marca')
    doc.build(
        story,
        onFirstPage=lambda c, d: (create_header(c, d, brand_name), create_footer(c, d)),
        onLaterPages=lambda c, d: (create_header(c, d, brand_name), create_footer(c, d))
    )
    
    # Save report record
    report_id = f"rep_{uuid.uuid4().hex[:12]}"
    report_data = {
        "report_id": report_id,
        "brand_id": brand_id,
        "brand_name": brand_name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sections_included": request.sections,
        "generated_by": user["user_id"],
        "completion_rate": completion_rate,
        "pillars_completed": completed_pillars
    }
    await db.executive_reports.insert_one(report_data)
    
    # Return PDF
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
    """Re-download a previously generated report (regenerates PDF)"""
    report = await db.executive_reports.find_one({"report_id": report_id, "brand_id": brand_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Relatório não encontrado")
    
    # Regenerate PDF with same sections
    request = PDFReportRequest(sections=report.get("sections_included", ["summary", "pillars", "recommendations"]))
    return await generate_executive_pdf(brand_id, request, user)
