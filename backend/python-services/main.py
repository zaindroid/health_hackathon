"""
FastAPI Service for Medical Video Analysis
Provides real-time face mesh, eye analysis, and first aid assessment
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image

from analyzers.face_mesh_analyzer import FaceMeshAnalyzer, AlertLevel

# Initialize FastAPI app
app = FastAPI(
    title="Medical Video Analysis API",
    description="Real-time face mesh, eye health, and first aid assessment",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize analyzer
analyzer = FaceMeshAnalyzer()


# Pydantic models for request/response
class AnalysisRequest(BaseModel):
    image_data: str  # Base64 encoded image


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
    anatomy_targets: List[str]  # 3D anatomy models to show
    voice_guidance: str  # What voice agent should say


# Helper functions
def decode_base64_image(base64_string: str) -> np.ndarray:
    """Decode base64 image to OpenCV format"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]

        # Decode
        img_data = base64.b64decode(base64_string)
        img = Image.open(BytesIO(img_data))
        img_array = np.array(img)

        # Convert RGB to BGR for OpenCV
        if len(img_array.shape) == 3 and img_array.shape[2] == 3:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        return img_array
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")


def generate_anatomy_targets(eye_metrics, first_aid) -> List[str]:
    """Determine which 3D anatomy models to show based on findings"""
    targets = []

    if first_aid.stroke_alert:
        targets.append("brain")
        targets.append("cranial_nerves")

    if eye_metrics.pupil_asymmetry_alert:
        targets.append("brain")
        targets.append("optic_nerve")

    if eye_metrics.jaundice_detected:
        targets.append("liver")
        targets.append("biliary_system")

    if first_aid.pallor_alert:
        targets.append("heart")
        targets.append("blood_vessels")

    if first_aid.cyanosis_alert:
        targets.append("lungs")
        targets.append("heart")

    return targets


def generate_voice_guidance(eye_metrics, first_aid, warnings) -> str:
    """Generate voice guidance for the agent"""
    guidance_parts = []

    # Urgent findings first
    if first_aid.urgent_findings:
        urgent_text = " ".join(first_aid.urgent_findings[:2])  # Top 2 urgent
        guidance_parts.append(urgent_text)

    # Eye findings
    if eye_metrics.pupil_asymmetry > 1.5:
        guidance_parts.append(
            "I'm detecting unequal pupil sizes. This can indicate a neurological issue. "
            "Let me show you the brain and optic nerve pathways."
        )
    elif eye_metrics.jaundice_detected:
        guidance_parts.append(
            "Your eyes show signs of jaundice, which may indicate liver function concerns. "
            "Here's the liver and how it processes bilirubin."
        )

    # First aid findings
    if first_aid.facial_asymmetry > 0.15:
        guidance_parts.append(
            "I'm detecting facial asymmetry. If this is sudden, it could be a stroke. "
            "Remember FAST: Face drooping, Arm weakness, Speech difficulty, Time to call 911."
        )

    if first_aid.cyanosis_detected:
        guidance_parts.append(
            "Your lips appear blue, indicating low oxygen levels. "
            "This requires immediate medical attention."
        )

    # Normal case
    if not guidance_parts:
        guidance_parts.append("Your facial scan looks normal. All metrics within expected ranges.")

    return " ".join(guidance_parts)


# API Endpoints
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Medical Video Analysis API",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "analyze": "POST /analyze",
            "analyze_batch": "POST /analyze-batch"
        }
    }


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_frame(request: AnalysisRequest):
    """
    Analyze a single video frame for medical indicators.

    Returns:
        - Face mesh landmarks
        - Eye health metrics (pupils, jaundice, redness)
        - First aid assessment (stroke, shock, hypoxia)
        - 3D anatomy navigation targets
        - Voice guidance text
    """
    try:
        # Decode image
        frame = decode_base64_image(request.image_data)

        # Run analysis
        result = analyzer.analyze(frame)

        # Build response
        landmarks = [
            LandmarkPoint(x=p[0], y=p[1], z=p[2])
            for p in result.landmarks
        ]

        # Eye metrics with alerts
        eye_metrics = EyeMetricsResponse(
            pupil_diameter_left=result.eye_metrics.pupil_diameter_left,
            pupil_diameter_right=result.eye_metrics.pupil_diameter_right,
            pupil_asymmetry=result.eye_metrics.pupil_asymmetry,
            pupil_asymmetry_alert=result.eye_metrics.pupil_asymmetry > 1.0,
            sclera_redness_left=result.eye_metrics.sclera_redness_left,
            sclera_redness_right=result.eye_metrics.sclera_redness_right,
            jaundice_score=result.eye_metrics.jaundice_score,
            jaundice_detected=result.eye_metrics.jaundice_score > 0.3,
            blink_detected=result.eye_metrics.blink_detected,
            blink_rate=analyzer.get_blink_rate()
        )

        # First aid with alerts
        first_aid = FirstAidResponse(
            facial_asymmetry=result.first_aid.facial_asymmetry,
            stroke_risk=result.first_aid.stroke_risk.value,
            stroke_alert=result.first_aid.stroke_risk in [AlertLevel.URGENT, AlertLevel.EMERGENCY],
            pallor_score=result.first_aid.pallor_score,
            pallor_alert=result.first_aid.pallor_score > 0.6,
            cyanosis_detected=result.first_aid.cyanosis_detected,
            cyanosis_alert=result.first_aid.cyanosis_detected,
            respiratory_rate=result.first_aid.respiratory_rate,
            consciousness_indicators=result.first_aid.consciousness_indicators,
            urgent_findings=result.first_aid.urgent_findings
        )

        # Generate anatomy targets and voice guidance
        anatomy_targets = generate_anatomy_targets(eye_metrics, first_aid)
        voice_guidance = generate_voice_guidance(eye_metrics, first_aid, result.warnings)

        return AnalysisResponse(
            success=True,
            face_detected=result.face_detected,
            landmarks=landmarks,
            eye_metrics=eye_metrics,
            first_aid=first_aid,
            quality_score=result.quality_score,
            warnings=result.warnings,
            anatomy_targets=anatomy_targets,
            voice_guidance=voice_guidance
        )

    except HTTPException as e:
        # Re-raise HTTP exceptions (like 400 from image decoding)
        raise e
    except Exception as e:
        # Log full traceback for debugging
        import traceback
        print(f"❌ Analysis exception: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/analyze-batch")
async def analyze_batch(frames: List[AnalysisRequest]):
    """
    Analyze multiple frames (for temporal analysis like blink rate, respiratory rate).

    This endpoint processes a batch of frames to detect patterns over time.
    """
    results = []

    for request in frames:
        try:
            frame = decode_base64_image(request.image_data)
            result = analyzer.analyze(frame)
            results.append({
                "face_detected": result.face_detected,
                "quality": result.quality_score
            })
        except Exception as e:
            results.append({"error": str(e)})

    # Return batch statistics
    return {
        "total_frames": len(frames),
        "faces_detected": sum(1 for r in results if r.get("face_detected", False)),
        "average_quality": np.mean([r.get("quality", 0) for r in results]),
        "blink_rate": analyzer.get_blink_rate()
    }


@app.post("/reset")
async def reset_analyzer():
    """Reset analyzer state (clear history)"""
    global analyzer
    analyzer = FaceMeshAnalyzer()
    return {"message": "Analyzer reset successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
