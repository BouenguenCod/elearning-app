const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuration de la base de données
const sequelize = new Sequelize(
  process.env.DB_NAME || 'elearning_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mariadb',
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timezone: '+00:00'
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: false
    }
  }
);

// Test de la connexion
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion MariaDB établie avec succès');
  } catch (error) {
    console.error('❌ Erreur de connexion MariaDB:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };