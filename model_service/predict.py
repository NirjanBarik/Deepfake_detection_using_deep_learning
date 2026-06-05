"""
predict.py — Python bridge between the Node.js API server and the PyTorch deepfake model.

Usage (called automatically by the Node server):
    python predict.py <video_path> <sequence_length>

Output (printed to stdout):
    {"label": "REAL", "confidence": 91.2}

Face detection uses OpenCV's DNN-based face detector (no dlib / face_recognition required),
which also works on Python 3.13 Windows.
"""

import sys
import os
import json
import glob

import numpy as np
import cv2
import torch
from torch import nn
from torchvision import transforms, models

# ── Constants (must match views.py) ───────────────────────────────────────────
IM_SIZE = 112
MEAN = [0.485, 0.456, 0.406]
STD  = [0.229, 0.224, 0.225]

TRAIN_TRANSFORMS = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize((IM_SIZE, IM_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(MEAN, STD),
])

DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'

# ── OpenCV DNN face detector (bundled with opencv-python, no extra install) ───
def _load_face_detector():
    """Load OpenCV's DNN face detector from its bundled model files."""
    # opencv-python ships with these Caffe model files
    base = cv2.data.haarcascades  # always available
    cascade_path = os.path.join(base, 'haarcascade_frontalface_default.xml')
    if os.path.exists(cascade_path):
        return cv2.CascadeClassifier(cascade_path)
    return None

_FACE_CASCADE = _load_face_detector()

def detect_face_crop(frame_rgb):
    """
    Detect the largest face in an RGB frame using OpenCV Haar cascade.
    Returns the cropped face region, or the original frame if none found.
    """
    if _FACE_CASCADE is None or _FACE_CASCADE.empty():
        return frame_rgb  # fallback: use full frame

    gray = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2GRAY)
    faces = _FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(40, 40))

    if len(faces) == 0:
        return frame_rgb  # no face found, use whole frame

    # Pick largest face by area
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    padding = 20
    h_img, w_img = frame_rgb.shape[:2]
    x1 = max(0, x - padding)
    y1 = max(0, y - padding)
    x2 = min(w_img, x + w + padding)
    y2 = min(h_img, y + h + padding)
    return frame_rgb[y1:y2, x1:x2]


# ── Model definition (identical to views.py) ──────────────────────────────────
class Model(nn.Module):
    def __init__(self, num_classes, latent_dim=2048, lstm_layers=1, hidden_dim=2048, bidirectional=False):
        super().__init__()
        base = models.resnext50_32x4d(weights=None)  # no pretrained download needed at inference
        self.model   = nn.Sequential(*list(base.children())[:-2])
        self.lstm    = nn.LSTM(latent_dim, hidden_dim, lstm_layers, bidirectional=bidirectional)
        self.relu    = nn.LeakyReLU()
        self.dp      = nn.Dropout(0.4)
        self.linear1 = nn.Linear(2048, num_classes)
        self.avgpool = nn.AdaptiveAvgPool2d(1)

    def forward(self, x):
        batch_size, seq_length, c, h, w = x.shape
        x = x.view(batch_size * seq_length, c, h, w)
        fmap = self.model(x)
        x = self.avgpool(fmap)
        x = x.view(batch_size, seq_length, 2048)
        x_lstm, _ = self.lstm(x, None)
        return fmap, self.dp(self.linear1(x_lstm[:, -1, :]))


# ── Video frame extraction ────────────────────────────────────────────────────
def extract_frames(video_path, sequence_length):
    """
    Sample `sequence_length` evenly-spaced frames from the video.
    Falls back to taking the first N frames if the video is short.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total <= 0:
        total = 9999  # unknown length, read until EOF

    indices = set(
        int(i * total / sequence_length) for i in range(sequence_length)
    ) if total >= sequence_length else set(range(total))

    frames = []
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx in indices:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            crop = detect_face_crop(rgb)
            frames.append(TRAIN_TRANSFORMS(crop))
            if len(frames) == sequence_length:
                break
        idx += 1

    cap.release()

    if not frames:
        raise ValueError("Could not extract any frames from the video.")

    # Pad if video is shorter than sequence_length
    while len(frames) < sequence_length:
        frames.append(frames[-1])

    tensor = torch.stack(frames[:sequence_length])   # (seq_len, C, H, W)
    return tensor.unsqueeze(0)                        # (1, seq_len, C, H, W)


# ── Model loading ─────────────────────────────────────────────────────────────
def find_model(models_dir, sequence_length):
    """
    Pick the best .pt model for the requested sequence length.
    Filename convention: <name>_<accuracy>_<tag>_<seqLen>_<extra>.pt
    Falls back to any .pt file if none match the sequence length.
    """
    candidates = glob.glob(os.path.join(models_dir, '*.pt'))
    if not candidates:
        raise FileNotFoundError(f"No .pt model files found in: {models_dir}")

    matched = []
    for p in candidates:
        parts = os.path.basename(p).split('_')
        try:
            if int(parts[3]) == sequence_length:
                matched.append(p)
        except (IndexError, ValueError):
            pass

    pool = matched if matched else candidates

    def accuracy_key(p):
        try:
            return float(os.path.basename(p).split('_')[1])
        except Exception:
            return 0.0

    return max(pool, key=accuracy_key)


# ── Inference ─────────────────────────────────────────────────────────────────
def run_inference(video_path, sequence_length):
    SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
    models_dir   = os.path.join(SCRIPT_DIR, '..', 'Django Application', 'models')
    models_dir   = os.path.normpath(models_dir)
    model_path   = find_model(models_dir, sequence_length)

    model = Model(2)
    model.load_state_dict(
        torch.load(model_path, map_location=torch.device(DEVICE), weights_only=True)
    )
    model.to(DEVICE)
    model.eval()

    tensor = extract_frames(video_path, sequence_length).to(DEVICE)

    with torch.no_grad():
        _, logits = model(tensor)
        sm        = nn.Softmax(dim=1)
        probs     = sm(logits)
        pred      = torch.argmax(probs, dim=1).item()
        confidence = probs[0, pred].item() * 100

    label = 'REAL' if pred == 1 else 'FAKE'
    return label, round(confidence, 1)


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: predict.py <video_path> <sequence_length>'}))
        sys.exit(1)

    video_path      = sys.argv[1]
    sequence_length = int(sys.argv[2])

    try:
        label, confidence = run_inference(video_path, sequence_length)
        print(json.dumps({'label': label, 'confidence': confidence}))
    except Exception as exc:
        print(json.dumps({'error': str(exc)}))
        sys.exit(1)
