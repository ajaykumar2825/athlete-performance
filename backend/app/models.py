from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.database import Base
from sqlalchemy.orm import relationship

class Athlete(Base):
    __tablename__ = "athletes"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    sport = Column(String, nullable=False)
    
    # Relationships
    performances = relationship("Performance", back_populates="athlete")
    messages = relationship("Message", back_populates="athlete")
    dates = relationship("ImportantDate", back_populates="athlete")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athletes.id"))
    text = Column(String, nullable=False)
    timestamp = Column(String, nullable=False)
    
    # Relationship
    athlete = relationship("Athlete", back_populates="messages")


class ImportantDate(Base):
    __tablename__ = "important_dates"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athletes.id"))
    event_date = Column(String, nullable=False)
    description = Column(String, nullable=False)
    
    # Relationship
    athlete = relationship("Athlete", back_populates="dates")

injury_risk = Column(Float, nullable=True)

class Performance(Base):
    __tablename__ = "performances"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athletes.id"))
    file_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    speed = Column(Float, nullable=True)
    accuracy = Column(Float, nullable=True)
    endurance = Column(Float, nullable=True)
    injury_risk = Column(Float, nullable=True)

    practice_date = Column(String, nullable=True)

    athlete = relationship("Athlete", back_populates="performances")