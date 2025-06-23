import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('token', data.access_token);
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.detail };
      }
    } catch (error) {
      return { success: false, error: 'Erreur de connexion' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('token', data.access_token);
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.detail };
      }
    } catch (error) {
      return { success: false, error: 'Erreur d\'inscription' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    apiUrl
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const LoginForm = ({ onToggle }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Connexion</h1>
          <p className="text-gray-600">Accédez à votre plateforme e-learning</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="votre@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={onToggle}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Pas de compte ? S'inscrire
          </button>
        </div>
      </div>
    </div>
  );
};

// Register Component
const RegisterForm = ({ onToggle }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'student'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await register(formData);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Inscription</h1>
          <p className="text-gray-600">Créez votre compte e-learning</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom d'utilisateur</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
            >
              <option value="student">Étudiant</option>
              <option value="instructor">Formateur</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50"
          >
            {loading ? 'Inscription...' : 'S\'inscrire'}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={onToggle}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Déjà un compte ? Se connecter
          </button>
        </div>
      </div>
    </div>
  );
};

// Dashboard Components
const StudentDashboard = () => {
  const { apiUrl, token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/courses`);
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Cours</h1>
          <p className="text-gray-600">Découvrez les cours disponibles</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
                <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600"></div>
                <div className="p-6">
                  <h3 className="font-bold text-xl mb-2">{course.title}</h3>
                  <p className="text-gray-600 mb-4">{course.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Par {course.instructor_name}</span>
                    {course.price && (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {course.price}€
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && courses.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun cours disponible</h3>
            <p className="text-gray-600">Les cours seront bientôt disponibles !</p>
          </div>
        )}
      </div>
    </div>
  );
};

const InstructorDashboard = () => {
  const { apiUrl, token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showStatistics, setShowStatistics] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/courses/my-courses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/instructor/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleShowStatistics = () => {
    setShowStatistics(true);
    setSelectedCourse(null);
    setShowCreateForm(false);
    fetchStatistics();
  };

  const simulatePurchase = async (courseId, amount) => {
    try {
      const response = await fetch(`${apiUrl}/api/purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          item_type: 'course',
          item_id: courseId,
          amount: amount
        })
      });
      if (response.ok) {
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error simulating purchase:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de Bord Formateur</h1>
            <p className="text-gray-600">Gérez vos cours et suivez vos performances</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleShowStatistics}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                showStatistics 
                  ? 'bg-green-600 text-white' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              📊 Statistiques
            </button>
            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setShowStatistics(false);
                setSelectedCourse(null);
              }}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                showCreateForm 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
              }`}
            >
              {showCreateForm ? 'Annuler' : 'Nouveau Cours'}
            </button>
          </div>
        </div>

        {showStatistics && <StatisticsView statistics={statistics} />}

        {showCreateForm && (
          <CreateCourseForm 
            onSuccess={() => {
              setShowCreateForm(false);
              fetchMyCourses();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {selectedCourse && (
          <CourseEditor 
            course={selectedCourse}
            onBack={() => setSelectedCourse(null)}
            onUpdate={fetchMyCourses}
          />
        )}

        {!showCreateForm && !selectedCourse && !showStatistics && (
          <>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div key={course.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
                    <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600"></div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-xl">{course.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          course.is_published 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {course.is_published ? 'Publié' : 'Brouillon'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4">{course.description}</p>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-500">
                          {course.sections.length} section(s)
                        </span>
                        {course.price && (
                          <span className="text-lg font-bold text-green-600">
                            {course.price}€
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedCourse(course)}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                        >
                          Modifier
                        </button>
                        {course.is_published && course.price && (
                          <button
                            onClick={() => simulatePurchase(course.id, course.price)}
                            className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition"
                            title="Simuler un achat"
                          >
                            💰
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && courses.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎓</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun cours créé</h3>
                <p className="text-gray-600">Commencez par créer votre premier cours !</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Statistics View Component
const StatisticsView = ({ statistics }) => {
  if (!statistics) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Revenus Totaux</p>
              <p className="text-3xl font-bold">{statistics.totalRevenue.toFixed(2)}€</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Ventes Totales</p>
              <p className="text-3xl font-bold">{statistics.totalSales}</p>
            </div>
            <div className="text-4xl">🛍️</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Revenu Moyen</p>
              <p className="text-3xl font-bold">
                {statistics.totalSales > 0 ? (statistics.totalRevenue / statistics.totalSales).toFixed(2) : '0.00'}€
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Ce Mois</p>
              <p className="text-3xl font-bold">
                {statistics.chartData.length > 0 
                  ? statistics.chartData[statistics.chartData.length - 1].revenue.toFixed(2)
                  : '0.00'
                }€
              </p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Revenus Mensuels (12 derniers mois)</h3>
          {statistics.chartData.length > 0 ? (
            <div className="space-y-2">
              {statistics.chartData.map((month, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-sm font-medium text-gray-700">{month.month}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">{month.sales} vente(s)</span>
                    <span className="font-bold text-green-600">{month.revenue.toFixed(2)}€</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
          )}
        </div>

        {/* Top Selling Items */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Top des Ventes</h3>
          {statistics.topItems.length > 0 ? (
            <div className="space-y-3">
              {statistics.topItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{item.revenue.toFixed(2)}€</p>
                    <p className="text-xs text-gray-500">{item.sales} vente(s)</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune vente enregistrée</p>
          )}
        </div>
      </div>

      {/* Recent Purchases */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4">Achats Récents</h3>
        {statistics.recentPurchases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Étudiant</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Article</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Montant</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {statistics.recentPurchases.map((purchase, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{purchase.student_name}</td>
                    <td className="py-3 px-4">{purchase.item_title}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        purchase.item_type === 'course' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {purchase.item_type === 'course' ? 'Cours' : 'Chapitre'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-green-600">{purchase.amount.toFixed(2)}€</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(purchase.purchased_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Aucun achat récent</p>
        )}
      </div>

      {/* Test Purchase Section */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-bold text-blue-900 mb-2">🧪 Zone de Test</h3>
        <p className="text-blue-700 text-sm mb-4">
          Utilisez les boutons 💰 sur vos cours publiés pour simuler des achats et voir les statistiques en action.
        </p>
        <div className="flex items-center space-x-2 text-blue-600">
          <span className="text-sm">💡</span>
          <span className="text-sm">Les vraies transactions seront gérées par PayPal en production.</span>
        </div>
      </div>
    </div>
  );
};
const CreateCourseForm = ({ onSuccess, onCancel }) => {
  const { apiUrl, token } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/api/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          price: formData.price ? parseFloat(formData.price) : null
        })
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        setError(error.detail);
      }
    } catch (error) {
      setError('Erreur lors de la création du cours');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <h2 className="text-2xl font-bold mb-6">Créer un nouveau cours</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Titre du cours</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            rows="4"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Prix (optionnel)</label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({...formData, price: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="0.00"
            step="0.01"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer le cours'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

// Course Editor Component
const CourseEditor = ({ course, onBack, onUpdate }) => {
  const { apiUrl, token } = useAuth();
  const [courseData, setCourseData] = useState(course);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showChapterForm, setShowChapterForm] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCourseData = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/courses/${course.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCourseData(data);
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
    }
  };

  const createSection = async (sectionData) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/courses/${course.id}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sectionData)
      });

      if (response.ok) {
        await fetchCourseData();
        setShowSectionForm(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error creating section:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChapter = async (sectionId, chapterData) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/courses/${course.id}/sections/${sectionId}/chapters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(chapterData)
      });

      if (response.ok) {
        await fetchCourseData();
        setShowChapterForm(null);
        onUpdate();
      }
    } catch (error) {
      console.error('Error creating chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const publishCourse = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/courses/${course.id}/publish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchCourseData();
        onUpdate();
      }
    } catch (error) {
      console.error('Error publishing course:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Modifier: {courseData.title}</h2>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              courseData.is_published 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {courseData.is_published ? 'Publié' : 'Brouillon'}
            </span>
            <span className="text-sm text-gray-600">
              {courseData.sections.length} section(s)
            </span>
          </div>
        </div>
        <div className="flex space-x-4">
          {!courseData.is_published && (
            <button
              onClick={publishCourse}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? 'Publication...' : 'Publier le cours'}
            </button>
          )}
          <button
            onClick={onBack}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
          >
            ← Retour
          </button>
        </div>
      </div>

      {/* Course Description */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-700">{courseData.description}</p>
        {courseData.price && (
          <p className="text-sm text-gray-600 mt-2">Prix: {courseData.price}€</p>
        )}
      </div>

      {/* Add Section Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowSectionForm(!showSectionForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          {showSectionForm ? 'Annuler' : '+ Ajouter une section'}
        </button>
      </div>

      {/* Section Form */}
      {showSectionForm && (
        <SectionForm 
          onSubmit={createSection}
          onCancel={() => setShowSectionForm(false)}
          loading={loading}
        />
      )}

      {/* Sections List */}
      <div className="space-y-6">
        {courseData.sections.map((section, sectionIndex) => (
          <div key={section.id} className="border border-gray-200 rounded-lg">
            <div className="bg-gray-50 p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                  {section.description && (
                    <p className="text-gray-600 text-sm mt-1">{section.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {section.chapters.length} chapitre(s)
                  </p>
                </div>
                <button
                  onClick={() => setShowChapterForm(showChapterForm === section.id ? null : section.id)}
                  className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition"
                >
                  + Ajouter un chapitre
                </button>
              </div>
            </div>

            {/* Chapter Form */}
            {showChapterForm === section.id && (
              <div className="p-4 bg-blue-50 border-b">
                <ChapterForm 
                  onSubmit={(chapterData) => createChapter(section.id, chapterData)}
                  onCancel={() => setShowChapterForm(null)}
                  loading={loading}
                />
              </div>
            )}

            {/* Chapters List */}
            <div className="p-4">
              {section.chapters.length > 0 ? (
                <div className="space-y-3">
                  {section.chapters.map((chapter, chapterIndex) => (
                    <div key={chapter.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-500">
                            {chapterIndex + 1}.
                          </span>
                          <div>
                            <h4 className="font-medium">{chapter.title}</h4>
                            <p className="text-sm text-gray-600">{chapter.description}</p>
                            {chapter.video_url && (
                              <p className="text-xs text-blue-600 mt-1">📹 Vidéo: {chapter.video_url}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          chapter.chapter_type === 'free' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {chapter.chapter_type === 'free' ? 'Gratuit' : `Payant (${chapter.price}€)`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">Aucun chapitre dans cette section</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {courseData.sections.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune section</h3>
          <p className="text-gray-600">Commencez par ajouter une section à votre cours.</p>
        </div>
      )}
    </div>
  );
};

// Section Form Component
const SectionForm = ({ onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-blue-50 p-4 rounded-lg mb-6">
      <h3 className="text-lg font-semibold mb-4">Nouvelle Section</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Titre de la section</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnel)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            rows="3"
          />
        </div>
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer la section'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

// Chapter Form Component
const ChapterForm = ({ onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    chapter_type: 'free',
    price: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const chapterData = {
      ...formData,
      price: formData.chapter_type === 'paid' && formData.price ? parseFloat(formData.price) : null
    };
    onSubmit(chapterData);
  };

  return (
    <div>
      <h4 className="text-md font-semibold mb-4">Nouveau Chapitre</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Titre du chapitre</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de chapitre</label>
            <select
              value={formData.chapter_type}
              onChange={(e) => setFormData({...formData, chapter_type: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            >
              <option value="free">Gratuit</option>
              <option value="paid">Payant</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            rows="3"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">URL de la vidéo (optionnel)</label>
          <input
            type="url"
            value={formData.video_url}
            onChange={(e) => setFormData({...formData, video_url: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            placeholder="https://example.com/video.mp4"
          />
        </div>
        
        {formData.chapter_type === 'paid' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prix (€)</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              placeholder="9.99"
              step="0.01"
              min="0"
              required
            />
          </div>
        )}
        
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer le chapitre'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

// Admin Dashboard (placeholder)
const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Administration</h1>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👨‍💼</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Panel d'administration</h3>
          <p className="text-gray-600">Les fonctionnalités d'administration seront implémentées prochainement.</p>
        </div>
      </div>
    </div>
  );
};

// Header Component
const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ELearning Pro
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="text-gray-600">Connecté en tant que </span>
            <span className="font-semibold">{user?.full_name || user?.username}</span>
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
              {user?.role === 'student' ? 'Étudiant' : user?.role === 'instructor' ? 'Formateur' : 'Admin'}
            </span>
          </div>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
};

// Main App Component
const App = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <AuthProvider>
      <MainApp isLogin={isLogin} setIsLogin={setIsLogin} />
    </AuthProvider>
  );
};

const MainApp = ({ isLogin, setIsLogin }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return isLogin ? (
      <LoginForm onToggle={() => setIsLogin(false)} />
    ) : (
      <RegisterForm onToggle={() => setIsLogin(true)} />
    );
  }

  return (
    <div>
      <Header />
      {user.role === 'student' && <StudentDashboard />}
      {user.role === 'instructor' && <InstructorDashboard />}
      {user.role === 'admin' && <AdminDashboard />}
    </div>
  );
};

export default App;