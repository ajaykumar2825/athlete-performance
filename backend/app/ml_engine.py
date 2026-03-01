import cv2
import mediapipe as mp
import numpy as np
import math


def calculate_injury_risk(joint_angles, movement_consistency):
    if len(joint_angles) < 2 or len(movement_consistency) == 0:
        return 20

    angle_std = np.std(joint_angles)

    instability_score = min(100, angle_std * 3)

    fatigue_score = 100 - (sum(movement_consistency) / len(movement_consistency) * 100)

    injury_risk = (instability_score * 0.6) + (fatigue_score * 0.4)

    return round(float(min(100, injury_risk)), 2)


def process_video(video_path):
    try:

        mp_pose = mp.solutions.pose
        pose = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            return {"error": "Unable to open video file"}

        frame_count = 0
        total_movement = 0
        previous_landmarks = None

        joint_positions = []
        movement_consistency = []

        movement_threshold = 0.02

        while True:
            ret, frame = cap.read()

            if not ret:
                break

            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            results = pose.process(frame_rgb)

            if results.pose_landmarks:

                landmarks = results.pose_landmarks.landmark

                frame_count += 1

                left_hip = np.array([landmarks[23].x, landmarks[23].y, landmarks[23].z])
                right_hip = np.array([landmarks[24].x, landmarks[24].y, landmarks[24].z])
                left_shoulder = np.array([landmarks[11].x, landmarks[11].y, landmarks[11].z])
                right_shoulder = np.array([landmarks[12].x, landmarks[12].y, landmarks[12].z])

                center = (left_hip + right_hip + left_shoulder + right_shoulder) / 4

                left_knee = np.array([landmarks[25].x, landmarks[25].y, landmarks[25].z])
                left_ankle = np.array([landmarks[27].x, landmarks[27].y, landmarks[27].z])
                left_hip_point = np.array([landmarks[23].x, landmarks[23].y, landmarks[23].z])

                v1 = left_hip_point - left_knee
                v2 = left_ankle - left_knee

                cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)

                knee_angle = np.arccos(np.clip(cos_angle, -1, 1)) * 180 / np.pi

                joint_positions.append(knee_angle)

                if previous_landmarks is not None:

                    displacement = np.linalg.norm(center - previous_landmarks)

                    total_movement += displacement

                    if displacement > movement_threshold:
                        movement_consistency.append(1)
                    else:
                        movement_consistency.append(0)

                previous_landmarks = center

        cap.release()
        pose.close()

        if frame_count == 0:
            return {"error": "No pose detected in video"}

        avg_movement_per_frame = total_movement / frame_count

        speed = min(100, avg_movement_per_frame * 500)

        speed = round(float(speed), 2)

        if len(joint_positions) > 1:

            angle_std = np.std(joint_positions)

            accuracy = max(0, min(100, 100 - (angle_std * 1.2)))

        else:

            accuracy = 50

        if len(movement_consistency) > 0:

            active_frames_ratio = sum(movement_consistency) / len(movement_consistency)

            endurance = active_frames_ratio * 100

        else:

            endurance = 50

        accuracy = round(float(accuracy), 2)

        endurance = round(float(endurance), 2)

        injury_risk = calculate_injury_risk(joint_positions, movement_consistency)

        print(
            f"Speed:{speed} Accuracy:{accuracy} Endurance:{endurance} InjuryRisk:{injury_risk}"
        )

        return {
            "speed": speed,
            "accuracy": accuracy,
            "endurance": endurance,
            "injury_risk": injury_risk
        }

    except Exception as e:

        import traceback

        print("Error in process_video:", str(e))

        print(traceback.format_exc())

        return {"error": str(e)}