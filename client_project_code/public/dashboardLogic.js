// Initialize the map centered on a default location (e.g., Washington DC)
// Initialize the map centered on Washington DC
let map = L.map('map').setView([38.9072, -77.0369], 7.3);

L.tileLayer('https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=OnXBtQJuRfAynPnVkfBw', {
    attribution: 'Map data © OpenStreetMap contributors',
}).addTo(map);

// Define style for GeoJSON layer
var myStyle = {
    "color": "#28a745",
    "weight": 2,
    "opacity": 0.8,
    "fill": false
};

// Load GeoJSON from external URL
fetch("https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_040_00_500k.json")
    .then(response => response.json())
    .then(geojson => {
        L.geoJSON(geojson, { style: myStyle }).addTo(map);
    })
    .catch(error => {
        console.error("Failed to load GeoJSON:", error);
    });



let marker;

map.on('click', function (e) {
    const { lat, lng } = e.latlng;
    document.getElementById('lat').textContent = lat.toFixed(5);
    document.getElementById('lng').textContent = lng.toFixed(5);

    if (marker) {
        marker.setLatLng(e.latlng);
    } else {
        marker = L.marker(e.latlng).addTo(map);
    }
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

const form = document.getElementById('form-map-container');
const addBtn = document.getElementById('add-button');
const span = document.querySelector('.close');

addBtn.onclick = () => {
    form.style.display = 'block';
    setTimeout(() => {
        map.invalidateSize(); // Fix for Leaflet map inside modal
    }, 200);
}

span.onclick = () => {
    form.style.display = "none";
};

window.onclick = (event) => {
    if (event.target === form) {
        form.style.display = "none";
    }
};

function openModal() {
    form.style.display = 'block'; // Show the form when the button is clicked
}

function closeModal() {
    form.style.display = 'none'; // Hide the form when the button is closed
}

window.onload = populateTable(); // Populate the table when the page loads