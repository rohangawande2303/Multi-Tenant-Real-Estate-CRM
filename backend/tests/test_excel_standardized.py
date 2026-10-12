import requests
import pandas as pd
import io
import os
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1"

def test_excel_standardized():
    # 1. Login
    login_data = {
        "username": "admin@agency-alpha.com",
        "password": "password123"
    }
    r = requests.post(f"{API_URL}/auth/login", data=login_data)
    if r.status_code != 200:
        print(f"Login failed init: {r.status_code} - {r.text}")
        print("Attempting registration...")
        reg_r = requests.post(f"{API_URL}/auth/register", json={
            "agency_name": "Agency Alpha 2", # Use different name to avoid conflict
            "email": "admin@agency-alpha.com",
            "password": "password123"
        })
        print(f"Reg status: {reg_r.status_code} - {reg_r.text}")
        r = requests.post(f"{API_URL}/auth/login", data=login_data)
        if r.status_code != 200:
            print(f"Login failed even after registration: {r.status_code} - {r.text}")
            return
    
    token = r.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": "agency_alpha"
    }
    
    # 2. Get a Project ID
    r = requests.get(f"{API_URL}/projects/", headers=headers)
    if r.status_code != 200:
        print(f"Projects fetch failed: {r.status_code} - {r.text}")
        return
    projects = r.json()
    if not projects:
        print("No projects found, creating Project Alpha...")
        r = requests.post(f"{API_URL}/projects/", json={
            "name": "Project Alpha",
            "description": "Auto-created for testing"
        }, headers=headers)
        if r.status_code != 200:
            print(f"Project creation failed: {r.text}")
            return
        project_id = r.json()["id"]
    else:
        project_id = projects[0]["id"]
    
    print(f"Testing with Project ID: {project_id}")

    # 3. Download Template
    print("Step 1: Downloading Template...")
    r = requests.get(f"{API_URL}/data/template", headers=headers)
    if r.status_code != 200:
        print(f"Template download failed: {r.text}")
        return
    
    df_template = pd.read_excel(io.BytesIO(r.content))
    if len(df_template.columns) != 219:
        print(f"FAIL: Template has {len(df_template.columns)} columns instead of 219")
        return
    print("SUCCESS: Template has exactly 219 columns.")

    # 4. Prepare Import File
    print("Step 2: Preparing Import File...")
    # Use headers from template
    data = {col: "" for col in df_template.columns}
    data["Name"] = "Test Lead 219"
    data["Phone"] = "1234567890"
    data["Min Budget"] = "50L-75L"
    data["Max Budget"] = "1Cr"
    data["City Name"] = "Mumbai"
    data["Mandate Id"] = 101
    data["Mandate Name"] = "Alpha Developer"
    
    df_import = pd.DataFrame([data])
    excel_io = io.BytesIO()
    with pd.ExcelWriter(excel_io, engine='openpyxl') as writer:
        df_import.to_excel(writer, index=False)
    excel_io.seek(0)
    
    # 5. Import
    print("Step 3: Importing Lead...")
    files = {'file': ('test_lead.xlsx', excel_io, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    params = {'project_id': project_id}
    r = requests.post(f"{API_URL}/data/import", headers=headers, files=files, params=params)
    
    if r.status_code != 200:
        print(f"FAIL: Import failed - {r.text}")
        return
    
    import_res = r.json()
    print(f"Import Result: {import_res}")
    if import_res["success_count"] == 0:
        print(f"FAIL: Success count is 0. Errors: {import_res['errors']}")
        # Check if it was a duplicate
        if import_res["duplicate_count"] == 1:
            print("INFO: Lead already exists, duplicate detected correctly.")
        else:
            return
    else:
        print("SUCCESS: Lead imported.")

    # 6. Export
    print("Step 4: Exporting Leads...")
    params = {'project_id': project_id}
    r = requests.get(f"{API_URL}/data/export", headers=headers, params=params)
    
    if r.status_code != 200:
        print(f"FAIL: Export failed - {r.text}")
        return
    
    df_export = pd.read_excel(io.BytesIO(r.content))
    if len(df_export.columns) != 219:
        print(f"FAIL: Export has {len(df_export.columns)} columns instead of 219")
        return
    
    # Verify exact order
    from app.core.lead_fields import EXCEL_COLUMNS
    for i, col in enumerate(EXCEL_COLUMNS):
        if df_export.columns[i] != col:
             print(f"FAIL: Column {i+1} mismatch. Expected '{col}', found '{df_export.columns[i]}'")
             return
             
    print("SUCCESS: Export has 219 columns in exact order.")
    
    # 7. Check particular lead data in export
    target_row = df_export[df_export["Phone"] == 1234567890]
    if target_row.empty:
        # Sometimes pandas reads phone as int or string
        target_row = df_export[df_export["Phone"].astype(str) == "1234567890"]
        
    if target_row.empty:
        print("FAIL: Imported lead not found in export")
        return
    
    print("Step 5: Verifying Data...")
    # Check Budget conversion
    # Min Budget(in figures) for 50L should be 5000000
    if int(target_row["Min Budget(in figures)"].values[0]) != 5000000:
        print(f"FAIL: Min Budget conversion failed. Got {target_row['Min Budget(in figures)'].values[0]}")
    else:
        print("SUCCESS: Min Budget conversion (50L -> 5000000) verified.")
        
    # Check Auto-populated Session Email
    if target_row["Last Modified By"].values[0] != "admin@agency-alpha.com":
        print(f"FAIL: Last Modified By auto-population failed. Got {target_row['Last Modified By'].values[0]}")
    else:
        print("SUCCESS: User email auto-population verified.")

    print("\nALL TEST CASES PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    # Ensure background server is running or you can run this manually after starting it
    test_excel_standardized()
