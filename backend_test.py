#!/usr/bin/env python3
import requests
import json
import time
import sys
from typing import Dict, Any, List, Optional

# Configuration
BASE_URL = "https://06088b87-e9be-4eb8-9331-42924ce4435d.preview.emergentagent.com/api"
INSTRUCTOR_USER = {
    "username": "instructor_test",
    "email": "instructor@test.com",
    "password": "Password123!",
    "role": "instructor",
    "full_name": "Test Instructor"
}
STUDENT_USER = {
    "username": "student_test",
    "email": "student@test.com",
    "password": "Password123!",
    "role": "student",
    "full_name": "Test Student"
}
ADMIN_USER = {
    "username": "admin_test",
    "email": "admin@test.com",
    "password": "Password123!",
    "role": "admin",
    "full_name": "Test Admin"
}

# Test results tracking
test_results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "tests": []
}

# Helper functions
def log_test(name: str, passed: bool, details: str = ""):
    """Log test results"""
    status = "✅ PASSED" if passed else "❌ FAILED"
    test_results["total"] += 1
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
    
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "details": details
    })
    
    print(f"{status} - {name}")
    if details:
        print(f"  Details: {details}")

def make_request(method: str, endpoint: str, data: Optional[Dict[str, Any]] = None, 
                 token: Optional[str] = None, expected_status: int = 200) -> Dict[str, Any]:
    """Make HTTP request to the API"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method.lower() == "get":
            response = requests.get(url, headers=headers)
        elif method.lower() == "post":
            response = requests.post(url, json=data, headers=headers)
        elif method.lower() == "put":
            response = requests.put(url, json=data, headers=headers)
        elif method.lower() == "delete":
            response = requests.delete(url, headers=headers)
        else:
            return {"error": f"Unsupported method: {method}"}
        
        # Try to parse JSON response
        try:
            result = response.json()
        except json.JSONDecodeError:
            result = {"text": response.text}
        
        # Check status code
        if response.status_code != expected_status:
            return {
                "error": f"Expected status {expected_status}, got {response.status_code}",
                "response": result,
                "status_code": response.status_code
            }
        
        return {"data": result, "status_code": response.status_code}
    
    except requests.RequestException as e:
        return {"error": str(e)}

def register_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Register a new user"""
    return make_request("post", "/auth/register", user_data, expected_status=201)

def login_user(email: str, password: str) -> Dict[str, Any]:
    """Login a user"""
    return make_request("post", "/auth/login", {"email": email, "password": password})

def get_user_info(token: str) -> Dict[str, Any]:
    """Get current user info"""
    return make_request("get", "/auth/me", token=token)

