#!/usr/bin/env python3
"""
Test script for facial analysis service
Tests the /analyze endpoint with actual webcam frames
"""

import cv2
import base64
import requests
import json
import time
import numpy as np

PYTHON_SERVICE_URL = "http://localhost:8000"

def capture_webcam_frame():
    """Capture a single frame from webcam"""
    print("📷 Opening webcam...")
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("❌ Failed to open webcam")
        return None

    # Let camera warm up
    time.sleep(1)

    # Capture frame
    ret, frame = cap.read()
    cap.release()

    if not ret:
        print("❌ Failed to capture frame")
        return None

    print(f"✅ Captured frame: {frame.shape}")
    return frame

def frame_to_base64(frame):
    """Convert frame to base64 JPEG"""
    # Encode as JPEG
    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])

    # Convert to base64
    img_base64 = base64.b64encode(buffer).decode('utf-8')

    print(f"✅ Encoded to base64: {len(img_base64)} chars")
    return img_base64

def analyze_frame(image_data):
    """Send frame to analysis service"""
    print("🔍 Sending to analysis service...")

    response = requests.post(
        f"{PYTHON_SERVICE_URL}/analyze",
        json={"image_data": image_data},
        timeout=10
    )

    print(f"📊 Response status: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print("✅ Analysis successful!")
        print(f"   Face detected: {result['face_detected']}")
        print(f"   Quality score: {result['quality_score']}")
        print(f"   Landmarks: {len(result['landmarks'])} points")

        if result['face_detected']:
            print(f"\n👁️  Eye Metrics:")
            eye = result['eye_metrics']
            print(f"   Left pupil: {eye['pupil_diameter_left']}mm")
            print(f"   Right pupil: {eye['pupil_diameter_right']}mm")
            print(f"   Asymmetry: {eye['pupil_asymmetry']}mm")
            print(f"   Jaundice: {eye['jaundice_score']}")

            print(f"\n🚑 First Aid Assessment:")
            fa = result['first_aid']
            print(f"   Facial asymmetry: {fa['facial_asymmetry']}")
            print(f"   Stroke risk: {fa['stroke_risk']}")
            print(f"   Pallor: {fa['pallor_score']}")
            print(f"   Cyanosis: {fa['cyanosis_detected']}")

            if result['first_aid']['urgent_findings']:
                print(f"\n⚠️  Urgent findings:")
                for finding in result['first_aid']['urgent_findings']:
                    print(f"   - {finding}")

            print(f"\n💬 Voice guidance:")
            print(f"   {result['voice_guidance']}")

        if result['warnings']:
            print(f"\n⚠️  Warnings:")
            for warning in result['warnings']:
                print(f"   - {warning}")

        return result
    else:
        print(f"❌ Analysis failed: {response.status_code}")
        try:
            error = response.json()
            print(f"   Error: {error.get('detail', 'Unknown error')}")
        except:
            print(f"   Response: {response.text}")
        return None

def main():
    print("=" * 60)
    print("🔬 Facial Analysis Service Test")
    print("=" * 60)

    # Check if service is running
    try:
        response = requests.get(PYTHON_SERVICE_URL, timeout=10)
        print(f"✅ Service is running: {response.json()['status']}")
    except requests.exceptions.ConnectionError:
        print("❌ Service is not running!")
        print("   Start it with: cd backend/python-services && python -m uvicorn main:app --reload")
        return
    except Exception as e:
        print(f"❌ Error connecting to service: {e}")
        return

    print()

    # Capture frame
    frame = capture_webcam_frame()
    if frame is None:
        print("\n⚠️  No webcam available, using test image instead")
        # Create a simple test image
        frame = cv2.imread('/tmp/test_face.jpg')
        if frame is None:
            print("❌ No test image available")
            print("   Creating a test image...")
            # Create a simple synthetic test image
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            frame[:] = (50, 50, 50)
            cv2.ellipse(frame, (320, 240), (100, 130), 0, 0, 360, (200, 180, 160), -1)
            cv2.circle(frame, (280, 220), 20, (255, 255, 255), -1)
            cv2.circle(frame, (360, 220), 20, (255, 255, 255), -1)
            cv2.circle(frame, (280, 220), 10, (0, 0, 0), -1)
            cv2.circle(frame, (360, 220), 10, (0, 0, 0), -1)
            cv2.ellipse(frame, (320, 280), (40, 20), 0, 0, 180, (100, 50, 50), 2)
            print("✅ Created synthetic test image")

    print()

    # Convert to base64
    image_data = frame_to_base64(frame)

    print()

    # Analyze
    result = analyze_frame(image_data)

    print()
    print("=" * 60)
    if result and result['face_detected']:
        print("✅ TEST PASSED - Face analysis working correctly!")
    elif result:
        print("⚠️  TEST PASSED - Service working (no face detected)")
    else:
        print("❌ TEST FAILED - Service error")
    print("=" * 60)

if __name__ == "__main__":
    main()
