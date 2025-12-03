#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Installing Python Dependencies..."
pip install -r requirements.txt

echo "Creating models directory..."
mkdir -p models
cd models

echo "Downloading YuNet Detection Model..."
wget -nc -O face_detection_yunet_2023mar.onnx https://huggingface.co/opencv/face_detection_yunet/resolve/main/face_detection_yunet_2023mar.onnx

echo "Downloading ArcFace Recognition Model..."
# wget -nc -O w600k_r50.onnx https://huggingface.co/maze/faceX/resolve/main/w600k_r50.onnx
# Download SFace (Lite Model for Render Free Tier)
wget -nc -O face_recognition_sface_2021dec.onnx https://huggingface.co/opencv/face_recognition_sface/resolve/main/face_recognition_sface_2021dec.onnx

echo "Models downloaded successfully!"
cd ..