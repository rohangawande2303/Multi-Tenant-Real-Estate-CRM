import requests
import json
from uuid import UUID

BASE_URL = "http://localhost:8000/api/v1"

def test_patch_city():
    print("--- Testing Lead City Update (PATCH) ---")
    
    # 1. Login
    print("Logging in...")
    login_data = {"username": "admin@agency.com", "password": "admin123"}
    r = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    if r.status_code != 200:
        print(f"Login failed: {r.text}")
        return
    
    token = r.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": "1",
        "Content-Type": "application/json"
    }
    
    # 2. Fetch an existing Lead
    print("Fetching leads...")
    r = requests.get(f"{BASE_URL}/leads/?limit=1", headers=headers)
    if r.status_code != 200:
        print(f"Failed to fetch leads: {r.text}")
        return
    
    leads = r.json().get("items", [])
    if not leads:
        print("No leads found.")
        return
    else:
        lead = leads[0]
    
    lead_id = lead["id"]
    old_city = lead.get("city", "Unknown")
    print(f"Lead ID: {lead_id}, Current City: {old_city}")
    
    # 3. Update only the city field
    new_city = "Mumbai"
    print(f"Updating city to {new_city} using PATCH...")
    patch_payload = {"city": new_city}
    r_patch = requests.patch(f"{BASE_URL}/leads/{lead_id}", json=patch_payload, headers=headers)
    
    if r_patch.status_code == 200:
        updated_lead = r_patch.json()
        print(f"SUCCESS: City updated to {updated_lead['city']}")
        if updated_lead['city'] == new_city:
            print("✔ PATCH partial update works as expected")
        else:
            print("✘ City update failed or mismatch")
    else:
        print(f"FAILED: PATCH request failed with status {r_patch.status_code}")
        print(r_patch.text)

if __name__ == "__main__":
    test_patch_city()
