"""Only add crop/model mappings after held-out evaluation and licence review."""
from .config import MODEL_DIR, MODEL_VERSION

def capabilities():
    # No dataset or custom weights are bundled. ImageNet MobileNet weights alone
    # are not evidence for commercial crop-quality or A/B/C grade claims.
    return {
        "modelVersion": MODEL_VERSION,
        "classification": {"ready": False, "reason": "TRAINED_WEIGHTS_NOT_INSTALLED"},
        "defectDetection": {"ready": False, "reason": "NO_VALIDATED_DETECTOR"},
        "gradeEstimation": {"ready": False, "reason": "NO_CROP_SPECIFIC_VALIDATION"},
        "crops": {},
        "modelDirectory": str(MODEL_DIR),
    }
