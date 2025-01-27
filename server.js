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
app.use(express.static('public')); // Serve static files
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(express.json()); // Parse JSON data
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'dauren',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: process.env.NODE_ENV === 'production' }, // Use secure cookies in production
    })
);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const CAR_API_KEY = process.env.CAR_API_KEY;

// ------------------- Routes -------------------

// Login routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

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

        // Compare plain text passwords
        if (user.password !== password) {
            console.log('Password mismatch');
            return res.status(401).send('Invalid login credentials');
        }

        // Login successful
        console.log('Login successful');
        req.session.user = { id: user._id, username: user.username, isAdmin: user.isAdmin };
        res.redirect(user.isAdmin ? '/admin' : '/');
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Server error');
    }
});

// Weather API route
app.get('/weather', async (req, res) => {
    const city = req.query.city;
    if (!city) {
        return res.status(400).json({ error: 'City is required' });
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod !== 200) {
            await History.create({
                userRequest: { api: 'Weather API', input: { city } },
                response: { error: 'City not found' },
            });
            return res.status(404).json({ error: 'City not found' });
        }

        // Save the request and response in MongoDB
        await History.create({
            userRequest: { api: 'Weather API', input: { city } },
            response: data,
        });

        res.json({
            name: data.name,
            country: data.sys.country,
            temperature: data.main.temp,
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            feels_like: data.main.feels_like,
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            wind_speed: data.wind.speed,
            coordinates: {
                lat: data.coord.lat,
                lon: data.coord.lon,
            },
            rain: data.rain ? data.rain['1h'] : 0,
        });
    } catch (error) {
        console.error('Error fetching weather data:', error);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});


// Car API route
app.get('/cars', async (req, res) => {
    const model = req.query.model || 'camry';
    try {
        const url = `https://api.api-ninjas.com/v1/cars?model=${model}`;
        const response = await fetch(url, {
            headers: { 'X-Api-Key': CAR_API_KEY },
        });

        const data = await response.json();

        // Log the request and response in MongoDB
        await History.create({
            userRequest: { api: 'Car API', input: { model } },
            response: response.ok ? data : { error: 'Failed to fetch car data' },
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch car data' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching car data:', error);
        res.status(500).json({ error: 'Failed to fetch car data' });
    }
});


// VIN decoding route
app.get('/vin', async (req, res) => {
    const vin = req.query.vin;
    if (!vin) {
        return res.status(400).json({ error: 'VIN is required' });
    }

    if (vin.length !== 17) {
        return res.status(400).json({ error: 'VIN must be exactly 17 characters long.' });
    }

    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || data.Results.length === 0) {
            throw new Error('Invalid response from NHTSA API');
        }

        const filteredData = {
            Make: data.Results.find((item) => item.Variable === 'Make')?.Value,
            Model: data.Results.find((item) => item.Variable === 'Model')?.Value,
            Year: data.Results.find((item) => item.Variable === 'Model Year')?.Value,
            Engine: data.Results.find((item) => item.Variable === 'Engine Number of Cylinders')?.Value,
            Trim: data.Results.find((item) => item.Variable === 'Trim')?.Value,
            VehicleType: data.Results.find((item) => item.Variable === 'Vehicle Type')?.Value,
            Transmission: data.Results.find((item) => item.Variable === 'Transmission Style')?.Value,
            FuelType: data.Results.find((item) => item.Variable === 'Fuel Type - Primary')?.Value,
        };

        res.json(filteredData);
    } catch (error) {
        console.error('Error decoding VIN:', error.message);
        res.status(500).json({ error: 'Failed to decode VIN. Please try again later.' });
    }
});


// Admin panel route
app.get('/admin', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }); // Don't send passwords to the client
        res.render('admin', { users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/add', async (req, res) => {
    const { username, password, isAdmin } = req.body;

    try {
        // Create a new user
        const newUser = new User({
            username,
            password,
            isAdmin: isAdmin === 'on', // Convert checkbox value to Boolean
        });

        // Save the user to the database
        await newUser.save();
        console.log('User added:', newUser);

        // Redirect back to the admin panel
        res.redirect('/admin');
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send('Failed to add user');
    }
});
app.get('/history', async (req, res) => {
    try {
        const history = await History.find().sort({ createdAt: -1 }); // Most recent first
        res.render('history', { history });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).send('Failed to fetch history');
    }
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