def create_course(token: str, course_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new course"""
    return make_request("post", "/courses", course_data, token, expected_status=201)

def get_instructor_courses(token: str) -> Dict[str, Any]:
    """Get instructor's courses"""
    return make_request("get", "/courses/my-courses", token=token)

def update_course(token: str, course_id: str, course_data: Dict[str, Any]) -> Dict[str, Any]:
    """Update a course"""
    return make_request("put", f"/courses/{course_id}", course_data, token)

def create_section(token: str, course_id: str, section_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a section in a course"""
    return make_request("post", f"/courses/{course_id}/sections", section_data, token, expected_status=201)

def create_chapter(token: str, course_id: str, section_id: str, chapter_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a chapter in a section"""
    return make_request("post", f"/courses/{course_id}/sections/{section_id}/chapters", chapter_data, token, expected_status=201)

def publish_course(token: str, course_id: str) -> Dict[str, Any]:
    """Publish a course"""
    return make_request("put", f"/courses/{course_id}/publish", token=token)

def get_published_courses() -> Dict[str, Any]:
    """Get all published courses"""
    return make_request("get", "/courses")

def create_purchase(token: str, purchase_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a purchase"""
    return make_request("post", "/purchases", purchase_data, token, expected_status=201)

def get_instructor_statistics(token: str) -> Dict[str, Any]:
    """Get instructor statistics"""
    return make_request("get", "/instructor/statistics", token=token)

# Test functions
def test_user_registration():
    """Test user registration with different roles"""
    print("\n=== Testing User Registration ===")
    
    # Test instructor registration
    result = register_user(INSTRUCTOR_USER)
    instructor_success = "error" not in result
    log_test("Register instructor", instructor_success, 
             result.get("error", "Instructor registered successfully"))
    
    # Test student registration
    result = register_user(STUDENT_USER)
    student_success = "error" not in result
    log_test("Register student", student_success, 
             result.get("error", "Student registered successfully"))
    
    # Test admin registration
    result = register_user(ADMIN_USER)
    admin_success = "error" not in result
    log_test("Register admin", admin_success, 
             result.get("error", "Admin registered successfully"))
    
    # Test duplicate registration (should fail)
    result = register_user(INSTRUCTOR_USER)
    duplicate_failed = "error" in result
    log_test("Reject duplicate registration", duplicate_failed, 
             "Registration was rejected as expected" if duplicate_failed else "Failed to reject duplicate registration")
    
    return instructor_success, student_success, admin_success

def test_user_login():
    """Test user login with valid and invalid credentials"""
    print("\n=== Testing User Login ===")
    
    # Test valid login
    result = login_user(INSTRUCTOR_USER["email"], INSTRUCTOR_USER["password"])
    valid_login = "error" not in result
    instructor_token = result.get("data", {}).get("access_token") if valid_login else None
    log_test("Login with valid credentials", valid_login, 
             result.get("error", "Login successful"))
    
    # Test invalid password
    result = login_user(INSTRUCTOR_USER["email"], "wrong_password")
    invalid_password = "error" in result
    log_test("Reject login with invalid password", invalid_password, 
             "Login was rejected as expected" if invalid_password else "Failed to reject invalid password")
    
    # Test non-existent user
    result = login_user("nonexistent@test.com", "password")
    nonexistent_user = "error" in result
    log_test("Reject login for non-existent user", nonexistent_user, 
             "Login was rejected as expected" if nonexistent_user else "Failed to reject non-existent user")
    
    # Get student token for later tests
    student_result = login_user(STUDENT_USER["email"], STUDENT_USER["password"])
    student_token = student_result.get("data", {}).get("access_token") if "error" not in student_result else None
    
    return instructor_token, student_token

def test_user_info(token: str):
    """Test retrieving user information with JWT token"""
    print("\n=== Testing User Info Retrieval ===")
    
    # Test with valid token
    result = get_user_info(token)
    valid_token = "error" not in result
    log_test("Get user info with valid token", valid_token, 
             result.get("error", "User info retrieved successfully"))
    
    # Test with invalid token
    result = get_user_info("invalid_token")
    invalid_token = "error" in result
    log_test("Reject invalid token", invalid_token, 
             "Invalid token was rejected as expected" if invalid_token else "Failed to reject invalid token")
    
    return valid_token

def test_course_creation(token: str):
    """Test course creation by an instructor"""
    print("\n=== Testing Course Creation ===")
    
    course_data = {
        "title": "Test Course with MariaDB",
        "description": "This is a test course for API testing with MariaDB/Sequelize",
        "thumbnail": "https://example.com/thumbnail.jpg",
        "price": 29.99
    }
    
    result = create_course(token, course_data)
    success = "error" not in result
    course_id = result.get("data", {}).get("id") if success else None
    log_test("Create course as instructor", success, 
             result.get("error", "Course created successfully"))
    
    return course_id if success else None

def test_instructor_courses(token: str):
    """Test retrieving instructor's courses"""
    print("\n=== Testing Instructor Courses Retrieval ===")
    
    result = get_instructor_courses(token)
    success = "error" not in result
    courses = result.get("data", []) if success else []
    log_test("Get instructor courses", success, 
             result.get("error", f"Retrieved {len(courses)} courses"))
    
    return success

def test_course_update(token: str, course_id: str):
    """Test updating a course"""
    print("\n=== Testing Course Update ===")
    
    updated_data = {
        "title": "Updated MariaDB Test Course",
        "description": "This course has been updated for testing with MariaDB/Sequelize",
        "thumbnail": "https://example.com/new-thumbnail.jpg",
        "price": 39.99
    }
    
    result = update_course(token, course_id, updated_data)
    success = "error" not in result
    log_test("Update course", success, 
             result.get("error", "Course updated successfully"))
    
    return success

def test_section_creation(token: str, course_id: str):
    """Test creating a section in a course"""
    print("\n=== Testing Section Creation ===")
    
    section_data = {
        "title": "Test Section with MariaDB",
        "description": "This is a test section for API testing with MariaDB/Sequelize"
    }
    
    result = create_section(token, course_id, section_data)
    success = "error" not in result
    section_id = result.get("data", {}).get("id") if success else None
    log_test("Create section", success, 
             result.get("error", "Section created successfully"))
    
    return section_id if success else None

def test_chapter_creation(token: str, course_id: str, section_id: str):
    """Test creating chapters in a section"""
    print("\n=== Testing Chapter Creation ===")
    
    # Create free chapter
    free_chapter_data = {
        "title": "Free Test Chapter with MariaDB",
        "description": "This is a free test chapter with MariaDB/Sequelize",
        "video_url": "https://example.com/video1.mp4",
        "chapter_type": "free"
    }
    
    result = create_chapter(token, course_id, section_id, free_chapter_data)
    free_success = "error" not in result
    free_chapter_id = result.get("data", {}).get("id") if free_success else None
    log_test("Create free chapter", free_success, 
             result.get("error", "Free chapter created successfully"))
    
    # Create paid chapter
    paid_chapter_data = {
        "title": "Paid Test Chapter with MariaDB",
        "description": "This is a paid test chapter with MariaDB/Sequelize",
        "video_url": "https://example.com/video2.mp4",
        "chapter_type": "paid",
        "price": 9.99
    }
    
    result = create_chapter(token, course_id, section_id, paid_chapter_data)
    paid_success = "error" not in result
    paid_chapter_id = result.get("data", {}).get("id") if paid_success else None
    log_test("Create paid chapter", paid_success, 
             result.get("error", "Paid chapter created successfully"))
    
    return (free_success and paid_success, free_chapter_id, paid_chapter_id)

def test_course_publication(token: str, course_id: str):
    """Test publishing a course"""
    print("\n=== Testing Course Publication ===")
    
    result = publish_course(token, course_id)
    success = "error" not in result
    log_test("Publish course", success, 
             result.get("error", "Course published successfully"))
    
    return success

def test_public_courses():
    """Test retrieving published courses"""
    print("\n=== Testing Public Courses API ===")
    
    result = get_published_courses()
    success = "error" not in result
    courses = result.get("data", []) if success else []
    log_test("Get published courses", success, 
             result.get("error", f"Retrieved {len(courses)} published courses"))
    
    return success

def test_purchases(student_token: str, course_id: str, chapter_id: str):
    """Test creating purchases"""
    print("\n=== Testing Purchases ===")
    
    # Purchase a course
    course_purchase_data = {
        "item_type": "course",
        "item_id": course_id,
        "amount": 39.99
    }
    
    result = create_purchase(student_token, course_purchase_data)
    course_purchase_success = "error" not in result
    log_test("Purchase course", course_purchase_success, 
             result.get("error", "Course purchased successfully"))
    
    # Purchase a chapter
    chapter_purchase_data = {
        "item_type": "chapter",
        "item_id": chapter_id,
        "amount": 9.99
    }
    
    result = create_purchase(student_token, chapter_purchase_data)
    chapter_purchase_success = "error" not in result
    log_test("Purchase chapter", chapter_purchase_success, 
             result.get("error", "Chapter purchased successfully"))
    
    return course_purchase_success and chapter_purchase_success

def test_instructor_statistics(token: str):
    """Test instructor statistics"""
    print("\n=== Testing Instructor Statistics ===")
    
    result = get_instructor_statistics(token)
    success = "error" not in result
    
    if success:
        stats = result.get("data", {})
        total_revenue = stats.get("totalRevenue", 0)
        total_sales = stats.get("totalSales", 0)
        chart_data = stats.get("chartData", [])
        top_items = stats.get("topItems", [])
        recent_purchases = stats.get("recentPurchases", [])
        
        details = (
            f"Total Revenue: {total_revenue}, "
            f"Total Sales: {total_sales}, "
            f"Chart Data Points: {len(chart_data)}, "
            f"Top Items: {len(top_items)}, "
            f"Recent Purchases: {len(recent_purchases)}"
        )
    else:
        details = result.get("error", "Unknown error")
    
    log_test("Get instructor statistics", success, details)
    
    return success

def run_all_tests():
    """Run all tests in sequence"""
    print("\n🔍 STARTING E-LEARNING BACKEND API TESTS (MariaDB/Sequelize) 🔍\n")
    
    # Test user registration
    instructor_reg, student_reg, admin_reg = test_user_registration()
    
    # If registration failed, try logging in with existing accounts
    if not instructor_reg or not student_reg:
        print("Registration failed for some users, trying to login with existing accounts...")
    
    # Test user login
    instructor_token, student_token = test_user_login()
    
    if not instructor_token:
        print("❌ Cannot proceed with instructor tests without instructor token")
        return
    
    if not student_token:
        print("❌ Cannot proceed with student purchase tests without student token")
        # Continue with other tests
    
    # Test user info retrieval
    user_info_success = test_user_info(instructor_token)
    
    # Test course creation
    course_id = test_course_creation(instructor_token)
    
    if not course_id:
        print("❌ Cannot proceed with course modification tests without course ID")
        return
    
    # Test instructor courses retrieval
    instructor_courses_success = test_instructor_courses(instructor_token)
    
    # Test course update
    course_update_success = test_course_update(instructor_token, course_id)
    
    # Test section creation
    section_id = test_section_creation(instructor_token, course_id)
    
    if not section_id:
        print("❌ Cannot proceed with chapter tests without section ID")
        return
    
    # Test chapter creation
    chapter_creation_success, free_chapter_id, paid_chapter_id = test_chapter_creation(instructor_token, course_id, section_id)
    
    # Test course publication
    publication_success = test_course_publication(instructor_token, course_id)
    
    # Test public courses API
    public_courses_success = test_public_courses()
    
    # Test purchases (new in MariaDB version)
    purchases_success = False
    if student_token and paid_chapter_id:
        purchases_success = test_purchases(student_token, course_id, paid_chapter_id)
    
    # Test instructor statistics (new in MariaDB version)
    statistics_success = False
    if purchases_success:
        # Wait a moment for purchases to be processed
        time.sleep(1)
        statistics_success = test_instructor_statistics(instructor_token)
    
    # Print summary
    print("\n=== TEST SUMMARY ===")
    print(f"Total tests: {test_results['total']}")
    print(f"Passed: {test_results['passed']}")
    print(f"Failed: {test_results['failed']}")
    print(f"Success rate: {(test_results['passed'] / test_results['total']) * 100:.2f}%")
    
    if test_results['failed'] == 0:
        print("\n✅ ALL TESTS PASSED! The Node.js/Express backend with MariaDB/Sequelize is working correctly.")
    else:
        print("\n❌ SOME TESTS FAILED. Please check the details above.")

if __name__ == "__main__":
    run_all_tests()