"""
Face Mesh Analyzer with Eye Health & First Aid Assessment
Uses MediaPipe Face Mesh for comprehensive facial analysis
"""

import cv2
import numpy as np
import mediapipe as mp
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class AlertLevel(Enum):
    NORMAL = "normal"
    WARNING = "warning"
    URGENT = "urgent"
    EMERGENCY = "emergency"


@dataclass
class EyeMetrics:
    """Eye health metrics"""
    pupil_diameter_left: float
    pupil_diameter_right: float
    pupil_asymmetry: float
    sclera_redness_left: float
    sclera_redness_right: float
    jaundice_score: float
    blink_detected: bool


@dataclass
class FirstAidAssessment:
    """First aid critical assessment"""
    facial_asymmetry: float
    stroke_risk: AlertLevel
    pallor_score: float  # Indicates blood loss/shock
    cyanosis_detected: bool  # Blue lips (hypoxia)
    respiratory_rate: Optional[float]
    consciousness_indicators: Dict[str, bool]
    urgent_findings: List[str]


@dataclass
class FaceMeshData:
    """Complete face mesh analysis"""
    landmarks: List[Tuple[float, float, float]]  # 478 3D points
    eye_metrics: EyeMetrics
    first_aid: FirstAidAssessment
    face_detected: bool
    quality_score: float
    warnings: List[str]


