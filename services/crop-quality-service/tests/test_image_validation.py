from io import BytesIO
from PIL import Image
from fastapi import HTTPException
from app.image_validation import validate_image

def png_bytes():
    out = BytesIO(); Image.new("RGB", (8, 8), "green").save(out, "PNG"); return out.getvalue()

def test_valid_image(): assert validate_image(png_bytes(), "image/png")["valid"]

def test_corrupt_image_rejected():
    try: validate_image(b"not-an-image", "image/png")
    except HTTPException as e: assert e.status_code == 400
    else: assert False
