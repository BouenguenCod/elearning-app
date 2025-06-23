const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/elearning_db';
mongoose.connect(MONGO_URL)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'your-secret-key-change-this';
const JWT_EXPIRATION = '24h';

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, default: uuidv4 },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'instructor', 'admin'], default: 'student' },
  full_name: { type: String },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

// Course Schema
const courseSchema = new mongoose.Schema({
  id: { type: String, unique: true, default: uuidv4 },
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructor_id: { type: String, required: true },
  instructor_name: { type: String, required: true },
  sections: [{
    id: { type: String, default: uuidv4 },
    title: { type: String, required: true },
    description: String,
    chapters: [{
      id: { type: String, default: uuidv4 },
      title: { type: String, required: true },
      description: { type: String, required: true },
      video_url: String,
      chapter_type: { type: String, enum: ['free', 'paid'], default: 'free' },
      price: Number,
      order: { type: Number, default: 0 },
      created_at: { type: Date, default: Date.now }
    }],
    order: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
  }],
  thumbnail: String,
  price: Number,
  is_published: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Purchase Schema (New)
const purchaseSchema = new mongoose.Schema({
  id: { type: String, unique: true, default: uuidv4 },
  student_id: { type: String, required: true },
  student_name: { type: String, required: true },
  student_email: { type: String, required: true },
  course_id: String,
  chapter_id: String,
  item_type: { type: String, enum: ['course', 'chapter'], required: true },
  item_title: { type: String, required: true },
  instructor_id: { type: String, required: true },
  instructor_name: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  payment_status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'completed' },
  payment_method: { type: String, default: 'paypal' },
  transaction_id: String,
  purchased_at: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);
const Purchase = mongoose.model('Purchase', purchaseSchema);

// Middleware for authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ detail: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ detail: 'Invalid token' });
    }

    try {
      const user = await User.findOne({ email: decoded.email });
      if (!user || !user.is_active) {
        return res.status(401).json({ detail: 'User not found or inactive' });
      }

      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        created_at: user.created_at,
        is_active: user.is_active
      };
      next();
    } catch (error) {
      return res.status(401).json({ detail: 'Authentication error' });
    }
  });
};

// Middleware for role-based access
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ detail: 'Insufficient permissions' });
    }
    next();
  };
};

