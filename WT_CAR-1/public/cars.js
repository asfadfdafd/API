const resultsContainer = document.getElementById('results');
const brandModelMapping = {
    "Audi": ["A3", "A4", "A6", "Q3", "Q5", "Q7", "Q8"],
    "Mercedes-Benz": ["C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE", "GLS"],
    "BMW": ["3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7"],
    "Toyota": ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "Tundra", "4Runner"],
    "Honda": ["Civic", "Accord", "CR-V", "Pilot", "HR-V", "Odyssey"],
    "Ford": ["F-150", "Escape", "Explorer", "Mustang", "Ranger", "Bronco"],
    "Chevrolet": ["Silverado", "Equinox", "Malibu", "Tahoe", "Camaro", "Suburban"],
    "Tesla": ["Model 3", "Model S", "Model X", "Model Y", "Cybertruck"],
    "Hyundai": ["Elantra", "Sonata", "Tucson", "Santa Fe", "Palisade"],
    "Nissan": ["Altima", "Maxima", "Rogue", "Murano", "Pathfinder", "Frontier"],
    "Kia": ["Soul", "Sportage", "Sorento", "Telluride", "Forte", "Rio"],
    "Volkswagen": ["Golf", "Passat", "Jetta", "Tiguan", "Atlas", "ID.4"],
    "Jeep": ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Renegade"],
    "Subaru": ["Outback", "Forester", "Crosstrek", "Impreza", "WRX", "Ascent"],
    "Porsche": ["911", "Cayenne", "Macan", "Panamera", "Taycan"],
    "Lexus": ["RX", "ES", "NX", "GX", "IS", "UX"],
    "Mazda": ["Mazda3", "Mazda6", "CX-5", "CX-30", "CX-9"],
    "Dodge": ["Charger", "Challenger", "Durango", "Ram 1500"],
    "Volvo": ["XC40", "XC60", "XC90", "S60", "V60", "V90"]
};


// Search Car Info by Model
document.getElementById('carSearchButton').addEventListener('click', async () => {
    const input = document.getElementById('carModelInput').value.trim();
    const models = brandModelMapping[input] || [input]; // Use mapped models or fallback to input
    resultsContainer.innerHTML = 'Loading...';

    try {
        const requests = models.map(model => fetch(`/cars?model=${encodeURIComponent(model)}`).then(res => res.json()));
        const data = (await Promise.all(requests)).flat(); // Flatten results

        if (data.length === 0) {
            resultsContainer.innerHTML = `<div class="error-message">No car data found for the specified brand or model.</div>`;
        } else {
            resultsContainer.innerHTML = '';
            data.forEach(car => {
                const card = `
                    <div class="result-card">
                        <h5>${car.make} ${car.model} (${car.year})</h5>
                        <p><strong>Engine:</strong> ${car.engine_type}</p>
                        <p><strong>Cylinders:</strong> ${car.cylinders}</p>
                        <p><strong>Fuel Type:</strong> ${car.fuel_type}</p>
                        <p><strong>City MPG:</strong> ${car.city_mpg}</p>
                        <p><strong>Highway MPG:</strong> ${car.highway_mpg}</p>
                    </div>
                `;
                resultsContainer.innerHTML += card;
            });
        }
    } catch (error) {
        resultsContainer.innerHTML = `<div class="error-message">Failed to fetch car data.</div>`;
        console.error(error);
    }
});

// Decode VIN
document.getElementById('vinSearchButton').addEventListener('click', async () => {
    const vin = document.getElementById('vinInput').value.trim();
    resultsContainer.innerHTML = 'Loading...';

    try {
        const response = await fetch(`/vin?vin=${encodeURIComponent(vin)}`);
        const data = await response.json();

        if (data.error) {
            resultsContainer.innerHTML = `<div class="error-message">${data.error}</div>`;
        } else {
            let resultHtml = `<div class="result-card"><h5>${data.Make || ''} ${data.Model || ''}</h5>`;
            if (data.Year) resultHtml += `<p><strong>Year:</strong> ${data.Year}</p>`;
            if (data.Engine) resultHtml += `<p><strong>Engine:</strong> ${data.Engine} Cylinders</p>`;
            if (data.FuelType) resultHtml += `<p><strong>Fuel Type:</strong> ${data.FuelType}</p>`;
            if (data.Transmission) resultHtml += `<p><strong>Transmission:</strong> ${data.Transmission}</p>`;
            if (data.VehicleType) resultHtml += `<p><strong>Vehicle Type:</strong> ${data.VehicleType}</p>`;
            resultHtml += `</div>`;

            resultsContainer.innerHTML = resultHtml;
        }
    } catch (error) {
        resultsContainer.innerHTML = `<div class="error-message">Failed to decode VIN. Please try again later.</div>`;
        console.error('Error fetching VIN data:', error);
    }
});

