from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sklearn import metrics
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Athlete, Performance, ImportantDate, Message
import os
import uuid
from app.ml_engine import process_video
from datetime import datetime
from typing import List
from pydantic import BaseModel

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Pydantic models for request/response
class PerformanceResponse(BaseModel):
    id: int
    athlete_id: int
    speed: float
    accuracy: float
    endurance: float
    practice_date: str
    created_at: str
    
    class Config:
        orm_mode = True

class BestWorstResponse(BaseModel):
    best: dict
    worst: dict

# Existing endpoints...

@router.post("/analysis/{athlete_id}")
async def upload_video(
    athlete_id: int,
    file: UploadFile = File(...),
    practice_date: str = None,  # Add practice date parameter
    db: Session = Depends(get_db)
):
    
    athlete = db.query(Athlete).filter(Athlete.id == athlete_id).first()
    if not athlete:
        return {"error": "Athlete not found"}

    filename = f"{UPLOAD_DIR}/{uuid.uuid4()}_{file.filename}"

    with open(filename, "wb") as buffer:
        buffer.write(await file.read())

    # Process video to get metrics
    metrics = process_video(filename)
    
    if "error" in metrics:
        return metrics

    # Create performance record with metrics
    performance = Performance(
    athlete_id=athlete_id,
    file_path=filename,
    speed=metrics.get("speed", 0),
    accuracy=metrics.get("accuracy", 0),
    endurance=metrics.get("endurance", 0),
    injury_risk=metrics.get("injury_risk", 0),
        practice_date=practice_date or datetime.now().strftime("%Y-%m-%d"),
        created_at=datetime.now()
    )

    db.add(performance)
    db.commit()
    db.refresh(performance)

    response_data = {
    "message": "Video processed successfully",
    "speed": performance.speed,
    "accuracy": performance.accuracy,
    "endurance": performance.endurance,
    "injury_risk": performance.injury_risk,
    "practice_date": performance.practice_date,
    "id": performance.id
}
    
    print("SENDING RESPONSE:", response_data)
    
    return response_data

@router.post("/athletes/")
def create_athlete(full_name: str, sport: str, db: Session = Depends(get_db)):
    athlete = Athlete(full_name=full_name, sport=sport)
    db.add(athlete)
    db.commit()
    db.refresh(athlete)
    return athlete

@router.get("/athletes/")
def get_athletes(db: Session = Depends(get_db)):
    return db.query(Athlete).all()

@router.delete("/athletes/{athlete_id}")
def delete_athlete(athlete_id: int, db: Session = Depends(get_db)):
    athlete = db.query(Athlete).filter(Athlete.id == athlete_id).first()
    if not athlete:
        return {"error": "Athlete not found"}

    db.delete(athlete)
    db.commit()
    return {"message": "Athlete deleted"}

# NEW: Get performance history for an athlete
@router.get("/performance/history/{athlete_id}", response_model=List[PerformanceResponse])
def get_performance_history(
    athlete_id: int, 
    metric: str = "accuracy",  # Optional: filter by metric
    db: Session = Depends(get_db)
):
    performances = db.query(Performance).filter(
        Performance.athlete_id == athlete_id
    ).order_by(Performance.practice_date).all()
    
    return performances

# NEW: Get best and worst performance for an athlete
@router.get("/performance/bestworst/{athlete_id}")
def get_best_worst_performance(athlete_id: int, db: Session = Depends(get_db)):
    performances = db.query(Performance).filter(
        Performance.athlete_id == athlete_id
    ).all()
    
    if not performances:
        return {"best": None, "worst": None}
    
    # Find best and worst by accuracy (can be customized)
    best = max(performances, key=lambda p: p.accuracy)
    worst = min(performances, key=lambda p: p.accuracy)
    
    return {
        "best": {
            "id": best.id,
            "date": best.practice_date,
            "speed": best.speed,
            "accuracy": best.accuracy,
            "endurance": best.endurance,
            "metric": "accuracy"
        },
        "worst": {
            "id": worst.id,
            "date": worst.practice_date,
            "speed": worst.speed,
            "accuracy": worst.accuracy,
            "endurance": worst.endurance,
            "metric": "accuracy"
        }
    }

# NEW: Get performance chart data
@router.get("/performance/chart/{athlete_id}")
def get_performance_chart_data(
    athlete_id: int, 
    metric: str = "accuracy",
    db: Session = Depends(get_db)
):
    performances = db.query(Performance).filter(
        Performance.athlete_id == athlete_id
    ).order_by(Performance.practice_date).all()
    
    return {
        "labels": [p.practice_date for p in performances],
        "values": [getattr(p, metric) for p in performances],
        "metric": metric
    }

# NEW: Delete a performance session
@router.delete("/performance/{performance_id}")
def delete_performance(performance_id: int, db: Session = Depends(get_db)):
    performance = db.query(Performance).filter(Performance.id == performance_id).first()
    if not performance:
        return {"error": "Performance not found"}
    
    # Delete the video file
    try:
        if os.path.exists(performance.file_path):
            os.remove(performance.file_path)
    except:
        pass
    
    db.delete(performance)
    db.commit()
    return {"message": "Performance deleted"}

# Keep your existing endpoints for messages and dates...
@router.post("/messages/{athlete_id}")
def create_message(athlete_id: int, payload: dict, db: Session = Depends(get_db)):
    message = Message(
        athlete_id=athlete_id,
        text=payload["text"],
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M")
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

@router.get("/messages/{athlete_id}")
def get_messages(athlete_id: int, db: Session = Depends(get_db)):
    return db.query(Message).filter(Message.athlete_id == athlete_id).all()

@router.post("/dates/{athlete_id}")
def create_date(athlete_id: int, payload: dict, db: Session = Depends(get_db)):
    new_date = ImportantDate(
        athlete_id=athlete_id,
        event_date=payload["event_date"],
        description=payload["description"]
    )
    db.add(new_date)
    db.commit()
    db.refresh(new_date)
    return new_date

@router.get("/dates/{athlete_id}")
def get_dates(athlete_id: int, db: Session = Depends(get_db)):
    return db.query(ImportantDate).filter(ImportantDate.athlete_id == athlete_id).all()

@router.delete("/messages/{message_id}")
def delete_message(message_id: int, db: Session = Depends(get_db)):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        return {"error": "Message not found"}
    db.delete(message)
    db.commit()
    return {"message": "Message deleted"}

@router.delete("/dates/{date_id}")
def delete_date(date_id: int, db: Session = Depends(get_db)):
    date = db.query(ImportantDate).filter(ImportantDate.id == date_id).first()
    if not date:
        return {"error": "Date not found"}
    db.delete(date)
    db.commit()
    return {"message": "Date deleted"}