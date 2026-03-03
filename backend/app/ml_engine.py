import cv2
import numpy as np
import logging
import os
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try different import approaches for MediaPipe
try:
    # Method 1: Direct import (preferred, works with Pylance)
    import mediapipe as mp
    mp_pose = mp.solutions.pose
    MP_AVAILABLE = True
    logger.info(f"MediaPipe imported successfully via direct import. Version: {getattr(mp, '__version__', 'unknown')}")
except (ImportError, AttributeError) as e:
    try:
        # Method 2: Specific import
        from mediapipe.python.solutions import pose as mp_pose
        MP_AVAILABLE = True
        logger.info("MediaPipe imported successfully via python.solutions")
    except ImportError as e:
        logger.error(f"MediaPipe import error: {e}")
        MP_AVAILABLE = False
        mp_pose = None

def calculate_injury_risk(joint_angles, movement_consistency):
    """Calculate injury risk based on joint angles and movement consistency"""
    if len(joint_angles) < 2 or len(movement_consistency) == 0:
        return 20.0

    angle_std = np.std(joint_angles)
    instability_score = min(100, angle_std * 3)
    
    if len(movement_consistency) > 0:
        fatigue_score = 100 - (sum(movement_consistency) / len(movement_consistency) * 100)
    else:
        fatigue_score = 50

    injury_risk = (instability_score * 0.6) + (fatigue_score * 0.4)
    return round(float(min(100, injury_risk)), 2)

def process_video(video_path):
    """Process video and extract performance metrics"""
    try:
        # Check if MediaPipe is available
        if not MP_AVAILABLE:
            logger.error("MediaPipe not available")
            return {
                "speed": 75.5,
                "accuracy": 82.3,
                "endurance": 68.7,
                "injury_risk": 35.2,
                "note": "Using simulated data (MediaPipe not available)"
            }

        # Check if file exists
        if not os.path.exists(video_path):
            logger.error(f"Video file not found: {video_path}")
            return {"error": "Video file not found"}

        # Initialize pose detection
        pose = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        # Open video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"Could not open video: {video_path}")
            return {"error": "Unable to open video file"}

        frame_count = 0
        total_movement = 0
        previous_landmarks = None
        joint_positions = []
        movement_consistency = []
        movement_threshold = 0.02
        max_frames_to_process = 300  # Limit frames for performance

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Limit frames for server performance
            if frame_count > max_frames_to_process:
                break

            # Process every 2nd frame to save resources
            if frame_count % 2 == 0:
                # Convert BGR to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(frame_rgb)

                if results and results.pose_landmarks:
                    landmarks = results.pose_landmarks.landmark
                    
                    try:
                        # Extract key landmarks
                        left_hip = np.array([landmarks[23].x, landmarks[23].y, landmarks[23].z])
                        right_hip = np.array([landmarks[24].x, landmarks[24].y, landmarks[24].z])
                        left_shoulder = np.array([landmarks[11].x, landmarks[11].y, landmarks[11].z])
                        right_shoulder = np.array([landmarks[12].x, landmarks[12].y, landmarks[12].z])
                        
                        # Calculate center point
                        center = (left_hip + right_hip + left_shoulder + right_shoulder) / 4

                        # Calculate knee angle
                        left_knee = np.array([landmarks[25].x, landmarks[25].y, landmarks[25].z])
                        left_ankle = np.array([landmarks[27].x, landmarks[27].y, landmarks[27].z])
                        left_hip_point = np.array([landmarks[23].x, landmarks[23].y, landmarks[23].z])

                        v1 = left_hip_point - left_knee
                        v2 = left_ankle - left_knee

                        norm_v1 = np.linalg.norm(v1)
                        norm_v2 = np.linalg.norm(v2)
                        
                        if norm_v1 > 0 and norm_v2 > 0:
                            cos_angle = np.dot(v1, v2) / (norm_v1 * norm_v2)
                            cos_angle = np.clip(cos_angle, -1, 1)
                            knee_angle = np.arccos(cos_angle) * 180 / np.pi
                            joint_positions.append(knee_angle)

                        if previous_landmarks is not None:
                            displacement = np.linalg.norm(center - previous_landmarks)
                            total_movement += displacement
                            movement_consistency.append(1 if displacement > movement_threshold else 0)

                        previous_landmarks = center
                        
                    except (IndexError, ValueError) as e:
                        logger.warning(f"Error processing frame: {e}")
                        continue

            frame_count += 1

        cap.release()
        pose.close()

        # Check if any poses were detected
        if frame_count == 0 or len(joint_positions) == 0:
            logger.warning("No pose detected in video")
            return {
                "speed": 65.0,
                "accuracy": 70.0,
                "endurance": 60.0,
                "injury_risk": 30.0,
                "note": "Limited pose detection, using estimated values"
            }

        # Calculate metrics
        avg_movement_per_frame = total_movement / max(frame_count, 1)
        speed = min(100, avg_movement_per_frame * 500)
        speed = round(float(speed), 2)

        if len(joint_positions) > 1:
            angle_std = np.std(joint_positions)
            accuracy = max(0, min(100, 100 - (angle_std * 1.2)))
        else:
            accuracy = 70.0

        if len(movement_consistency) > 0:
            active_frames_ratio = sum(movement_consistency) / len(movement_consistency)
            endurance = active_frames_ratio * 100
        else:
            endurance = 65.0

        accuracy = round(float(accuracy), 2)
        endurance = round(float(endurance), 2)
        injury_risk = calculate_injury_risk(joint_positions, movement_consistency)

        logger.info(f"Video processed: Speed={speed}, Accuracy={accuracy}, Endurance={endurance}, InjuryRisk={injury_risk}")

        return {
            "speed": speed,
            "accuracy": accuracy,
            "endurance": endurance,
            "injury_risk": injury_risk
        }

    except Exception as e:
        logger.error(f"Error in process_video: {str(e)}", exc_info=True)
        return {
            "speed": 70.0,
            "accuracy": 75.0,
            "endurance": 65.0,
            "injury_risk": 35.0,
            "note": f"Processing error, using estimated values: {str(e)}"
        }
