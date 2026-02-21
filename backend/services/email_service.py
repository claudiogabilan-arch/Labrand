"""
LaBrand - Email Service with Resend
Real email sending for alerts and notifications
"""
import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Optional

import resend
from config import db

logger = logging.getLogger(__name__)

# Initialize Resend
resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = "alertas@labrand.com.br"


def get_alert_email_template(brand_name: str, alert_type: str, data: dict) -> str:
    """Generate HTML email template for brand alerts"""
    
    # Color scheme based on alert type
    colors = {
        "consistency": {"primary": "#f59e0b", "bg": "#fef3c7", "icon": "⚠️"},
        "risk": {"primary": "#ef4444", "bg": "#fee2e2", "icon": "🚨"},
        "opportunities": {"primary": "#22c55e", "bg": "#dcfce7", "icon": "💡"},
        "test": {"primary": "#3b82f6", "bg": "#dbeafe", "icon": "✅"}
    }
    
    color = colors.get(alert_type, colors["test"])
    
    # Build alert items HTML
    items_html = ""
    if data.get("items"):
        for item in data["items"]:
            items_html += f"""
            <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #1f2937;">{item.get('title', 'Alerta')}</strong>
                    <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">{item.get('description', '')}</p>
                </td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="background: {color['bg']}; color: {color['primary']}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                        {item.get('severity', 'Info')}
                    </span>
                </td>
            </tr>
            """
    
    # Build metrics HTML if available
    metrics_html = ""
    if data.get("metrics"):
        metrics = data["metrics"]
        metrics_html = f"""
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
            <tr>
                <td style="padding: 16px; background: #f9fafb; border-radius: 8px; text-align: center; width: 33%;">
                    <div style="font-size: 24px; font-weight: 700; color: {color['primary']};">{metrics.get('score', 'N/A')}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Score Atual</div>
                </td>
                <td style="padding: 16px; background: #f9fafb; border-radius: 8px; text-align: center; width: 33%;">
                    <div style="font-size: 24px; font-weight: 700; color: #1f2937;">{metrics.get('change', '0')}%</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Variação</div>
                </td>
                <td style="padding: 16px; background: #f9fafb; border-radius: 8px; text-align: center; width: 33%;">
                    <div style="font-size: 24px; font-weight: 700; color: #1f2937;">{metrics.get('alerts_count', '0')}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Alertas</div>
                </td>
            </tr>
        </table>
        """
    
    # Alert type titles
    type_titles = {
        "consistency": "Alerta de Consistência",
        "risk": "Alerta de Risco",
        "opportunities": "Novas Oportunidades",
        "test": "Email de Teste"
    }
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <tr>
                <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 32px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                        <span style="color: #ffffff;">LA</span><span style="font-weight: 400;">Brand</span>
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 14px;">Brand OS</p>
                </td>
            </tr>
            
            <!-- Alert Banner -->
            <tr>
                <td style="background: {color['bg']}; padding: 16px 32px; border-left: 4px solid {color['primary']};">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="width: 40px; font-size: 24px;">{color['icon']}</td>
                            <td>
                                <h2 style="margin: 0; color: {color['primary']}; font-size: 18px; font-weight: 600;">
                                    {type_titles.get(alert_type, 'Notificação')}
                                </h2>
                                <p style="margin: 4px 0 0 0; color: #4b5563; font-size: 14px;">
                                    Marca: <strong>{brand_name}</strong>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            
            <!-- Content -->
            <tr>
                <td style="padding: 32px;">
                    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                        {data.get('message', 'Você tem novas atualizações sobre sua marca.')}
                    </p>
                    
                    {metrics_html}
                    
                    <!-- Alert Items Table -->
                    {f'''
                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-top: 20px;">
                        <tr>
                            <th style="padding: 12px 16px; background: #f9fafb; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Detalhe</th>
                            <th style="padding: 12px 16px; background: #f9fafb; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Severidade</th>
                        </tr>
                        {items_html}
                    </table>
                    ''' if items_html else ''}
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                        <tr>
                            <td style="text-align: center;">
                                <a href="https://labrand.com.br/dashboard" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
                                    Ver no Dashboard →
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td style="background: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                        Este email foi enviado automaticamente pelo LaBrand - Brand OS.<br>
                        Para ajustar suas preferências de notificação, acesse as configurações de alertas.
                    </p>
                    <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
                        © {datetime.now().year} LaBrand. Todos os direitos reservados.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return html


