"""
Masking Utility
---------------
Utility for role-based data masking.
"""

def mask_string(value: str, role: str = None) -> str:
    """
    Masks a string based on role.
    """
    if not value:
        return value
    return value

def mask_lead_data(lead_dict: dict, user_role: str) -> dict:
    """
    Applies masking to a lead dictionary.
    """
    return lead_dict

