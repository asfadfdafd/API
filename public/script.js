document.getElementById('fetch-btn').addEventListener('click', async () => {
    const city = document.getElementById('city-input').value;

    try {
        const weatherResponse = await fetch(`/api/weather?city=${city}`);
        const weatherData = await weatherResponse.json();

        const carResponse = await fetch('/api/car-data');
        const carData = await carResponse.json();

        document.getElementById('weather-info').innerHTML = `
      <h2>Weather in ${city}</h2>
      <p>Temperature: ${weatherData.main.temp}°C</p>
      <p>Description: ${weatherData.weather[0].description}</p>
      <p>Coordinates: ${weatherData.coord.lat}, ${weatherData.coord.lon}</p>
    `;

        document.getElementById('car-info').innerHTML = `
      <h2>Car Information</h2>
      <p>Car Brands: ${carData.carBrands.join(', ')}</p>
      <p>Fuel Prices: ${JSON.stringify(carData.fuelPrices)}</p>
    `;

        const map = L.map('map').setView([weatherData.coord.lat, weatherData.coord.lon], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        L.marker([weatherData.coord.lat, weatherData.coord.lon]).addTo(map);
    } catch (error) {
        console.error(error);
        alert('Failed to fetch data.');
    }
});
