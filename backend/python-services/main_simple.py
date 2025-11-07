"""
Simplified FastAPI Service - For Testing Without MediaPipe
Returns mock data to test the frontend integration
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import random

app = FastAPI(
    title="Medical Video Analysis API (Mock Mode)",
    description="Mock service for testing frontend without MediaPipe",
    version="1.0.0-mock"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisRequest(BaseModel):
    image_data: str

class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float

class EyeMetricsResponse(BaseModel):
    pupil_diameter_left: float
    pupil_diameter_right: float
    pupil_asymmetry: float
    pupil_asymmetry_alert: bool
    sclera_redness_left: float
    sclera_redness_right: float
    jaundice_score: float
    jaundice_detected: bool
    blink_detected: bool
    blink_rate: float

class FirstAidResponse(BaseModel):
    facial_asymmetry: float
    stroke_risk: str
    stroke_alert: bool
    pallor_score: float
    pallor_alert: bool
    cyanosis_detected: bool
    cyanosis_alert: bool
    respiratory_rate: Optional[float]
    consciousness_indicators: Dict[str, bool]
    urgent_findings: List[str]

class AnalysisResponse(BaseModel):
    success: bool
    face_detected: bool
    landmarks: List[LandmarkPoint]
    eye_metrics: EyeMetricsResponse
    first_aid: FirstAidResponse
    quality_score: float
    warnings: List[str]
    anatomy_targets: List[str]
    voice_guidance: str

@app.get("/")
async def root():
    return {
        "service": "Medical Video Analysis API (MOCK MODE)",
        "status": "running",
        "version": "1.0.0-mock",
        "note": "This is a mock service for testing. Install MediaPipe for real analysis.",
        "endpoints": {
            "analyze": "POST /analyze"
        }
    }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_frame(request: AnalysisRequest):
    """
    Return mock data for testing UI
    """
    # Generate mock landmarks (just a few for demo)
    landmarks = [
        LandmarkPoint(x=320 + random.uniform(-50, 50),
                     y=240 + random.uniform(-50, 50),
                     z=0)
        for _ in range(50)
    ]

    # Mock eye metrics (normal values)
    eye_metrics = EyeMetricsResponse(
        pupil_diameter_left=4.2,
        pupil_diameter_right=4.1,
        pupil_asymmetry=0.1,
        pupil_asymmetry_alert=False,
        sclera_redness_left=0.2,
        sclera_redness_right=0.2,
        jaundice_score=0.1,
        jaundice_detected=False,
        blink_detected=random.choice([True, False]),
        blink_rate=16.5
    )

    # Mock first aid (normal)
    first_aid = FirstAidResponse(
        facial_asymmetry=0.03,
        stroke_risk="normal",
        stroke_alert=False,
        pallor_score=0.2,
        pallor_alert=False,
        cyanosis_detected=False,
        cyanosis_alert=False,
        respiratory_rate=None,
        consciousness_indicators={
            "eyes_open": True,
            "face_tracking": True,
            "blink_response": True
        },
        urgent_findings=[]
    )

    return AnalysisResponse(
        success=True,
        face_detected=True,
        landmarks=landmarks,
        eye_metrics=eye_metrics,
        first_aid=first_aid,
        quality_score=0.85,
        warnings=["MOCK MODE: Install MediaPipe for real analysis"],
        anatomy_targets=[],
        voice_guidance="Mock analysis complete. Your facial scan looks normal (simulated data)."
    )

@app.post("/reset")
async def reset_analyzer():
    return {"message": "Mock analyzer reset (no-op)"}

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🔬 MOCK Medical Video Analysis Service")
    print("="*60)
    print("⚠️  This is MOCK MODE for testing UI")
    print("📦 Install MediaPipe for real medical analysis:")
    print("   pip install mediapipe opencv-python")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
