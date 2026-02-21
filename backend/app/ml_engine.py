import cv2
import mediapipe as mp
import numpy as np


def process_video(video_path):
    try:
        # Initialize MediaPipe Pose
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
        motion_score = 0
        previous_center = None

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(frame_rgb)

            if results.pose_landmarks:
                landmarks = results.pose_landmarks.landmark

                # Use hips as body center reference
                left_hip = landmarks[23]
                right_hip = landmarks[24]

                center = np.array([
                    (left_hip.x + right_hip.x) / 2,
                    (left_hip.y + right_hip.y) / 2
                ])

                if previous_center is not None:
                    displacement = np.linalg.norm(center - previous_center)
                    motion_score += displacement

                previous_center = center
                frame_count += 1

        cap.release()
        pose.close()

        if frame_count == 0:
            return {"error": "No pose detected in video"}

        # Basic computed metrics (Phase 1 logic)
        speed = (motion_score / frame_count) * 100
        endurance = min(frame_count, 100)
        accuracy = max(0, 100 - abs(50 - endurance))

        return {
            "speed": round(float(speed), 2),
            "accuracy": round(float(accuracy), 2),
            "endurance": round(float(endurance), 2)
        }

    except Exception as e:
        return {"error": str(e)}
