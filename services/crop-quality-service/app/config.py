from pathlib import Path
import os

MAX_IMAGE_BYTES = int(os.getenv("QUALITY_MAX_IMAGE_BYTES", str(5 * 1024 * 1024)))
MAX_IMAGE_DIMENSION = int(os.getenv("QUALITY_MAX_IMAGE_DIMENSION", "8192"))
MODEL_DIR = Path(os.getenv("QUALITY_MODEL_DIR", "models"))
MODEL_VERSION = os.getenv("QUALITY_MODEL_VERSION", "unconfigured")
INTERNAL_TOKEN = os.getenv("QUALITY_INTERNAL_TOKEN", "")
