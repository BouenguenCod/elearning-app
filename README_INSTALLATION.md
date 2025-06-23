# Application E-Learning - Installation et Configuration

## Description
Application complète d'e-learning avec ReactJS et FastAPI, supportant trois types d'utilisateurs : étudiants, formateurs et administrateurs.

## Fonctionnalités Implémentées
- ✅ Authentification multi-rôles (JWT)
- ✅ Gestion des cours (création, modification, publication)
- ✅ Structure hiérarchique : Cours → Sections → Chapitres
- ✅ Chapitres gratuits et payants
- ✅ Interface utilisateur moderne et responsive
- ⚠️ Interface d'édition des sections/chapitres (à compléter)
- ⚠️ Intégration PayPal (configurée, à implémenter)

## Structure du Projet
```
elearning-app/
├── backend/
│   ├── server.py           # API FastAPI
│   ├── requirements.txt    # Dépendances Python
│   └── .env               # Variables d'environnement (à configurer)
├── frontend/
│   ├── src/
│   │   ├── App.js         # Application React principale
│   │   ├── App.css        # Styles personnalisés
│   │   └── index.js       # Point d'entrée
│   ├── public/            # Fichiers statiques
│   ├── package.json       # Dépendances Node.js
│   ├── tailwind.config.js # Configuration Tailwind
│   └── postcss.config.js  # Configuration PostCSS
└── database_backup/       # Sauvegarde MongoDB
```

## Installation

### Prérequis
- Python 3.8+
- Node.js 16+
- MongoDB
- Yarn (recommandé)

### Backend
1. Installer les dépendances Python :
```bash
cd backend/
pip install -r requirements.txt
```

2. Configurer les variables d'environnement dans `.env` :
```env
MONGO_URL=mongodb://localhost:27017/elearning_db
JWT_SECRET_KEY=your_secure_jwt_secret_key_here
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox
```

3. Démarrer le serveur backend :
```bash
python server.py
# ou
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
1. Installer les dépendances Node.js :
```bash
cd frontend/
yarn install
```

2. Configurer les variables d'environnement dans `.env` :
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

3. Démarrer le serveur de développement :
```bash
yarn start
```

### Base de Données
1. Démarrer MongoDB localement

2. Restaurer les données de test (optionnel) :
```bash
mongorestore --uri="mongodb://localhost:27017" database_backup/
```

## Configuration PayPal
1. Créer un compte développeur sur https://developer.paypal.com
2. Créer une application pour obtenir Client ID et Client Secret
3. Mettre à jour les variables dans le fichier `.env` du backend
4. Implémenter l'intégration PayPal dans le frontend (à faire)

## Utilisateurs de Test
La base de données contient des utilisateurs de test :
- **Formateur** : instructor@test.com / Password123!
- **Étudiant** : student@test.com / Password123!
- **Admin** : admin@test.com / Password123!

## API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Informations utilisateur

### Cours (Formateurs)
- `POST /api/courses` - Créer un cours
- `GET /api/courses/my-courses` - Mes cours
- `PUT /api/courses/{id}` - Modifier un cours
- `PUT /api/courses/{id}/publish` - Publier un cours
- `POST /api/courses/{id}/sections` - Créer une section
- `POST /api/courses/{id}/sections/{section_id}/chapters` - Créer un chapitre

### Cours Publics
- `GET /api/courses` - Cours publiés (pour étudiants)

## État des Tests
- **Backend** : 17/17 tests passés ✅
- **Frontend** : Interface de base fonctionnelle ✅
- **À compléter** : Éditeur de sections/chapitres, intégration PayPal

## Développement Futur
1. Compléter l'éditeur de cours (sections/chapitres)
2. Implémenter l'intégration PayPal pour les paiements
3. Ajouter l'intégration Vimeo pour les vidéos
4. Interface d'administration complète
5. Système de suivi des progrès étudiants

## Support
Pour toute question sur l'installation ou le développement, consultez les fichiers de log et les tests automatisés fournis.