async def send_email(
    to: List[str],
    subject: str,
    html_content: str
) -> dict:
    """Send email using Resend API (non-blocking)"""
    
    if not resend.api_key:
        logger.error("RESEND_API_KEY not configured")
        return {"success": False, "error": "Email service not configured"}
    
    params = {
        "from": SENDER_EMAIL,
        "to": to,
        "subject": subject,
        "html": html_content
    }
    
    try:
        # Run sync SDK in thread to keep FastAPI non-blocking
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent successfully to {to}, id: {result.get('id')}")
        return {
            "success": True,
            "email_id": result.get("id"),
            "recipients": to
        }
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {str(e)}")
        return {"success": False, "error": str(e)}


async def send_brand_alert(
    brand_id: str,
    brand_name: str,
    alert_type: str,
    recipients: List[str],
    data: dict
) -> dict:
    """Send a brand alert email"""
    
    # Generate subject based on alert type
    subjects = {
        "consistency": f"⚠️ Alerta de Consistência - {brand_name}",
        "risk": f"🚨 Alerta de Risco - {brand_name}",
        "opportunities": f"💡 Novas Oportunidades - {brand_name}",
        "test": f"✅ Email de Teste - {brand_name}"
    }
    
    subject = subjects.get(alert_type, f"Notificação LaBrand - {brand_name}")
    html = get_alert_email_template(brand_name, alert_type, data)
    
    result = await send_email(recipients, subject, html)
    
    # Log the alert
    await db.email_alerts_log.insert_one({
        "brand_id": brand_id,
        "alert_type": alert_type,
        "recipients": recipients,
        "subject": subject,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "success": result.get("success", False),
        "email_id": result.get("email_id"),
        "error": result.get("error")
    })
    
    return result


async def send_test_alert(brand_id: str, brand_name: str, recipient_email: str) -> dict:
    """Send a test alert email"""
    
    data = {
        "message": "Este é um email de teste do sistema de alertas do LaBrand. Se você recebeu este email, a configuração está correta!",
        "metrics": {
            "score": "85",
            "change": "+5",
            "alerts_count": "3"
        },
        "items": [
            {
                "title": "Configuração de Alertas",
                "description": "Sistema de alertas configurado com sucesso.",
                "severity": "Sucesso"
            },
            {
                "title": "Próximos Passos",
                "description": "Você receberá alertas conforme a frequência configurada.",
                "severity": "Info"
            }
        ]
    }
    
    return await send_brand_alert(
        brand_id=brand_id,
        brand_name=brand_name,
        alert_type="test",
        recipients=[recipient_email],
        data=data
    )


async def generate_consistency_alert_data(brand_id: str) -> dict:
    """Generate real consistency alert data from brand metrics"""
    
    # Fetch brand data
    pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    consistency = await db.consistency_alerts.find_one({"brand_id": brand_id}, {"_id": 0})
    touchpoints = await db.touchpoints.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
    
    items = []
    
    # Check pillar completion
    pillar_types = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    pillars_data = {p.get("pillar_type"): p for p in pillars}
    incomplete = [pt for pt in pillar_types if pt not in pillars_data or not pillars_data[pt].get("answers")]
    
    if incomplete:
        items.append({
            "title": f"{len(incomplete)} pilares incompletos",
            "description": f"Pilares pendentes: {', '.join(incomplete[:3])}{'...' if len(incomplete) > 3 else ''}",
            "severity": "Alta" if len(incomplete) > 3 else "Média"
        })
    
    # Check touchpoints
    low_score_touchpoints = [tp for tp in touchpoints if tp.get("nota", 10) < 6]
    if low_score_touchpoints:
        items.append({
            "title": f"{len(low_score_touchpoints)} touchpoints com baixa performance",
            "description": "Touchpoints precisam de atenção para melhorar a experiência do cliente.",
            "severity": "Alta" if len(low_score_touchpoints) > 5 else "Média"
        })
    
    # Check consistency score
    consistency_score = consistency.get("overall_score", 0) if consistency else 0
    if consistency_score < 70:
        items.append({
            "title": "Score de consistência abaixo do ideal",
            "description": f"Score atual: {consistency_score}%. Recomendado: acima de 70%.",
            "severity": "Alta" if consistency_score < 50 else "Média"
        })
    
    if not items:
        items.append({
            "title": "Marca em bom estado",
            "description": "Nenhum alerta crítico de consistência identificado.",
            "severity": "Baixa"
        })
    
    completed_pillars = len(pillar_types) - len(incomplete)
    completion_pct = int((completed_pillars / len(pillar_types)) * 100)
    
    return {
        "message": f"Relatório de consistência da sua marca. {len(items)} {'ponto identificado' if len(items) == 1 else 'pontos identificados'} para atenção.",
        "metrics": {
            "score": str(consistency_score) if consistency_score else str(completion_pct),
            "change": "+0",
            "alerts_count": str(len([i for i in items if i["severity"] in ["Alta", "Média"]]))
        },
        "items": items
    }


