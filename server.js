import express from 'express';
import fetch from 'node-fetch';
import mongoose from 'mongoose';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import Models
import User from './models/User.js';
import History from './models/History.js';

// Load environment variables
dotenv.config();

// Workaround for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files, but with lower priority than EJS views
app.use(express.static('public', { index: false })); // Disable auto-loading index.html

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'dauren',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: process.env.NODE_ENV === 'production' },
    })
);

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const CAR_API_KEY = process.env.CAR_API_KEY;

// ------------------- Routes -------------------

// Redirect root to login page
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard'); // Redirect logged-in users
    }
    res.redirect('/login');
});

// Login routes
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        console.log(`Attempting login for username: ${username}`);
        const user = await User.findOne({ username });
        console.log('User fetched from database:', user);

        if (!user) {
            console.log('User not found');
            return res.status(401).send('Invalid login credentials');
        }

        if (user.password !== password) {
            console.log('Password mismatch');
            return res.status(401).send('Invalid login credentials');
        }

        console.log('Login successful');
        req.session.user = { id: user._id, username: user.username, isAdmin: user.isAdmin };

        res.redirect(user.isAdmin ? '/admin' : '/dashboard');
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Server error');
    }
});

// Dashboard for logged-in users
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.session.user });
});

// Weather API route
app.get('/weather', async (req, res) => {
    const city = req.query.city || 'Astana'; // Дефолтный город
    
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod !== 200) {
            await History.create({
                userRequest: { api: 'Weather API', input: { city } },
                response: { error: 'City not found' },
            });
            return res.render('weather', { data: null, error: 'City not found' });
        }

        await History.create({
            userRequest: { api: 'Weather API', input: { city } },
            response: data,
        });

        res.render('weather', { data });
    } catch (error) {
        console.error('Error fetching weather data:', error);
        res.render('weather', { data: null, error: 'Failed to fetch weather data' });
    }
});

// Admin panel route
app.get('/admin', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        res.render('admin', { users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
    }
});

// History route
app.get('/history', isAuthenticated, async (req, res) => {
    try {
        const history = await History.find().sort({ createdAt: -1 });
        res.render('history', { history });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).send('Failed to fetch history');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// ------------------- Middleware -------------------

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) return next();
    res.redirect('/login');
}

// Admin check middleware
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.isAdmin) return next();
    res.status(403).send('Forbidden');
}

// ------------------- Start the Server -------------------
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}/login`);
});