class FaceMeshAnalyzer:
    """
    Comprehensive face analysis using MediaPipe Face Mesh.
    Provides eye health metrics and first aid assessment.
    """

    # MediaPipe landmark indices
    LEFT_IRIS = [474, 475, 476, 477]
    RIGHT_IRIS = [469, 470, 471, 472]
    LEFT_EYE_OUTER = [33, 133]
    RIGHT_EYE_OUTER = [362, 263]
    LEFT_SCLERA_REGION = [33, 7, 163, 144, 145, 153, 154, 155, 133]
    RIGHT_SCLERA_REGION = [362, 249, 390, 373, 374, 380, 381, 382, 263]
    FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
                 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
                 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]

    # Facial symmetry points
    LEFT_CHEEK = [50, 205, 36]
    RIGHT_CHEEK = [280, 425, 266]
    LEFT_MOUTH = [61, 76, 62]
    RIGHT_MOUTH = [291, 306, 292]

    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,  # Includes iris landmarks
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        # History for temporal analysis
        self.blink_history = []
        self.pupil_history = []
        self.frame_count = 0

    def analyze(self, frame: np.ndarray) -> FaceMeshData:
        """
        Analyze a single frame for face mesh, eyes, and first aid indicators.

        Args:
            frame: BGR image from webcam

        Returns:
            FaceMeshData with all analysis results
        """
        self.frame_count += 1

        # Convert BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)

        if not results.multi_face_landmarks:
            return self._empty_result()

        # Get first face landmarks
        face_landmarks = results.multi_face_landmarks[0]
        h, w, _ = frame.shape

        # Convert normalized landmarks to pixel coordinates
        landmarks_3d = self._extract_landmarks(face_landmarks, w, h)

        # Analyze eyes
        eye_metrics = self._analyze_eyes(frame, landmarks_3d, face_landmarks)

        # First aid assessment
        first_aid = self._assess_first_aid(frame, landmarks_3d, eye_metrics)

        # Quality score
        quality = self._calculate_quality(frame, landmarks_3d)

        # Generate warnings
        warnings = self._generate_warnings(eye_metrics, first_aid, quality)

        return FaceMeshData(
            landmarks=landmarks_3d,
            eye_metrics=eye_metrics,
            first_aid=first_aid,
            face_detected=True,
            quality_score=quality,
            warnings=warnings
        )

    def _extract_landmarks(self, face_landmarks, w: int, h: int) -> List[Tuple[float, float, float]]:
        """Extract 3D landmarks in pixel coordinates"""
        landmarks = []
        for landmark in face_landmarks.landmark:
            landmarks.append((
                landmark.x * w,
                landmark.y * h,
                landmark.z * w  # Depth
            ))
        return landmarks

    def _analyze_eyes(self, frame: np.ndarray, landmarks: List,
                     face_landmarks) -> EyeMetrics:
        """Comprehensive eye analysis"""

        # Pupil diameter from iris landmarks
        left_pupil = self._calculate_pupil_diameter(landmarks, self.LEFT_IRIS, self.LEFT_EYE_OUTER)
        right_pupil = self._calculate_pupil_diameter(landmarks, self.RIGHT_IRIS, self.RIGHT_EYE_OUTER)

        # Pupil asymmetry (neurological indicator)
        asymmetry = abs(left_pupil - right_pupil)

        # Sclera (eye white) analysis
        left_redness = self._analyze_sclera_redness(frame, landmarks, self.LEFT_SCLERA_REGION)
        right_redness = self._analyze_sclera_redness(frame, landmarks, self.RIGHT_SCLERA_REGION)

        # Jaundice detection (yellow sclera)
        jaundice = self._detect_jaundice(frame, landmarks, self.LEFT_SCLERA_REGION, self.RIGHT_SCLERA_REGION)

        # Blink detection
        blink = self._detect_blink(landmarks)
        self.blink_history.append(blink)
        if len(self.blink_history) > 900:  # 30 sec at 30 FPS
            self.blink_history.pop(0)

        return EyeMetrics(
            pupil_diameter_left=left_pupil,
            pupil_diameter_right=right_pupil,
            pupil_asymmetry=asymmetry,
            sclera_redness_left=left_redness,
            sclera_redness_right=right_redness,
            jaundice_score=jaundice,
            blink_detected=blink
        )

    def _calculate_pupil_diameter(self, landmarks: List, iris_indices: List,
                                  eye_outer: List) -> float:
        """Calculate pupil diameter in mm (estimated)"""
        # Get iris center
        iris_points = [landmarks[i] for i in iris_indices]
        iris_center = np.mean(iris_points, axis=0)

        # Iris diameter in pixels
        iris_left = landmarks[iris_indices[0]]
        iris_right = landmarks[iris_indices[2]]
        iris_diameter_px = np.linalg.norm(np.array(iris_left[:2]) - np.array(iris_right[:2]))

        # Human iris is ~11.7mm average, use for calibration
        # Pupil is typically 2-8mm depending on light
        iris_mm = 11.7
        px_to_mm = iris_mm / iris_diameter_px if iris_diameter_px > 0 else 0.1

        # Estimate pupil as 60% of iris (rough estimate)
        pupil_diameter_mm = iris_diameter_px * px_to_mm * 0.6

        return round(pupil_diameter_mm, 2)

    def _analyze_sclera_redness(self, frame: np.ndarray, landmarks: List,
                                sclera_indices: List) -> float:
        """Analyze redness of eye whites (0-1 scale)"""
        # Extract sclera region
        points = np.array([[int(landmarks[i][0]), int(landmarks[i][1])]
                          for i in sclera_indices], dtype=np.int32)

        # Create mask
        mask = np.zeros(frame.shape[:2], dtype=np.uint8)
        cv2.fillPoly(mask, [points], 255)

        # Get sclera pixels
        sclera_pixels = cv2.bitwise_and(frame, frame, mask=mask)
        sclera_pixels = sclera_pixels[mask > 0]

        if len(sclera_pixels) == 0:
            return 0.0

        # Analyze redness (red channel dominance)
        b, g, r = cv2.split(sclera_pixels.reshape(-1, 3))

        # Redness score: high R, low G/B
        redness = (np.mean(r) - np.mean(g)) / 255.0
        redness = max(0.0, min(1.0, redness))

        return round(redness, 3)

    def _detect_jaundice(self, frame: np.ndarray, landmarks: List,
                        left_sclera: List, right_sclera: List) -> float:
        """Detect jaundice (yellow sclera) - liver disease indicator"""
        # Get sclera regions
        left_points = np.array([[int(landmarks[i][0]), int(landmarks[i][1])]
                               for i in left_sclera], dtype=np.int32)
        right_points = np.array([[int(landmarks[i][0]), int(landmarks[i][1])]
                                for i in right_sclera], dtype=np.int32)

        # Create masks
        mask = np.zeros(frame.shape[:2], dtype=np.uint8)
        cv2.fillPoly(mask, [left_points, right_points], 255)

        # Get sclera pixels
        sclera_pixels = cv2.bitwise_and(frame, frame, mask=mask)
        sclera_pixels = sclera_pixels[mask > 0]

        if len(sclera_pixels) == 0:
            return 0.0

        # Convert to LAB color space (better for yellow detection)
        sclera_lab = cv2.cvtColor(sclera_pixels.reshape(-1, 1, 3), cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(sclera_lab)

        # Jaundice: high L (lightness), positive b (yellow)
        # Normal sclera: b near 0, jaundice: b > 10
        yellowness = np.mean(b)

        # Normalize to 0-1 scale (b typically -128 to 127)
        jaundice_score = max(0.0, (yellowness - 5) / 20.0)
        jaundice_score = min(1.0, jaundice_score)

        return round(jaundice_score, 3)

    def _detect_blink(self, landmarks: List) -> bool:
        """Detect if eyes are blinking (closed)"""
        # Eye aspect ratio (EAR) method
        # Left eye
        left_top = landmarks[159][1]
        left_bottom = landmarks[145][1]
        left_height = abs(left_top - left_bottom)

        # Right eye
        right_top = landmarks[386][1]
        right_bottom = landmarks[374][1]
        right_height = abs(right_top - right_bottom)

        # Average eye opening
        avg_height = (left_height + right_height) / 2

        # Threshold for blink (very small opening)
        return avg_height < 5.0  # pixels

    def _assess_first_aid(self, frame: np.ndarray, landmarks: List,
                         eye_metrics: EyeMetrics) -> FirstAidAssessment:
        """Critical first aid assessment - FAST protocol, shock, respiratory"""

        # 1. FACIAL ASYMMETRY (Stroke - FAST protocol)
        asymmetry = self._calculate_facial_asymmetry(landmarks)

        # Stroke risk assessment
        stroke_risk = AlertLevel.NORMAL
        if asymmetry > 0.15 or eye_metrics.pupil_asymmetry > 1.5:
            stroke_risk = AlertLevel.EMERGENCY  # Immediate medical attention
        elif asymmetry > 0.08:
            stroke_risk = AlertLevel.URGENT

        # 2. PALLOR (Blood loss, shock, anemia)
        pallor = self._detect_pallor(frame, landmarks)

        # 3. CYANOSIS (Blue lips - hypoxia, respiratory failure)
        cyanosis = self._detect_cyanosis(frame, landmarks)

        # 4. RESPIRATORY RATE (from facial motion)
        respiratory_rate = self._estimate_respiratory_rate(landmarks)

        # 5. CONSCIOUSNESS INDICATORS
        consciousness = {
            'eyes_open': not eye_metrics.blink_detected,
            'face_tracking': True,  # If we detect face, they're responsive
            'blink_response': len(self.blink_history) > 0 and sum(self.blink_history) > 0
        }

        # 6. URGENT FINDINGS
        urgent = []
        if stroke_risk in [AlertLevel.EMERGENCY, AlertLevel.URGENT]:
            urgent.append("⚠️ FACIAL ASYMMETRY - Possible stroke - Call 911")
        if eye_metrics.pupil_asymmetry > 1.5:
            urgent.append("⚠️ UNEQUAL PUPILS - Neurological emergency")
        if cyanosis:
            urgent.append("⚠️ CYANOSIS (Blue lips) - Low oxygen - Seek immediate care")
        if pallor > 0.7:
            urgent.append("⚠️ SEVERE PALLOR - Possible shock/blood loss")
        if eye_metrics.jaundice_score > 0.5:
            urgent.append("⚠️ JAUNDICE - Liver concern - See doctor")

        return FirstAidAssessment(
            facial_asymmetry=asymmetry,
            stroke_risk=stroke_risk,
            pallor_score=pallor,
            cyanosis_detected=cyanosis,
            respiratory_rate=respiratory_rate,
            consciousness_indicators=consciousness,
            urgent_findings=urgent
        )

    def _calculate_facial_asymmetry(self, landmarks: List) -> float:
        """
        Calculate facial asymmetry (stroke indicator).
        Compares left and right sides of face.
        """
        # Compare left and right cheek positions
        left_cheek = np.mean([landmarks[i][:2] for i in self.LEFT_CHEEK], axis=0)
        right_cheek = np.mean([landmarks[i][:2] for i in self.RIGHT_CHEEK], axis=0)

        # Compare left and right mouth corners
        left_mouth = np.mean([landmarks[i][:2] for i in self.LEFT_MOUTH], axis=0)
        right_mouth = np.mean([landmarks[i][:2] for i in self.RIGHT_MOUTH], axis=0)

        # Get face center
        nose_tip = landmarks[4][:2]

        # Calculate distances from center
        left_dist = np.linalg.norm(left_cheek - nose_tip) + np.linalg.norm(left_mouth - nose_tip)
        right_dist = np.linalg.norm(right_cheek - nose_tip) + np.linalg.norm(right_mouth - nose_tip)

        # Asymmetry ratio
        asymmetry = abs(left_dist - right_dist) / max(left_dist, right_dist)

        return round(asymmetry, 3)

    def _detect_pallor(self, frame: np.ndarray, landmarks: List) -> float:
        """
        Detect pallor (paleness) - indicates blood loss, shock, anemia.
        Analyzes face color.
        """
        # Get face region
        points = np.array([[int(landmarks[i][0]), int(landmarks[i][1])]
                          for i in self.FACE_OVAL], dtype=np.int32)
        mask = np.zeros(frame.shape[:2], dtype=np.uint8)
        cv2.fillPoly(mask, [points], 255)

        face_pixels = cv2.bitwise_and(frame, frame, mask=mask)
        face_pixels = face_pixels[mask > 0]

        if len(face_pixels) == 0:
            return 0.0

        # Convert to LAB
        face_lab = cv2.cvtColor(face_pixels.reshape(-1, 1, 3), cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(face_lab)

        # Pallor: low a (red channel in LAB), high L (lightness)
        # Normal skin: a > 10, pallor: a < 5
        redness_lab = np.mean(a)

        # Pallor score (0-1, higher = more pale)
        pallor = max(0.0, (10 - redness_lab) / 10.0)
        pallor = min(1.0, pallor)

        return round(pallor, 3)

    def _detect_cyanosis(self, frame: np.ndarray, landmarks: List) -> bool:
        """
        Detect cyanosis (blue lips) - indicates hypoxia, respiratory/cardiac failure.
        """
        # Lip landmarks (upper and lower)
        upper_lip = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291]
        lower_lip = [146, 91, 181, 84, 17, 314, 405, 321, 375, 291]

        # Get lip region
        lip_points = np.array([[int(landmarks[i][0]), int(landmarks[i][1])]
                              for i in upper_lip + lower_lip], dtype=np.int32)
        mask = np.zeros(frame.shape[:2], dtype=np.uint8)
        cv2.fillPoly(mask, [lip_points], 255)

        lip_pixels = cv2.bitwise_and(frame, frame, mask=mask)
        lip_pixels = lip_pixels[mask > 0]

        if len(lip_pixels) == 0:
            return False

        # Analyze blue channel dominance
        b, g, r = cv2.split(lip_pixels.reshape(-1, 3))

        # Cyanosis: blue > red
        blue_dominance = np.mean(b) - np.mean(r)

        # Threshold for cyanosis
        return blue_dominance > 30  # Significant blue tint

    def _estimate_respiratory_rate(self, landmarks: List) -> Optional[float]:
        """Estimate respiratory rate from subtle facial motion (future enhancement)"""
        # This requires temporal analysis over 30-60 seconds
        # Placeholder for now
        return None

    def _calculate_quality(self, frame: np.ndarray, landmarks: List) -> float:
        """Calculate quality score (lighting, distance, stability)"""
        # Lighting quality (not too dark, not overexposed)
        brightness = np.mean(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
        lighting_score = 1.0 - abs(brightness - 127) / 127.0

        # Face size (not too close, not too far)
        face_width = max(landmarks, key=lambda x: x[0])[0] - min(landmarks, key=lambda x: x[0])[0]
        optimal_width = frame.shape[1] * 0.4  # 40% of frame width
        size_score = 1.0 - abs(face_width - optimal_width) / optimal_width
        size_score = max(0.0, min(1.0, size_score))

        # Overall quality
        quality = (lighting_score + size_score) / 2.0

        return round(quality, 2)

    def _generate_warnings(self, eye_metrics: EyeMetrics,
                          first_aid: FirstAidAssessment,
                          quality: float) -> List[str]:
        """Generate user warnings based on analysis"""
        warnings = []

        if quality < 0.5:
            warnings.append("Poor image quality - adjust lighting and distance")

        if eye_metrics.sclera_redness_left > 0.5 or eye_metrics.sclera_redness_right > 0.5:
            warnings.append("Eye redness detected - may indicate fatigue or irritation")

        if eye_metrics.pupil_asymmetry > 0.8 and eye_metrics.pupil_asymmetry < 1.5:
            warnings.append("Pupil size difference noted - monitor if persistent")

        return warnings

    def _empty_result(self) -> FaceMeshData:
        """Return empty result when no face detected"""
        return FaceMeshData(
            landmarks=[],
            eye_metrics=EyeMetrics(0, 0, 0, 0, 0, 0, False),
            first_aid=FirstAidAssessment(
                0, AlertLevel.NORMAL, 0, False, None,
                {'eyes_open': False, 'face_tracking': False, 'blink_response': False},
                []
            ),
            face_detected=False,
            quality_score=0.0,
            warnings=["No face detected"]
        )

    def get_blink_rate(self) -> float:
        """Calculate blinks per minute from history"""
        if len(self.blink_history) < 30:
            return 0.0

        # Count blinks (transitions from False to True)
        blinks = sum(1 for i in range(1, len(self.blink_history))
                    if self.blink_history[i] and not self.blink_history[i-1])

        # Convert to per minute (assuming 30 FPS)
        duration_sec = len(self.blink_history) / 30.0
        blinks_per_min = (blinks / duration_sec) * 60.0

        return round(blinks_per_min, 1)
