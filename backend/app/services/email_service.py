import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    def __init__(self):
        username = os.getenv("MAIL_USERNAME")
        password = os.getenv("MAIL_PASSWORD")
        mail_from = os.getenv("MAIL_FROM", "noreply@socialpulse.agency")
        mail_server = os.getenv("MAIL_SERVER")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

        if username and password and mail_server:
            try:
                self.config = ConnectionConfig(
                    MAIL_USERNAME=username,
                    MAIL_PASSWORD=password,
                    MAIL_FROM=mail_from,
                    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
                    MAIL_SERVER=mail_server,
                    MAIL_STARTTLS=True,
                    MAIL_SSL_TLS=False,
                    USE_CREDENTIALS=True,
                    VALIDATE_CERTS=True
                )
                self.fm = FastMail(self.config)
                self.is_configured = True
            except Exception:
                self.is_configured = False
                self.fm = None
        else:
            self.is_configured = False
            self.fm = None

    async def send_onboarding_email(self, email: EmailStr, password: str, tenant_name: str):
        if not self.is_configured or not self.fm:
            return
        message = MessageSchema(
            subject=f"Welcome to {tenant_name} CRM",
            recipients=[email],
            body=f"""
            <h1>Welcome to Social Pulse CRM</h1>
            <p>Your tenant <b>{tenant_name}</b> has been provisioned.</p>
            <p><b>Login Credentials:</b></p>
            <ul>
                <li><b>Email:</b> {email}</li>
                <li><b>Temporary Password:</b> {password}</li>
            </ul>
            <p>Please log in and change your password immediately.</p>
            <p><a href="{self.frontend_url}/login">Login Here</a></p>
            """,
            subtype=MessageType.html
        )
        await self.fm.send_message(message)

    async def send_invite_email(self, email: EmailStr, password: str, inviter_name: str, tenant_name: str):
        if not self.is_configured or not self.fm:
            return
        message = MessageSchema(
            subject=f"Invitation to join {tenant_name} on Social Pulse",
            recipients=[email],
            body=f"""
            <h1>You've been invited!</h1>
            <p>{inviter_name} has invited you to join the team at <b>{tenant_name}</b>.</p>
            <p><b>Login Credentials:</b></p>
            <ul>
                <li><b>Email:</b> {email}</li>
                <li><b>Temporary Password:</b> {password}</li>
            </ul>
            <p><a href="{self.frontend_url}/login">Accept Invitation & Login</a></p>
            """,
            subtype=MessageType.html
        )
        await self.fm.send_message(message)

email_service = EmailService()
