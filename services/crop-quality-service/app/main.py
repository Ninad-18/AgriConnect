from uuid import uuid4
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from .config import INTERNAL_TOKEN
from .capabilities import capabilities
from .image_validation import validate_image
from .inference import assess

app = FastAPI(title="AgriConnect Crop Quality Service", version="0.1.0")

def require_internal_token(authorization: str | None):
    if INTERNAL_TOKEN and authorization != f"Bearer {INTERNAL_TOKEN}":
        raise HTTPException(401, "Unauthorized")

@app.get("/health")
def health(): return {"status": "ok"}

@app.get("/health/ready")
def ready():
    c = capabilities()
    return {"ready": c["classification"]["ready"], "reason": c["classification"]["reason"]}

@app.get("/capabilities")
def get_capabilities(): return capabilities()

@app.post("/api/v1/quality/assess")
async def quality_assess(
    crop_name: str = Form(..., min_length=1, max_length=100),
    image: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    require_internal_token(authorization)
    data = await image.read()
    image_info = validate_image(data, image.content_type or "")
    result = assess(crop_name.strip(), image_info)
    return {"assessmentId": str(uuid4()), **result}
