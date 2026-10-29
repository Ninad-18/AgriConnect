from .capabilities import capabilities

def assess(crop_name: str, image_info: dict):
    capability = capabilities()
    # Explicitly do not fabricate generic ImageNet predictions or grades.
    return {
        "cropName": crop_name,
        "imageValidation": image_info,
        "classification": None,
        "defects": [],
        "gradeEstimate": None,
        "capabilityStatus": "MODEL_UNAVAILABLE",
        "warnings": ["No trained and validated crop-quality model is installed."],
        "reason": "TRAINED_WEIGHTS_NOT_INSTALLED",
        "modelVersion": capability["modelVersion"],
    }
