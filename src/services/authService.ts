// Mock user type that matches our registration form
type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string; // In a real app, this would be a hashed password
  createdAt: string;
};

// Mock database using localStorage
const MOCK_DB_KEY = 'mockAuthDB';

// Initialize mock database if it doesn't exist
const initializeDB = (): User[] => {
  if (typeof window === 'undefined') return [];
  
  const existingDB = localStorage.getItem(MOCK_DB_KEY);
  if (existingDB) {
    return JSON.parse(existingDB);
  }
  
  const initialDB: User[] = [];
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(initialDB));
  return initialDB;
};

// Simulate API delay
const simulateAPIDelay = () => new Promise(resolve => 
  setTimeout(resolve, 300 + Math.random() * 700)
);

export const authService = {
  // Register a new user
  async register(userData: Omit<User, 'id' | 'createdAt'>) {
    await simulateAPIDelay();
    
    const db = initializeDB();
    
    // Check if user already exists
    const userExists = db.some(user => user.email === userData.email);
    if (userExists) {
      throw new Error('A user with this email already exists');
    }
    
    // Create new user
    const newUser: User = {
      ...userData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    
    // Save to mock DB
    db.push(newUser);
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
    
    // Return user data (without password)
    const { password, ...userDataWithoutPassword } = newUser;
    return userDataWithoutPassword;
  },
  
  // Login user
  async login(credentials: { email: string; password: string }) {
    await simulateAPIDelay();
    
    const db = initializeDB();
    const user = db.find(
      u => u.email === credentials.email && u.password === credentials.password
    );
    
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // In a real app, we would return a JWT token
    const { password, ...userDataWithoutPassword } = user;
    return {
      user: userDataWithoutPassword,
      token: 'mock-jwt-token',
    };
  },
  
  // Get current user (for session persistence)
  async getCurrentUser() {
    await simulateAPIDelay();
    
    // In a real app, this would verify a JWT token
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    
    // This is a mock implementation - in a real app, you'd verify the token
    // and get the user ID from it, then fetch the user from the database
    const db = initializeDB();
    const user = db[0]; // Just return the first user for demo purposes
    
    if (!user) return null;
    
    const { password, ...userDataWithoutPassword } = user;
    return userDataWithoutPassword;
  },
  
  // Logout
  async logout() {
    await simulateAPIDelay();
    localStorage.removeItem('auth_token');
    return true;
  },
  
  // API for auth components
  async signin(payload: { email: string; password: string }) {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Signin failed');
    return res.json();
  },

  async registerAPI(payload: { firstName: string; lastName?: string; email: string; password: string }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Registration failed');
    return res.json();
  },
};
