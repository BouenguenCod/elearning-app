const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import des modèles et configuration DB
const { testConnection } = require('./config/database');
const { User, Course, Section, Chapter, Purchase, sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(cors());
app.use(express.json());

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'your-secret-key-change-this';
const JWT_EXPIRATION = '24h';

// Middleware pour l'authentification
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ detail: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ 
      where: { email: decoded.email, is_active: true },
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({ detail: 'User not found or inactive' });
    }

    req.user = user.toJSON();
    next();
  } catch (error) {
    return res.status(401).json({ detail: 'Invalid token' });
  }
};

// Middleware pour les rôles
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ detail: 'Insufficient permissions' });
    }
    next();
  };
};

// Fonctions utilitaires
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const generateToken = (userData) => {
  return jwt.sign({ email: userData.email }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
};

// =====================================================
// ROUTES D'AUTHENTIFICATION
// =====================================================

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

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ detail: 'Email already registered' });
      }
      return res.status(400).json({ detail: 'Username already taken' });
    }

    // Créer l'utilisateur
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      role,
      full_name,
      is_active: true
    });

    // Générer le token
    const token = generateToken({ email });

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      access_token: token,
      token_type: 'bearer',
      user: userResponse
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

    // Trouver l'utilisateur
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ detail: 'Incorrect email or password' });
    }

    // Vérifier le mot de passe
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ detail: 'Incorrect email or password' });
    }

    // Vérifier si l'utilisateur est actif
    if (!user.is_active) {
      return res.status(401).json({ detail: 'Account is deactivated' });
    }

    // Générer le token
    const token = generateToken({ email });

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      access_token: token,
      token_type: 'bearer',
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// =====================================================
// ROUTES DES COURS
// =====================================================

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

    const course = await Course.create({
      id: uuidv4(),
      title,
      description,
      instructor_id: req.user.id,
      instructor_name: req.user.full_name || req.user.username,
      thumbnail,
      price,
      is_published: false
    });

    // Inclure les sections pour la réponse
    const courseWithSections = await Course.findByPk(course.id, {
      include: [
        {
          model: Section,
          as: 'sections',
          include: [
            {
              model: Chapter,
              as: 'chapters',
              order: [['order_index', 'ASC']]
            }
          ],
          order: [['order_index', 'ASC']]
        }
      ]
    });

    res.status(201).json(courseWithSections);
  } catch (error) {
    console.error('Course creation error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.get('/api/courses/my-courses', authenticateToken, requireRole(['instructor']), async (req, res) => {
  try {
    const courses = await Course.findAll({
      where: { instructor_id: req.user.id },
      include: [
        {
          model: Section,
          as: 'sections',
          include: [
            {
              model: Chapter,
              as: 'chapters',
              order: [['order_index', 'ASC']]
            }
          ],
          order: [['order_index', 'ASC']]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(courses);
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.get('/api/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findOne({
      where: { id: req.params.courseId },
      include: [
        {
          model: Section,
          as: 'sections',
          include: [
            {
              model: Chapter,
              as: 'chapters',
              order: [['order_index', 'ASC']]
            }
          ],
          order: [['order_index', 'ASC']]
        }
      ]
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    // Vérifier les permissions
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

    const [updated] = await Course.update(
      { title, description, thumbnail, price },
      {
        where: { 
          id: req.params.courseId, 
          instructor_id: req.user.id 
        }
      }
    );

    if (!updated) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    const course = await Course.findOne({
      where: { id: req.params.courseId },
      include: [
        {
          model: Section,
          as: 'sections',
          include: [
            {
              model: Chapter,
              as: 'chapters',
              order: [['order_index', 'ASC']]
            }
          ],
          order: [['order_index', 'ASC']]
        }
      ]
    });

    res.json(course);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// =====================================================
// ROUTES DES SECTIONS
// =====================================================

app.post('/api/courses/:courseId/sections', authenticateToken, requireRole(['instructor']), [
  body('title').notEmpty().withMessage('Section title is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ detail: errors.array()[0].msg });
    }

    const { title, description } = req.body;

    // Vérifier que le cours appartient à l'instructeur
    const course = await Course.findOne({
      where: { id: req.params.courseId, instructor_id: req.user.id }
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    // Obtenir l'ordre suivant
    const sectionCount = await Section.count({
      where: { course_id: req.params.courseId }
    });

    const section = await Section.create({
      id: uuidv4(),
      course_id: req.params.courseId,
      title,
      description,
      order_index: sectionCount
    });

    res.status(201).json(section);
  } catch (error) {
    console.error('Create section error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// =====================================================
// ROUTES DES CHAPITRES
// =====================================================

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

    // Vérifier que le cours appartient à l'instructeur
    const course = await Course.findOne({
      where: { id: req.params.courseId, instructor_id: req.user.id }
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    // Vérifier que la section existe
    const section = await Section.findOne({
      where: { id: req.params.sectionId, course_id: req.params.courseId }
    });

    if (!section) {
      return res.status(404).json({ detail: 'Section not found' });
    }

    // Obtenir l'ordre suivant
    const chapterCount = await Chapter.count({
      where: { section_id: req.params.sectionId }
    });

    const chapter = await Chapter.create({
      id: uuidv4(),
      section_id: req.params.sectionId,
      course_id: req.params.courseId,
      title,
      description,
      video_url,
      chapter_type,
      price: chapter_type === 'paid' ? price : null,
      order_index: chapterCount
    });

    res.status(201).json(chapter);
  } catch (error) {
    console.error('Create chapter error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// =====================================================
// PUBLICATION DES COURS
// =====================================================

app.put('/api/courses/:courseId/publish', authenticateToken, requireRole(['instructor']), async (req, res) => {
  try {
    const [updated] = await Course.update(
      { is_published: true },
      {
        where: { 
          id: req.params.courseId, 
          instructor_id: req.user.id 
        }
      }
    );

    if (!updated) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    res.json({ message: 'Course published successfully' });
  } catch (error) {
    console.error('Publish course error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// =====================================================
// ROUTES PUBLIQUES DES COURS
// =====================================================

app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.findAll({
      where: { is_published: true },
      include: [
        {
          model: Section,
          as: 'sections',
          include: [
            {
              model: Chapter,
              as: 'chapters',
              order: [['order_index', 'ASC']]
            }
          ],
          order: [['order_index', 'ASC']]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(courses);
  } catch (error) {
    console.error('Get published courses error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// =====================================================
// ROUTES DES STATISTIQUES DE VENTES
// =====================================================

// Simuler un achat
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
      course = await Course.findOne({ where: { id: item_id } });
      if (!course) {
        return res.status(404).json({ detail: 'Course not found' });
      }
      item_title = course.title;
      instructor_id = course.instructor_id;
      instructor_name = course.instructor_name;
    } else {
      chapter = await Chapter.findOne({
        where: { id: item_id },
        include: [{ model: Course, as: 'course' }]
      });

      if (!chapter) {
        return res.status(404).json({ detail: 'Chapter not found' });
      }

      course = chapter.course;
      item_title = chapter.title;
      instructor_id = course.instructor_id;
      instructor_name = course.instructor_name;
    }

    const purchase = await Purchase.create({
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

    res.status(201).json(purchase);
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Statistiques de l'instructeur
app.get('/api/instructor/statistics', authenticateToken, requireRole(['instructor']), async (req, res) => {
  try {
    const instructorId = req.user.id;

    // Obtenir tous les achats pour cet instructeur
    const purchases = await Purchase.findAll({
      where: { 
        instructor_id: instructorId,
        payment_status: 'completed'
      },
      order: [['purchased_at', 'DESC']]
    });

    // Calculer les statistiques
    const totalRevenue = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.amount), 0);
    const totalSales = purchases.length;

    // Grouper par mois pour les graphiques
    const monthlyStats = {};
    purchases.forEach(purchase => {
      const month = moment(purchase.purchased_at).format('YYYY-MM');
      if (!monthlyStats[month]) {
        monthlyStats[month] = { revenue: 0, sales: 0 };
      }
      monthlyStats[month].revenue += parseFloat(purchase.amount);
      monthlyStats[month].sales += 1;
    });

    // Convertir en tableau pour le frontend
    const chartData = Object.keys(monthlyStats)
      .sort()
      .slice(-12) // 12 derniers mois
      .map(month => ({
        month: moment(month).format('MMM YYYY'),
        revenue: monthlyStats[month].revenue,
        sales: monthlyStats[month].sales
      }));

    // Top des ventes
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
      itemStats[key].revenue += parseFloat(purchase.amount);
    });

    const topItems = Object.values(itemStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Achats récents
    const recentPurchases = purchases
      .slice(0, 10)
      .map(purchase => ({
        id: purchase.id,
        student_name: purchase.student_name,
        item_title: purchase.item_title,
        item_type: purchase.item_type,
        amount: parseFloat(purchase.amount),
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

// Initialisation de la base de données et démarrage du serveur
const initializeApp = async () => {
  try {
    // Test de la connexion à la base de données
    await testConnection();
    
    // Synchronisation des modèles (création des tables si nécessaire)
    await sequelize.sync({ alter: true });
    console.log('✅ Modèles synchronisés avec MariaDB');
    
    // Démarrage du serveur
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur Node.js/Express démarré sur http://0.0.0.0:${PORT}`);
      console.log(`📊 Base de données: MariaDB`);
      console.log(`🔧 ORM: Sequelize`);
    });
  } catch (error) {
    console.error('❌ Erreur d\'initialisation:', error);
    process.exit(1);
  }
};

// Démarrer l'application
initializeApp();