from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Athlete, Performance
import os
import uuid
from app.ml_engine import process_video

import sys
print("ROUTES FILE LOADED FROM:", __file__)
print("Python Executable:", sys.executable)


router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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

    if "error" in metrics:
        return metrics

    return {
    "message": "Video processed successfully",
    "speed": metrics["speed"],
    "accuracy": metrics["accuracy"],
    "endurance": metrics["endurance"]
}