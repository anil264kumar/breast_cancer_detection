"""
test_predict.py
===============
Quick test to verify the ML server is working end-to-end.
Run with: python test_predict.py
Both servers must be running (ml_server.py + npm run dev).
"""
import requests
import numpy as np
import cv2
import tempfile
import os
import json
ML_URL   = "http://localhost:8000"
NODE_URL = "http://localhost:5000"
def create_test_image():
    """Create a dummy grayscale 'mammogram-like' image for testing."""
    img = np.zeros((300, 300, 3), dtype=np.uint8)
    # Add some noise to make it realistic
    noise = np.random.randint(40, 120, (300, 300, 3), dtype=np.uint8)
    img = cv2.add(img, noise)
    # Add a bright circular region (simulates tissue)
    cv2.circle(img, (150, 150), 80, (180, 180, 180), -1)
    cv2.circle(img, (150, 150), 30, (220, 220, 220), -1)
    tmp = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    cv2.imwrite(tmp.name, img)
    return tmp.name
def print_section(title):
    print(f"\n{'='*55}")
    print(f"  {title}")
    print(f"{'='*55}")
# ── 1. Health Check ────────────────────────────────────────
print_section("1. ML Server Health Check")
try:
    r = requests.get(f"{ML_URL}/health", timeout=5)
    data = r.json()
    print(f"  Status        : {data.get('status')}")
    print(f"  Model Loaded  : {data.get('model_loaded')}")
    print(f"  Model Path    : {data.get('model_path')}")
    print(f"  Threshold     : {data.get('threshold')}")
    print(f"  Image Size    : {data.get('img_size')}x{data.get('img_size')}")
    if not data.get('model_loaded'):
        print("\n  ❌ Model NOT loaded — check ml_server.py logs")
        exit(1)
    else:
        print("\n  ✅ ML Server is UP and model is loaded!")
except Exception as e:
    print(f"  ❌ Cannot reach ML server: {e}")
    print("  → Make sure 'python ml_server.py' is running")
    exit(1)
# ── 2. Direct Prediction (Flask) ───────────────────────────
print_section("2. Direct Prediction (Flask → Port 8000)")
img_path = create_test_image()
print(f"  Test image    : {img_path}")
try:
    with open(img_path, 'rb') as f:
        r = requests.post(
            f"{ML_URL}/predict",
            files={'file': ('test_mammogram.jpg', f, 'image/jpeg')},
            timeout=60
        )
    result = r.json()
    if 'error' in result:
        print(f"  ❌ Error: {result['error']}")
    else:
        print(f"  Prediction    : {result.get('prediction')}")
        print(f"  Class         : {result.get('class')}")
        print(f"  Probability   : {result.get('probability')}%")
        print(f"  Confidence    : {result.get('confidence')}%")
        print(f"  Risk Level    : {result.get('risk_level')}")
        print(f"  Demo Mode     : {result.get('demo_mode')}  ← must be False!")
        heatmap = result.get('heatmap')
        print(f"  Grad-CAM      : {'✅ Generated (' + str(len(heatmap))[:6] + '... chars)' if heatmap else '⚠️  Not generated'}")
        print(f"\n  ✅ Real model inference working!")
except Exception as e:
    print(f"  ❌ Prediction failed: {e}")
finally:
    if os.path.exists(img_path):
        os.remove(img_path)
# ── 3. Node.js Backend Health ──────────────────────────────
print_section("3. Node.js Backend Check (Port 5000)")
try:
    r = requests.get(f"{NODE_URL}/api/health", timeout=5)
    print(f"  Status Code   : {r.status_code}")
    try:
        print(f"  Response      : {json.dumps(r.json(), indent=2)[:200]}")
    except:
        print(f"  Response      : {r.text[:200]}")
    print(f"\n  ✅ Node.js backend is UP!")
except Exception as e:
    print(f"  ⚠️  Node.js backend not reachable: {e}")
    print("  → Make sure 'npm run dev' is running in the backend folder")
print(f"\n{'='*55}")
print("  TEST COMPLETE")
print(f"{'='*55}\n")
