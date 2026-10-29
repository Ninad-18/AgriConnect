"""Reproducible MobileNetV3-Large transfer-learning entry point.

Run only after reviewing a dataset licence and its crop/quality labels. Dataset
downloads are intentionally not performed here or at service startup.
"""
import argparse, json, random
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="ImageFolder train/val/test dataset directory")
    parser.add_argument("--output", default="models")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    random.seed(args.seed)
    try:
        import torch
        from torchvision import datasets, models, transforms
    except ImportError as exc:
        raise SystemExit("Install optional training dependencies: pip install torch torchvision") from exc
    torch.manual_seed(args.seed)
    data = Path(args.data)
    # Deliberately require pre-split data so split policy, duplicate detection,
    # class balancing and held-out metrics remain explicit and auditable.
    required = [data / split for split in ("train", "val", "test")]
    if not all(path.is_dir() for path in required):
        raise SystemExit("Expected data/train, data/val and data/test ImageFolder splits.")
    transform = transforms.Compose([transforms.Resize((224, 224)), transforms.ToTensor(), transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])])
    train = datasets.ImageFolder(required[0], transform=transform)
    model = models.mobilenet_v3_large(weights=models.MobileNet_V3_Large_Weights.DEFAULT)
    model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, len(train.classes))
    Path(args.output).mkdir(parents=True, exist_ok=True)
    Path(args.output, "labels.json").write_text(json.dumps(train.classes, indent=2), encoding="utf-8")
    Path(args.output, "training-config.json").write_text(json.dumps({"seed":args.seed,"architecture":"mobilenet_v3_large","normalization":"ImageNet","status":"initialised; implement reviewed training/evaluation before deployment"}, indent=2), encoding="utf-8")
    print("Initialised MobileNetV3-Large and wrote labels/config. Training is intentionally gated on reviewed dataset evaluation.")

if __name__ == "__main__": main()
