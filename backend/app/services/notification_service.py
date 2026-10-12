from sqlalchemy.orm import Session
from app.models.notification import Notification
from typing import Optional, List

class NotificationService:
    def create_notification(
        self,
        db: Session,
        title: str,
        message: str,
        user_id: Optional[int] = None,
        tenant_id: Optional[int] = None,
        notification_type: Optional[str] = None,
        link: Optional[str] = None
    ):
        """
        Creates a new notification.
        """
        try:
            notification = Notification(
                user_id=user_id,
                tenant_id=tenant_id,
                title=title,
                message=message,
                type=notification_type,
                link=link
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)
            return notification
        except Exception as e:
            db.rollback()
            print(f"FAILED TO CREATE NOTIFICATION: {e}")
            return None

    def get_user_notifications(
        self,
        db: Session,
        user_id: int,
        tenant_id: int,
        skip: int = 0,
        limit: int = 20
    ):
        """
        Fetch notifications for a user, scoped by tenant.
        Agency Admins might bypass this via API logic.
        """
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id
        ).order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

    def get_unread_count(self, db: Session, user_id: int, tenant_id: int):
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id,
            Notification.is_read == False
        ).count()

    def mark_as_read(self, db: Session, notification_id: int, user_id: int):
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        if notification:
            notification.is_read = True
            db.commit()
            return True
        return False

notification_service = NotificationService()
