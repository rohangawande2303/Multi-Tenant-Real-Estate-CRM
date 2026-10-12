import pytest
from app.services.import_service import ImportService
from app.schemas.lead_upload_columns import LEAD_UPLOAD_COLUMNS
from fastapi import UploadFile
from unittest.mock import MagicMock, AsyncMock
import io
import csv

@pytest.mark.asyncio
async def test_validate_file_success():
    # Create valid CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(LEAD_UPLOAD_COLUMNS) # Header
    # Row 1
    row = [""] * 216
    row[LEAD_UPLOAD_COLUMNS.index("Name")] = "Test Lead"
    row[LEAD_UPLOAD_COLUMNS.index("Phone")] = "1234567890"
    writer.writerow(row)
    
    content = output.getvalue().encode("utf-8-sig")
    
    file = UploadFile(filename="test.csv", file=io.BytesIO(content))
    
    lines = await ImportService.validate_file(file)
    assert len(lines) == 2 # Header + 1 row

@pytest.mark.asyncio
async def test_validate_file_column_mismatch():
    # Create invalid CSV content (missing last column)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(LEAD_UPLOAD_COLUMNS[:-1]) 
    
    content = output.getvalue().encode("utf-8-sig")
    
    file = UploadFile(filename="test.csv", file=io.BytesIO(content))
    
    with pytest.raises(Exception) as e:
        await ImportService.validate_file(file)
    assert "Column count mismatch" in str(e.value.detail)

@pytest.mark.asyncio
async def test_preview_import_valid():
    # Mock DB
    db = MagicMock()
    # Mock query returning no duplicates
    db.query.return_value.filter.return_value.all.return_value = []
    
    # Create valid CSV content
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=LEAD_UPLOAD_COLUMNS)
    writer.writeheader()
    writer.writerow({"Name": "Valid Lead", "Phone": "9999999999"})
    
    content = output.getvalue().encode("utf-8-sig")
    file = UploadFile(filename="valid.csv", file=io.BytesIO(content))
    
    result = await ImportService.preview_import(db, file, project_id=1)
    
    assert result["total_rows"] == 1
    assert result["valid_count"] == 1
    assert result["duplicate_count"] == 0
    assert result["error_count"] == 0

@pytest.mark.asyncio
async def test_preview_import_duplicate():
    # Mock DB
    db = MagicMock()
    # Mock existing lead with phone 8888888888
    mock_lead = MagicMock()
    mock_lead.phone = "8888888888"
    db.query.return_value.filter.return_value.all.return_value = [(("8888888888"),)] # Tuple for single column query?
    # Wait, in service: db.query(Lead.phone)... returns tuples
    
    # Create CSV with duplicate phone
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=LEAD_UPLOAD_COLUMNS)
    writer.writeheader()
    writer.writerow({"Name": "Duplicate Lead", "Phone": "8888888888"})
    
    content = output.getvalue().encode("utf-8-sig")
    file = UploadFile(filename="duplicate.csv", file=io.BytesIO(content))
    
    # Fix mock implementation to match actual service query
    # In service: existing_phones = {row[0] for row in db.query(Lead.phone)...}
    # So mock needs to return list of tuples
    
    result = await ImportService.preview_import(db, file, project_id=1)
    
    # Actually, my mock above returns [(("8888888888"),)] which is a tuple inside a list?
    # db.query returns a Query object. .all() returns list of Row objects (tuples).
    # So [("8888888888",)] is correct.
    
    assert result["total_rows"] == 1
    assert result["duplicate_count"] == 1
    assert result["valid_count"] == 0
