from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient
from typing import Optional, List
import os
from datetime import datetime, timedelta
import jwt
import bcrypt
import uuid
from enum import Enum

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/elearning_db')
client = MongoClient(MONGO_URL)
db = client.elearning_db

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-this')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"

class ChapterType(str, Enum):
    FREE = "free"
    PAID = "paid"

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: UserRole = UserRole.STUDENT
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    id: str
    username: str
    email: str
    role: UserRole
    full_name: Optional[str] = None
    created_at: datetime
    is_active: bool = True

class Chapter(BaseModel):
    id: str
    title: str
    description: str
    video_url: Optional[str] = None
    chapter_type: ChapterType = ChapterType.FREE
    price: Optional[float] = None
    order: int
    created_at: datetime

class Section(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    chapters: List[Chapter] = []
    order: int
    created_at: datetime

class Course(BaseModel):
    id: str
    title: str
    description: str
    instructor_id: str
    instructor_name: str
    sections: List[Section] = []
    thumbnail: Optional[str] = None
    price: Optional[float] = None
    is_published: bool = False
    created_at: datetime
    updated_at: datetime

class CourseCreate(BaseModel):
    title: str
    description: str
    thumbnail: Optional[str] = None
    price: Optional[float] = None

class SectionCreate(BaseModel):
    title: str
    description: Optional[str] = None

class ChapterCreate(BaseModel):
    title: str
    description: str
    video_url: Optional[str] = None
    chapter_type: ChapterType = ChapterType.FREE
    price: Optional[float] = None

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = db.users.find_one({"email": email})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            role=user["role"],
            full_name=user.get("full_name"),
            created_at=user["created_at"],
            is_active=user.get("is_active", True)
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def require_role(allowed_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

# Auth Routes
@app.post("/api/auth/register")
async def register(user_data: UserCreate):
    # Check if user already exists
    if db.users.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if db.users.find_one({"username": user_data.username}):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "password": hashed_password,
        "role": user_data.role,
        "full_name": user_data.full_name,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    db.users.insert_one(user_doc)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_data.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": User(**user_doc)
    }

@app.post("/api/auth/login")
async def login(login_data: UserLogin):
    user = db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    # Create access token
    access_token = create_access_token(data={"sub": login_data.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": User(**user)
    }

@app.get("/api/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Course Routes (Instructor only)
@app.post("/api/courses")
async def create_course(
    course_data: CourseCreate,
    current_user: User = Depends(require_role([UserRole.INSTRUCTOR]))
):
    course_id = str(uuid.uuid4())
    course_doc = {
        "id": course_id,
        "title": course_data.title,
        "description": course_data.description,
        "instructor_id": current_user.id,
        "instructor_name": current_user.full_name or current_user.username,
        "sections": [],
        "thumbnail": course_data.thumbnail,
        "price": course_data.price,
        "is_published": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    db.courses.insert_one(course_doc)
    return Course(**course_doc)

@app.get("/api/courses/my-courses")
async def get_my_courses(
    current_user: User = Depends(require_role([UserRole.INSTRUCTOR]))
):
    courses = list(db.courses.find({"instructor_id": current_user.id}))
    return [Course(**course) for course in courses]

@app.get("/api/courses/{course_id}")
async def get_course(
    course_id: str,
    current_user: User = Depends(get_current_user)
):
    course = db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check permissions
    if current_user.role == UserRole.INSTRUCTOR and course["instructor_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this course")
    
    return Course(**course)

@app.put("/api/courses/{course_id}")
async def update_course(
    course_id: str,
    course_data: CourseCreate,
    current_user: User = Depends(require_role([UserRole.INSTRUCTOR]))
):
    course = db.courses.find_one({"id": course_id, "instructor_id": current_user.id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    db.courses.update_one(
        {"id": course_id},
        {"$set": {
            "title": course_data.title,
            "description": course_data.description,
            "thumbnail": course_data.thumbnail,
            "price": course_data.price,
            "updated_at": datetime.utcnow()
        }}
    )
    
    updated_course = db.courses.find_one({"id": course_id})
    return Course(**updated_course)

@app.post("/api/courses/{course_id}/sections")
async def create_section(
    course_id: str,
    section_data: SectionCreate,
    current_user: User = Depends(require_role([UserRole.INSTRUCTOR]))
):
    course = db.courses.find_one({"id": course_id, "instructor_id": current_user.id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    section_id = str(uuid.uuid4())
    section = {
        "id": section_id,
        "title": section_data.title,
        "description": section_data.description,
        "chapters": [],
        "order": len(course.get("sections", [])),
        "created_at": datetime.utcnow()
    }
    
    db.courses.update_one(
        {"id": course_id},
        {"$push": {"sections": section}, "$set": {"updated_at": datetime.utcnow()}}
    )
    
    return Section(**section)

@app.post("/api/courses/{course_id}/sections/{section_id}/chapters")
async def create_chapter(
    course_id: str,
    section_id: str,
    chapter_data: ChapterCreate,
    current_user: User = Depends(require_role([UserRole.INSTRUCTOR]))
):
    course = db.courses.find_one({"id": course_id, "instructor_id": current_user.id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Find the section
    section_index = None
    for i, section in enumerate(course.get("sections", [])):
        if section["id"] == section_id:
            section_index = i
            break
    
    if section_index is None:
        raise HTTPException(status_code=404, detail="Section not found")
    
    chapter_id = str(uuid.uuid4())
    chapter = {
        "id": chapter_id,
        "title": chapter_data.title,
        "description": chapter_data.description,
        "video_url": chapter_data.video_url,
        "chapter_type": chapter_data.chapter_type,
        "price": chapter_data.price if chapter_data.chapter_type == ChapterType.PAID else None,
        "order": len(course["sections"][section_index].get("chapters", [])),
        "created_at": datetime.utcnow()
    }
    
    db.courses.update_one(
        {"id": course_id, f"sections.{section_index}.id": section_id},
        {
            "$push": {f"sections.{section_index}.chapters": chapter},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return Chapter(**chapter)

@app.put("/api/courses/{course_id}/publish")
async def publish_course(
    course_id: str,
    current_user: User = Depends(require_role([UserRole.INSTRUCTOR]))
):
    course = db.courses.find_one({"id": course_id, "instructor_id": current_user.id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    db.courses.update_one(
        {"id": course_id},
        {"$set": {"is_published": True, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Course published successfully"}

# Public course routes for students
@app.get("/api/courses")
async def get_published_courses():
    courses = list(db.courses.find({"is_published": True}))
    return [Course(**course) for course in courses]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)