from io import BytesIO
from PIL import Image, UnidentifiedImageError
from fastapi import HTTPException
from .config import MAX_IMAGE_BYTES, MAX_IMAGE_DIMENSION

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}

def validate_image(data: bytes, mime_type: str):
    if mime_type not in ALLOWED_MIME:
        raise HTTPException(400, "Unsupported image type")
    if not data or len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(400, "Image must be non-empty and at most 5MB")
    try:
        with Image.open(BytesIO(data)) as image:
            image.verify()
        with Image.open(BytesIO(data)) as image:
            width, height = image.size
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(400, "Image could not be decoded")
    if not width or not height or width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
        raise HTTPException(400, "Image dimensions are invalid or too large")
    return {"valid": True, "width": width, "height": height, "mimeType": mime_type}
