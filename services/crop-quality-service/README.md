# AgriConnect Crop Quality Service

Author: Ninad Patil

This CPU-first FastAPI service validates crop photos and provides a strictly honest assessment contract. It does not ship model weights or claim a crop grade: ImageNet-pretrained MobileNetV3 weights are not sufficient evidence for commercial A/B/C grading.

## Run on Windows

```powershell
cd services/crop-quality-service
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
pytest
```

The current `/api/v1/quality/assess` endpoint validates actual image bytes, dimensions, size and MIME type, then returns `MODEL_UNAVAILABLE` until legally usable, validated crop-specific training data and trained weights are installed. Configure `QUALITY_INTERNAL_TOKEN` in both services for an internal bearer token.

## Endpoint example

`POST /api/v1/quality/assess` accepts multipart fields `crop_name` and `image`; it returns an assessment ID, image-validation result, capability status, model version, classification/defects/grade (all `null` or empty when unsupported), warnings, and an explicit reason. `GET /health`, `/health/ready`, and `/capabilities` do not require a model asset.

## Training policy

Do not download datasets at startup. Before training MobileNetV3-Large, verify the chosen dataset's licence, labels, crop coverage and attribution requirements, create reproducible splits, evaluate held-out metrics, save label mappings and model metadata, and register only validated crop/model pairs in `app/capabilities.py`.

The included `train.py` sets a fixed seed and initialises torchvision's MobileNetV3-Large. It deliberately requires already reviewed `train`, `val`, and `test` splits so no unverified data is silently trained or evaluated.