async def generate_risk_alert_data(brand_id: str) -> dict:
    """Generate real risk alert data from brand metrics"""
    
    # Fetch risk data
    risk = await db.brand_risk.find_one({"brand_id": brand_id}, {"_id": 0})
    maturity = await db.maturity_diagnosis.find_one({"brand_id": brand_id}, {"_id": 0})
    
    items = []
    risk_score = 50  # Default
    
    if risk:
        risk_score = risk.get("overall_risk", 50)
        risks = risk.get("risks", [])
        for r in risks[:5]:
            if r.get("level") in ["high", "critical"]:
                items.append({
                    "title": r.get("title", "Risco identificado"),
                    "description": r.get("description", ""),
                    "severity": "Crítica" if r.get("level") == "critical" else "Alta"
                })
    
    if maturity:
        maturity_score = maturity.get("score", 50)
        if maturity_score < 40:
            items.append({
                "title": "Maturidade organizacional baixa",
                "description": f"Score de maturidade: {maturity_score}%. Impacta diretamente na gestão de marca.",
                "severity": "Alta"
            })
    
    if not items:
        items.append({
            "title": "Sem riscos críticos",
            "description": "Nenhum risco significativo identificado no momento.",
            "severity": "Baixa"
        })
    
    return {
        "message": f"Análise de riscos da sua marca. Atenção aos pontos identificados.",
        "metrics": {
            "score": str(100 - risk_score),  # Invert for "health" perspective
            "change": "-2",
            "alerts_count": str(len([i for i in items if i["severity"] in ["Crítica", "Alta"]]))
        },
        "items": items
    }


async def generate_opportunities_alert_data(brand_id: str) -> dict:
    """Generate opportunities alert data"""
    
    # Fetch relevant data
    pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    
    items = []
    
    # Check for missing brand elements
    if not brand.get("logo_url"):
        items.append({
            "title": "Adicione um logo à sua marca",
            "description": "Marcas com identidade visual definida têm maior reconhecimento.",
            "severity": "Oportunidade"
        })
    
    # Check naming projects
    naming = await db.naming_projects.find({"brand_id": brand_id}, {"_id": 0}).to_list(5)
    if not naming:
        items.append({
            "title": "Explore o Estúdio Onomástico",
            "description": "Crie nomes memoráveis para produtos e submarcas usando IA.",
            "severity": "Oportunidade"
        })
    
    # Check content generation
    content = await db.generated_content.find({"brand_id": brand_id}, {"_id": 0}).to_list(5)
    if not content:
        items.append({
            "title": "Gere conteúdo de marca com IA",
            "description": "Crie taglines, manifestos e posts para redes sociais.",
            "severity": "Oportunidade"
        })
    
    # Check competitor analysis
    competitors = await db.competitor_analyses.find({"brand_id": brand_id}, {"_id": 0}).to_list(5)
    if not competitors:
        items.append({
            "title": "Analise seus concorrentes",
            "description": "Identifique gaps e oportunidades de diferenciação.",
            "severity": "Oportunidade"
        })
    
    if not items:
        items.append({
            "title": "Marca bem estruturada!",
            "description": "Continue explorando as ferramentas para manter sua marca forte.",
            "severity": "Info"
        })
    
    return {
        "message": f"Oportunidades identificadas para fortalecer sua marca.",
        "metrics": {
            "score": str(len(items)),
            "change": "+0",
            "alerts_count": str(len(items))
        },
        "items": items
    }
