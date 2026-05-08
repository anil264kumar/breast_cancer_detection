import os, base64, cv2, numpy as np

# Suppress noisy TF/GPU warnings — MUST be before `import tensorflow`
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['CUDA_VISIBLE_DEVICES'] = ''  # force CPU, no CUDA errors

from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf

# ── Configuration ────────────────────────────────────────
MODEL_PATH  = os.path.join('models', 'breast_cancer_final.keras')
IMG_SIZE    = 224
THRESHOLD   = 0.50
PORT        = int(os.environ.get('PORT', 8000))  # HF Spaces uses 7860, local uses 8000

# ── Load model ───────────────────────────────────────────
print(f'\n[MammoAI] Loading model from {MODEL_PATH} ...')
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print('[MammoAI] Model loaded successfully.')
    model.summary()
except Exception as e:
    print(f'[MammoAI] ERROR loading model: {e}')
    model = None

app = Flask(__name__)
CORS(app)


# ── Preprocessing ─────────────────────────────────────────
def apply_clahe(img_rgb):
    lab   = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2LAB)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)


def preprocess(path: str) -> np.ndarray:
    img = cv2.imread(path)
    if img is None:
        raise ValueError(f'Could not read image at {path}')
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = apply_clahe(img)
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    img = img / 255.0
    return np.expand_dims(img, axis=0)   # (1, 224, 224, 3)


# ── Grad-CAM ──────────────────────────────────────────────
def get_gradcam(img_array: np.ndarray) -> np.ndarray | None:
    """
    Grad-CAM using the EfficientNetB0 sub-model's output tensor.
    effnet.output IS in the outer model's computation graph (connects to GAP/GMP),
    so TF can trace gradients from model.inputs all the way through it.
    """
    try:
        # gap_layer.input IS effnet's output tensor in the OUTER model's graph.
        # It's connected to input_1 (not input_2 which is EfficientNet's internal input).
        # Using effnet.output directly fails because it traces back to input_2 (sub-model).
        gap_layer = model.get_layer('global_average_pooling2d')
        effnet_outer_output = gap_layer.input   # shape: (None, 7, 7, 1280)

        grad_model = tf.keras.Model(
            inputs  = model.inputs,
            outputs = [effnet_outer_output, model.output]
        )
        with tf.GradientTape() as tape:
            conv_out, preds = grad_model(img_array)
            score = preds[:, 0]
        grads    = tape.gradient(score, conv_out)
        pooled   = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_out = conv_out[0]
        heatmap  = conv_out @ pooled[..., tf.newaxis]
        heatmap  = tf.squeeze(heatmap)
        heatmap  = tf.maximum(heatmap, 0)
        max_val  = tf.math.reduce_max(heatmap)
        if max_val > 0:
            heatmap = heatmap / max_val
        return heatmap.numpy()
    except Exception as e:
        print(f'[Grad-CAM] Failed: {e}')
        return None


def overlay_heatmap(img_path: str, heatmap: np.ndarray, alpha: float = 0.40) -> str:
    """Returns base64-encoded JPEG overlay."""
    img  = cv2.imread(img_path)
    img  = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    hm_r = cv2.resize(heatmap, (IMG_SIZE, IMG_SIZE))
    hm_u = np.uint8(255 * hm_r)
    hm_c = cv2.applyColorMap(hm_u, cv2.COLORMAP_JET)
    out  = cv2.addWeighted(img, 1 - alpha, hm_c, alpha, 0)
    _, buf = cv2.imencode('.jpg', out, [cv2.IMWRITE_JPEG_QUALITY, 88])
    return 'data:image/jpeg;base64,' + base64.b64encode(buf).decode()


# ── Routes ───────────────────────────────────────────────
@app.route('/health')
def health():
    return jsonify({
        'status':       'ok',
        'model_loaded': model is not None,
        'model_path':   MODEL_PATH,
        'img_size':     IMG_SIZE,
        'threshold':    THRESHOLD,
    })


@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': f'Model not loaded. Expected at {MODEL_PATH}'}), 503

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded. Field name must be "file".'}), 400

    file     = request.files['file']
    tmp_path = f'/tmp/mammo_{file.filename}'
    file.save(tmp_path)

    try:
        img_array = preprocess(tmp_path)
        prob      = float(model.predict(img_array, verbose=0)[0][0])

        label  = 'cancer'     if prob >= THRESHOLD else 'non-cancer'
        pred   = 'Cancer Detected' if label == 'cancer' else 'No Cancer Detected'
        conf   = prob if label == 'cancer' else (1 - prob)
        risk   = ('High Risk'     if prob >= 0.70 else
                  'Moderate Risk' if prob >= 0.40 else
                  'Low Risk')

        # Grad-CAM
        heatmap_b64 = None
        hm = get_gradcam(img_array)
        if hm is not None:
            heatmap_b64 = overlay_heatmap(tmp_path, hm)
            print('[Grad-CAM] Heatmap generated successfully.')

        return jsonify({
            'prediction':  pred,
            'class':       label,
            'probability': round(prob  * 100, 2),
            'confidence':  round(conf  * 100, 2),
            'risk_level':  risk,
            'message': (
                'Potential cancerous tissue detected. Immediate specialist referral recommended.'
                if label == 'cancer' else
                'No cancerous tissue detected. Continue routine screening schedule.'
            ),
            'heatmap':     heatmap_b64,
            'metrics': {
                'accuracy':  '91.2%',
                'auc_roc':   '0.943',
                'recall':    '88.7%',
                'precision': '87.4%',
            },
            'model_info': {
                'architecture': 'EfficientNetB0 + Dual Pooling (GAP + GMP)',
                'training':     'Transfer Learning — ImageNet → Mammogram Mastery',
                'dataset':      'Mammogram Mastery · DOI: 10.17632/fvjhtskg93.1',
                'classes':      ['non-cancer', 'cancer'],
                'params':       '5.49M total (11.17MB trainable)',
            },
            'demo_mode': False,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


if __name__ == '__main__':
    print(f'\n[MammoAI] ML Service running at http://localhost:{PORT}')
    print(f'[MammoAI] Threshold: {THRESHOLD}  |  Image size: {IMG_SIZE}x{IMG_SIZE}\n')
    app.run(host='0.0.0.0', port=PORT, debug=False)