// Helper functions
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const generateToken = (userData) => {
  return jwt.sign({ email: userData.email }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
};

// Auth Routes
app.post('/api/auth/register', [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['student', 'instructor', 'admin']).optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ detail: errors.array()[0].msg });
    }

    const { username, email, password, role = 'student', full_name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ detail: 'Email already registered' });
      }
      return res.status(400).json({ detail: 'Username already taken' });
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = new User({
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      role,
      full_name,
      is_active: true,
      created_at: new Date()
    });

    await user.save();

    // Generate token
    const token = generateToken({ email });

    res.status(201).json({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        created_at: user.created_at,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.post('/api/auth/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ detail: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ detail: 'Incorrect email or password' });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ detail: 'Incorrect email or password' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ detail: 'Account is deactivated' });
    }

    // Generate token
    const token = generateToken({ email });

    res.json({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        created_at: user.created_at,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// Course Routes (Instructor only)
app.post('/api/courses', authenticateToken, requireRole(['instructor']), [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ detail: errors.array()[0].msg });
    }

    const { title, description, thumbnail, price } = req.body;

    const course = new Course({
      id: uuidv4(),
      title,
      description,
      instructor_id: req.user.id,
      instructor_name: req.user.full_name || req.user.username,
      sections: [],
      thumbnail,
      price,
      is_published: false,
      created_at: new Date(),
      updated_at: new Date()
    });

    await course.save();
    res.status(201).json(course);
  } catch (error) {
    console.error('Course creation error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.get('/api/courses/my-courses', authenticateToken, requireRole(['instructor']), async (req, res) => {
  try {
    const courses = await Course.find({ instructor_id: req.user.id });
    res.json(courses);
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.get('/api/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findOne({ id: req.params.courseId });
    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    // Check permissions
    if (req.user.role === 'instructor' && course.instructor_id !== req.user.id) {
      return res.status(403).json({ detail: 'Not authorized to view this course' });
    }

    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.put('/api/courses/:courseId', authenticateToken, requireRole(['instructor']), [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ detail: errors.array()[0].msg });
    }

    const { title, description, thumbnail, price } = req.body;

    const course = await Course.findOneAndUpdate(
      { id: req.params.courseId, instructor_id: req.user.id },
      {
        title,
        description,
        thumbnail,
        price,
        updated_at: new Date()
      },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Section Routes
app.post('/api/courses/:courseId/sections', authenticateToken, requireRole(['instructor']), [
  body('title').notEmpty().withMessage('Section title is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ detail: errors.array()[0].msg });
    }

    const { title, description } = req.body;
    const course = await Course.findOne({ id: req.params.courseId, instructor_id: req.user.id });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    const newSection = {
      id: uuidv4(),
      title,
      description,
      chapters: [],
      order: course.sections.length,
      created_at: new Date()
    };

    course.sections.push(newSection);
    course.updated_at = new Date();
    await course.save();

    res.status(201).json(newSection);
  } catch (error) {
    console.error('Create section error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Chapter Routes
app.post('/api/courses/:courseId/sections/:sectionId/chapters', authenticateToken, requireRole(['instructor']), [
  body('title').notEmpty().withMessage('Chapter title is required'),
  body('description').notEmpty().withMessage('Chapter description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ detail: errors.array()[0].msg });
    }

    const { title, description, video_url, chapter_type = 'free', price } = req.body;
    const course = await Course.findOne({ id: req.params.courseId, instructor_id: req.user.id });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    const section = course.sections.find(s => s.id === req.params.sectionId);
    if (!section) {
      return res.status(404).json({ detail: 'Section not found' });
    }

    const newChapter = {
      id: uuidv4(),
      title,
      description,
      video_url,
      chapter_type,
      price: chapter_type === 'paid' ? price : null,
      order: section.chapters.length,
      created_at: new Date()
    };

    section.chapters.push(newChapter);
    course.updated_at = new Date();
    await course.save();

    res.status(201).json(newChapter);
  } catch (error) {
    console.error('Create chapter error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Publish Course
app.put('/api/courses/:courseId/publish', authenticateToken, requireRole(['instructor']), async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { id: req.params.courseId, instructor_id: req.user.id },
      { is_published: true, updated_at: new Date() },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    res.json({ message: 'Course published successfully' });
  } catch (error) {
    console.error('Publish course error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Public course routes
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find({ is_published: true });
    res.json(courses);
  } catch (error) {
    console.error('Get published courses error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// ========== NEW SALES STATISTICS ROUTES ==========

// Simulate a purchase (for testing - in real app this would be handled by PayPal webhook)
app.post('/api/purchases', authenticateToken, requireRole(['student']), [
  body('item_type').isIn(['course', 'chapter']).withMessage('Invalid item type'),
  body('item_id').notEmpty().withMessage('Item ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ detail: errors.array()[0].msg });
    }

    const { item_type, item_id, amount } = req.body;
    let course, chapter, item_title, instructor_id, instructor_name;

    if (item_type === 'course') {
      course = await Course.findOne({ id: item_id });
      if (!course) {
        return res.status(404).json({ detail: 'Course not found' });
      }
      item_title = course.title;
      instructor_id = course.instructor_id;
      instructor_name = course.instructor_name;
    } else {
      // Find chapter in all courses
      const courses = await Course.find({});
      for (let c of courses) {
        for (let section of c.sections) {
          chapter = section.chapters.find(ch => ch.id === item_id);
          if (chapter) {
            course = c;
            break;
          }
        }
        if (chapter) break;
      }

      if (!chapter || !course) {
        return res.status(404).json({ detail: 'Chapter not found' });
      }

      item_title = chapter.title;
      instructor_id = course.instructor_id;
      instructor_name = course.instructor_name;
    }

    const purchase = new Purchase({
      id: uuidv4(),
      student_id: req.user.id,
      student_name: req.user.full_name || req.user.username,
      student_email: req.user.email,
      course_id: item_type === 'course' ? item_id : course.id,
      chapter_id: item_type === 'chapter' ? item_id : null,
      item_type,
      item_title,
      instructor_id,
      instructor_name,
      amount,
      currency: 'EUR',
      payment_status: 'completed',
      payment_method: 'paypal',
      transaction_id: `txn_${uuidv4()}`,
      purchased_at: new Date()
    });

    await purchase.save();
    res.status(201).json(purchase);
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Get instructor sales statistics
app.get('/api/instructor/statistics', authenticateToken, requireRole(['instructor']), async (req, res) => {
  try {
    const instructorId = req.user.id;

    // Get all purchases for this instructor
    const purchases = await Purchase.find({ 
      instructor_id: instructorId,
      payment_status: 'completed'
    });

    // Calculate statistics
    const totalRevenue = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const totalSales = purchases.length;

    // Group by month for chart data
    const monthlyStats = {};
    purchases.forEach(purchase => {
      const month = moment(purchase.purchased_at).format('YYYY-MM');
      if (!monthlyStats[month]) {
        monthlyStats[month] = { revenue: 0, sales: 0 };
      }
      monthlyStats[month].revenue += purchase.amount;
      monthlyStats[month].sales += 1;
    });

    // Convert to array for frontend
    const chartData = Object.keys(monthlyStats)
      .sort()
      .slice(-12) // Last 12 months
      .map(month => ({
        month: moment(month).format('MMM YYYY'),
        revenue: monthlyStats[month].revenue,
        sales: monthlyStats[month].sales
      }));

    // Top selling items
    const itemStats = {};
    purchases.forEach(purchase => {
      const key = `${purchase.item_type}_${purchase.item_title}`;
      if (!itemStats[key]) {
        itemStats[key] = {
          title: purchase.item_title,
          type: purchase.item_type,
          sales: 0,
          revenue: 0
        };
      }
      itemStats[key].sales += 1;
      itemStats[key].revenue += purchase.amount;
    });

    const topItems = Object.values(itemStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Recent purchases
    const recentPurchases = purchases
      .sort((a, b) => new Date(b.purchased_at) - new Date(a.purchased_at))
      .slice(0, 10)
      .map(purchase => ({
        id: purchase.id,
        student_name: purchase.student_name,
        item_title: purchase.item_title,
        item_type: purchase.item_type,
        amount: purchase.amount,
        purchased_at: purchase.purchased_at
      }));

    res.json({
      totalRevenue,
      totalSales,
      chartData,
      topItems,
      recentPurchases
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Get detailed course statistics
app.get('/api/instructor/courses/:courseId/statistics', authenticateToken, requireRole(['instructor']), async (req, res) => {
  try {
    const course = await Course.findOne({ 
      id: req.params.courseId, 
      instructor_id: req.user.id 
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    // Get purchases for this course
    const coursePurchases = await Purchase.find({ 
      course_id: req.params.courseId,
      payment_status: 'completed'
    });

    const totalRevenue = coursePurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const totalSales = coursePurchases.length;

    // Chapter statistics
    const chapterStats = {};
    coursePurchases.forEach(purchase => {
      if (purchase.item_type === 'chapter' && purchase.chapter_id) {
        if (!chapterStats[purchase.chapter_id]) {
          chapterStats[purchase.chapter_id] = {
            title: purchase.item_title,
            sales: 0,
            revenue: 0
          };
        }
        chapterStats[purchase.chapter_id].sales += 1;
        chapterStats[purchase.chapter_id].revenue += purchase.amount;
      }
    });

    const chapterStatsList = Object.keys(chapterStats).map(chapterId => ({
      chapterId,
      ...chapterStats[chapterId]
    }));

    res.json({
      course: {
        id: course.id,
        title: course.title,
        totalRevenue,
        totalSales,
        chapterStats: chapterStatsList
      }
    });
  } catch (error) {
    console.error('Get course statistics error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});