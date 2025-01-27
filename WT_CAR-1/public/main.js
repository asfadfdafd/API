document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/weather';
    const cityNameInput = document.getElementById('cityName');
    const submitButton = document.getElementById('submitButton');
    const weatherInfo = document.getElementById('weatherInfo');
    let map;

    submitButton.addEventListener('click', async () => {
        const city = cityNameInput.value.trim();
        if (!city) {
            alert('Please enter a city name');
            return;
        }

        weatherInfo.innerHTML = 'Loading...';

        try {
            // Fetch weather data
            const response = await fetch(`${API_URL}?city=${encodeURIComponent(city)}`);
            const data = await response.json();

            if (data.error) {
                weatherInfo.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
                return;
            }

            // Display weather info
            weatherInfo.innerHTML = `
                <h2>Weather for ${data.name}, ${data.country}</h2>
                <p>Temperature: ${data.temperature}°C</p>
                <p>Description: ${data.description}</p>
                <p>Feels Like: ${data.feels_like}°C</p>
                <p>Humidity: ${data.humidity}%</p>
                <p>Pressure: ${data.pressure} hPa</p>
                <p>Wind Speed: ${data.wind_speed} m/s</p>
                <p>Rain Volume (last 3 hours): ${data.rain} mm</p>
            `;

            // Initialize or update the map
            if (map) {
                map.remove();
            }

            map = L.map('map').setView([data.coordinates.lat, data.coordinates.lon], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            L.marker([data.coordinates.lat, data.coordinates.lon])
                .addTo(map)
                .bindPopup(`<b>${data.name}</b><br>${data.description}`)
                .openPopup();
        } catch (error) {
            weatherInfo.innerHTML = `<div class="alert alert-danger">Failed to fetch weather data. Please try again later.</div>`;
            console.error('Error fetching weather data:', error);
        }
    });
});
