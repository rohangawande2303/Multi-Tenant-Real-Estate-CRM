import pandas as pd
from typing import List, Dict, Any
from app.core.lead_fields import LABEL_TO_KEY, ALL_CUSTOM_FIELDS

def normalize_header(header: str) -> str:
    """
    Normalizes header string for comparison.
    """
    return header.strip().lower()

def map_excel_to_lead(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Maps DataFrame columns to lead model fields (core + custom).
    """
    # Create mapping of normalized label -> internal key
    label_to_key_normalized = {normalize_header(k): v for k, v in LABEL_TO_KEY.items()}
    
    # Core fields mapping (special handling for non-custom fields)
    core_fields_map = {
        "name": ["name", "full name", "client name"],
        "phone": ["phone", "mobile", "phone number", "contact"],
        "email": ["email", "email address"],
        "alternate_phone": ["alternate phone", "alt phone"],
        "status": ["status"],
        "source_group": ["source group", "first inquiry source group"],
        "city": ["city", "city name"],
        # Add more as needed
    }
    
    results = []
    
    for _, row in df.iterrows():
        lead_data = {
            "custom_fields": {}
        }
        
        for col in df.columns:
            val = row[col]
            if pd.isna(val):
                val = None
                
            col_norm = normalize_header(col)
            
            # 1. Check if it's a core field
            found_core = False
            for key, aliases in core_fields_map.items():
                if col_norm in aliases:
                    lead_data[key] = val
                    found_core = True
                    break
            
            if found_core:
                continue
                
            # 2. Check if it's in our 150+ custom fields registry
            if col_norm in label_to_key_normalized:
                key = label_to_key_normalized[col_norm]
                lead_data["custom_fields"][key] = val
            else:
                # 3. Unknown column -> store as-is in custom_fields using a sanitized version of column name
                sanitized_col = col_norm.replace(" ", "_").replace("(", "").replace(")", "")
                lead_data["custom_fields"][sanitized_col] = val
                
        results.append(lead_data)
        
    return results
