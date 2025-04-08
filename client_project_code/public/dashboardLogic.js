// Initialize the map centered on a default location (e.g., Washington DC)
const map = L.map('map').setView([38.9072, -77.0369], 13);

// Use CartoDB Positron tile layer (simple, minimalistic map with no streets)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CartoDB</a>'
}).addTo(map);

// Event listener for map click
map.on('click', function(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // Update the coordinates display
    document.getElementById('lat').textContent = lat.toFixed(6);  // Display latitude with 6 decimal places
    document.getElementById('lng').textContent = lng.toFixed(6);  // Display longitude with 6 decimal places

    // Optionally, show a popup with the coordinates at the clicked location
    L.popup()
        .setLatLng(e.latlng)
        .setContent(`Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}`)
        .openOn(map);
});

// Function to add a fields to database
function addToDatabase(project) {
    fetch('/projects', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(project)
    })
    console.log('Project added:', project);
}

// Function to handle form submission
function handleFormSubmit(event) {
    event.preventDefault(); // Prevent the default form submission

    // Get form values
    const projectName = document.getElementById('projectName').value;
    const mainPartner = document.getElementById('mainPartner').value;
    const otherpartners = document.getElementById('otherpartners').value;
    const projectType = document.getElementById('projectType').value;
    const areaScope = document.getElementById('areaScope').value;
    const deliverables = document.getElementById('deliverables').value;
    const link = document.getElementById('link').value;
    const lat = parseFloat(document.getElementById('lat').textContent);
    const lng = parseFloat(document.getElementById('lng').textContent);

    // Create a project object
    const project = {
        projectName,
        mainPartner,
        otherpartners,
        projectType,
        areaScope,
        deliverables,
        link,
        lat,
        lng
    };

    // Add the project to the database
    addToDatabase(project);

    populateTable(); // Refresh the table with the new project
    document.getElementById('input-container').reset(); // Reset the form
}

// Populate table with existing projects from the database
function populateTable() {
    fetch('/projects')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('project-table');
            tableBody.innerHTML = ''; // Clear existing rows

            data.forEach(project => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${project.projectName}</td>
                    <td>${project.mainPartner}</td>
                    <td>${project.otherpartners}</td>
                    <td>${project.projectType}</td>
                    <td>${project.areaScope}</td>
                    <td>${project.deliverables}</td>
                    <td><a href="${project.link}" target="_blank">${project.link}</a></td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(error => console.error('Error fetching projects:', error));
}

window.onload = populateTable(); // Populate the table when the page loads