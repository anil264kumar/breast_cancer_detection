# Quick check — run this once in Python:
import tensorflow as tf
model = tf.keras.models.load_model('models/breast_cancer_final.keras')
model.summary()
# Look for the last Conv2D layer name — update ml_server.py line 63 if different
