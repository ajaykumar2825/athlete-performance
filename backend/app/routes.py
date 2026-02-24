from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Athlete, Performance, ImportantDate, Message
import os
import uuid
from app.ml_engine import process_video
from datetime import datetime

import sys
print("ROUTES FILE LOADED FROM:", __file__)
print("Python Executable:", sys.executable)


router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/athletes/")
def create_athlete(full_name: str, sport: str, db: Session = Depends(get_db)):
    athlete = Athlete(full_name=full_name, sport=sport)
    db.add(athlete)
    db.commit()
    db.refresh(athlete)
    return athlete


@router.get("/athletes/")
def list_athletes(db: Session = Depends(get_db)):
    return db.query(Athlete).all()

@router.delete("/athletes/{athlete_id}")
def delete_athlete(athlete_id: int, db: Session = Depends(get_db)):
    athlete = db.query(Athlete).filter(Athlete.id == athlete_id).first()
    if not athlete:
        return {"error": "Athlete not found"}
    db.delete(athlete)
    db.commit()
    return {"message": "Athlete deleted"}

@router.post("/analysis/{athlete_id}")
async def upload_video(
    athlete_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    athlete = db.query(Athlete).filter(Athlete.id == athlete_id).first()
    if not athlete:
        return {"error": "Athlete not found"}

    filename = f"{UPLOAD_DIR}/{uuid.uuid4()}_{file.filename}"

    with open(filename, "wb") as buffer:
        buffer.write(await file.read())

    performance = Performance(
        athlete_id=athlete_id,
        file_path=filename
    )

    db.add(performance)
    db.commit()
    db.refresh(performance)

    metrics = process_video(filename)
    print("🔍 BEFORE CHECK - metrics:", metrics)
    if "error" in metrics:
        return metrics

    print("="*50)
    print("METRICS FROM PROCESS_VIDEO:", metrics)
    print("TYPE:", type(metrics))
    print("="*50)

    if "error" in metrics:
        return metrics

    response_data = {
        "message": "Video processed successfully",
        "speed": metrics.get("speed", 0),
        "accuracy": metrics.get("accuracy", 0),
        "endurance": metrics.get("endurance", 0)
    }
    
    print("SENDING RESPONSE:", response_data)
    
    return response_data

@router.post("/messages/{athlete_id}")
def create_message(athlete_id: int, payload: dict, db: Session = Depends(get_db)):
    message = Message(
        athlete_id=athlete_id,
        text=payload["text"],
        timestamp=str(datetime.now())
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