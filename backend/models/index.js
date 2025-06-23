const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// =====================================================
// MODÈLE USER
// =====================================================
const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('student', 'instructor', 'admin'),
    defaultValue: 'student'
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// =====================================================
// MODÈLE COURSE
// =====================================================
const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  instructor_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  instructor_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  thumbnail: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'courses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// =====================================================
// MODÈLE SECTION
// =====================================================
const Section = sequelize.define('Section', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  course_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: Course,
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  order_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'sections',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// =====================================================
// MODÈLE CHAPTER
// =====================================================
const Chapter = sequelize.define('Chapter', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  section_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: Section,
      key: 'id'
    }
  },
  course_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: Course,
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  video_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  chapter_type: {
    type: DataTypes.ENUM('free', 'paid'),
    defaultValue: 'free'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  order_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'chapters',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// =====================================================
// MODÈLE PURCHASE
// =====================================================
const Purchase = sequelize.define('Purchase', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  student_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  student_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  student_email: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  course_id: {
    type: DataTypes.STRING(36),
    allowNull: true,
    references: {
      model: Course,
      key: 'id'
    }
  },
  chapter_id: {
    type: DataTypes.STRING(36),
    allowNull: true,
    references: {
      model: Chapter,
      key: 'id'
    }
  },
  item_type: {
    type: DataTypes.ENUM('course', 'chapter'),
    allowNull: false
  },
  item_title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  instructor_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  instructor_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'completed'
  },
  payment_method: {
    type: DataTypes.STRING(50),
    defaultValue: 'paypal'
  },
  transaction_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  purchased_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'purchases',
  timestamps: false
});

// =====================================================
// ASSOCIATIONS
// =====================================================

// User associations
User.hasMany(Course, { foreignKey: 'instructor_id', as: 'courses' });
User.hasMany(Purchase, { foreignKey: 'student_id', as: 'purchases' });
User.hasMany(Purchase, { foreignKey: 'instructor_id', as: 'sales' });

// Course associations
Course.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });
Course.hasMany(Section, { foreignKey: 'course_id', as: 'sections' });
Course.hasMany(Chapter, { foreignKey: 'course_id', as: 'chapters' });
Course.hasMany(Purchase, { foreignKey: 'course_id', as: 'purchases' });

// Section associations
Section.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Section.hasMany(Chapter, { foreignKey: 'section_id', as: 'chapters' });

// Chapter associations
Chapter.belongsTo(Section, { foreignKey: 'section_id', as: 'section' });
Chapter.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Chapter.hasMany(Purchase, { foreignKey: 'chapter_id', as: 'purchases' });

// Purchase associations
Purchase.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
Purchase.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });
Purchase.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Purchase.belongsTo(Chapter, { foreignKey: 'chapter_id', as: 'chapter' });

module.exports = {
  User,
  Course,
  Section,
  Chapter,
  Purchase,
  sequelize
};