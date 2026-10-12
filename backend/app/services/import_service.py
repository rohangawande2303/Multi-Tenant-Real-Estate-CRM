import csv
import io
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException, status, UploadFile
from app.schemas.lead_upload_columns import LEAD_UPLOAD_COLUMNS
from app.models.lead import Lead
from app.services.activity_service import activity_service
import logging

# Setup Logger
logger = logging.getLogger(__name__)

class ImportService:
    @staticmethod
    def _parse_date(date_str: str) -> Optional[datetime]:
        """
        Parses date string from various formats.
        Supported: DD-MM-YYYY, YYYY-MM-DD, ISO, DD-MM-YYYY HH:MM
        """
        if not date_str:
            return None
        
        formats = [
            "%d-%m-%Y",
            "%Y-%m-%d",
            "%d-%m-%Y %H:%M",
            "%Y-%m-%d %H:%M:%S",
            "%d/%m/%Y",
            "%m/%d/%Y"
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        
        # Fallback to ISO if nothing matches
        try:
            return datetime.fromisoformat(date_str.strip())
        except ValueError:
            return None

    @staticmethod
    async def validate_file(file: UploadFile) -> List[str]:
        """
        Reads file, validates 216 columns. Returns rows as dicts.
        Raises HTTPException on error.
        """
        content = await file.read()
        try:
            content_str = content.decode("utf-8-sig") # Handle BOM
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Invalid file encoding. Use UTF-8.")
            
        reader = csv.reader(content_str.splitlines())
        
        try:
            headers = next(reader)
        except StopIteration:
            raise HTTPException(status_code=400, detail="Empty file.")
            
        if len(headers) != 216:
             raise HTTPException(
                status_code=400, 
                detail=f"Column count mismatch. Expected 216, found {len(headers)}. Use the official template."
            )
            
        # Strict Header Check
        for i, (expected, found) in enumerate(zip(LEAD_UPLOAD_COLUMNS, headers)):
            if expected.strip() != found.strip():
                raise HTTPException(
                    status_code=400, 
                    detail=f"Column mismatch at #{i+1}. Expected '{expected}', found '{found}'."
                )
                
        # Return content to beginning for parsing
        await file.seek(0)
        return content_str.splitlines()

    @staticmethod
    async def preview_import(
        db: Session, 
        file: UploadFile, 
        project_id: int
    ) -> Dict[str, Any]:
        """
        Analyzes the file and returns stats: Total, Duplicates, Errors.
        Does NOT insert into DB.
        """
        lines = await ImportService.validate_file(file)
        reader = csv.DictReader(lines)
        
        total_rows = 0
        duplicates = []
        errors = []
        valid_count = 0
        
        existing_phones = {
            row[0] for row in db.query(Lead.phone).filter(Lead.project_id == project_id).all()
        }
        
        for row_num, row in enumerate(reader, start=2):
            total_rows += 1
            
            # 1. Required Fields Check
            name = row.get("Name")
            phone = row.get("Phone")
            
            if not name or not phone:
                errors.append({"row": row_num, "error": "Missing Required Fields (Name or Phone)"})
                continue
                
            # 2. Duplicate Check
            normalized_phone = phone.strip()
            if normalized_phone in existing_phones:
                duplicates.append({"row": row_num, "phone": normalized_phone, "name": name})
            else:
                valid_count += 1
                
        return {
            "total_rows": total_rows,
            "valid_count": valid_count,
            "duplicate_count": len(duplicates),
            "error_count": len(errors),
            "duplicates_sample": duplicates[:5], # Show first 5
            "errors_sample": errors[:5]
        }

    @staticmethod
    async def execute_import(
        db: Session, 
        file: UploadFile, 
        project_id: int, 
        user_id: int,
        tenant_id: int,
        duplicate_strategy: str = "SKIP", # SKIP, UPDATE, CREATE_NEW
        request: Any = None
    ) -> Dict[str, int]:
        """
        Executes the import with the chosen strategy.
        """
        lines = await ImportService.validate_file(file)
        reader = csv.DictReader(lines)
        
        added = 0
        updated = 0
        skipped = 0
        failed = 0
        
        # Cache existing leads if updating or skipping
        existing_leads_map = {}
        if duplicate_strategy in ["SKIP", "UPDATE"]:
            leads = db.query(Lead).filter(Lead.project_id == project_id).all()
            existing_leads_map = {l.phone: l for l in leads}
        
        for row in reader:
            try:
                name = row.get("Name")
                phone = row.get("Phone", "").strip()
                
                if not name or not phone:
                    failed += 1
                    continue
                
                # Prepare Lead Data
                lead_data = {
                    "tenant_id": tenant_id,
                    "project_id": project_id,
                    "name": name,
                    "phone": phone,
                    "email": row.get("Email"),
                    "lead_rating": row.get("Lead Rating"),
                    "current_status_at_sales": row.get("Current Status At Sales") or "NEW",
                    "created_by": user_id,
                    "created_at": ImportService._parse_date(row.get("Lead Created Date")) or datetime.utcnow(),
                    "custom_fields": {k: v for k, v in row.items() if v} # Store full row in JSONB
                }
                
                # Duplicate Logic
                if phone in existing_leads_map:
                    if duplicate_strategy == "SKIP":
                        skipped += 1
                        continue
                    elif duplicate_strategy == "UPDATE":
                        # Update existing lead
                        existing_lead = existing_leads_map[phone]
                        for key, value in lead_data.items():
                            if key != "id" and key != "created_at": # Don't overwrite ID or creation date
                                setattr(existing_lead, key, value)
                        updated += 1
                    elif duplicate_strategy == "CREATE_NEW":
                        # Force create new (might violate unique constraint if not handled?)
                        # DB has strict constraint: phone + project_id UNIQUE.
                        # So CREATE_NEW will fail at DB level unless we modify phone or constraint.
                        # Assuming user means "Try to create", which will fail if DB constraint exists.
                        # We'll treat CREATE_NEW as "Overwrite" or strictly failing.
                        # Actually, if DB has unique constraint, we CANNOT create new with same phone.
                        # We should fallback to SKIP or Error.
                        # Let's assume unique constraint exists.
                        failed += 1 # Cannot create duplicate
                else:
                    # New Lead
                    new_lead = Lead(**lead_data)
                    db.add(new_lead)
                    added += 1
                    
            except Exception as e:
                logger.error(f"Row failed: {e}")
                failed += 1
                
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Database Commit Failed: {e}")
            
        # 4. Global Activity Log
        activity_service.log_activity(
            db=db,
            user_id=user_id,
            action_type="LEAD_IMPORT",
            request=request,
            tenant_id=tenant_id,
            role=None, # Role not passed here, but could be fetched or passed if needed
            entity_type="project",
            entity_id=str(project_id),
            description=f"Imported leads: {added} added, {updated} updated, {skipped} skipped, {failed} failed.",
            metadata={"added": added, "updated": updated, "skipped": skipped, "failed": failed}
        )

        return {
            "added": added,
            "updated": updated,
            "skipped": skipped,
            "failed": failed
        }
