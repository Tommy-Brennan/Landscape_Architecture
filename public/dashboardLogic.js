// Get references to DOM elements
const form = document.getElementById('form-map-container');
const addBtn = document.getElementById('add-button');
const span = document.querySelector('.close');
const submitButton = document.getElementById('submit-button');
const currentUserPermission = sessionStorage.getItem('user') ? JSON.parse(sessionStorage.getItem('user')).permissions : null;

// Initialize the map centered on Washington DC
let map = L.map('map').setView([38.9072, -77.0369], 7.3);

L.tileLayer('https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=OnXBtQJuRfAynPnVkfBw', {
    attribution: 'Map data © OpenStreetMap contributors',
}).addTo(map);

// Define style for GeoJSON layer
const myStyle = {
    color: "#28a745",
    weight: 2,
    opacity: 0.8,
    fill: false
};

// Load GeoJSON layer
fetch("https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_040_00_500k.json")
    .then(res => res.json())
    .then(geojson => {
        L.geoJSON(geojson, { style: myStyle }).addTo(map);
    })
    .catch(err => console.error("Failed to load GeoJSON:", err));

// Handle map click to add marker and update coordinates
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

// Submit project to backend
function addToDatabase(project) {
    fetch('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
    }).then(() => console.log('Project added:', project));
}

// Handle form submission for creating a project
function handleFormSubmit(event) {
    event.preventDefault();

    const project = extractFormValues();

    const cleanedLink = cleanLink(project.link);

    project.link = cleanedLink;

    // Wait for the POST request to finish before refreshing the table
    fetch('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to add project');
        return response.json();
    })
    .then(() => {
        populateTable();
        document.getElementById('input-container').reset();
        closeModal();
    })
    .catch(err => {
        console.error('Error adding project:', err);
        alert('Error saving project. Check the console.');
    });
};

// Populate table with projects
function populateTable() {
    fetch('/projects')
        .then(res => res.json())
        .then(data => {
            const tableBody = document.getElementById('project-table');
            tableBody.innerHTML = '';

            data.forEach(project => {
                const row = document.createElement('tr');
                row.setAttribute('data-id', project.id);
                row.innerHTML = `
                    <td>${project.projectName}</td>
                    <td>${project.mainPartner}</td>
                    <td>${project.otherpartners}</td>
                    <td>${project.projectType}</td>
                    <td>${project.areaScope}</td>
                    <td>${project.deliverables}</td>
                    <td><a href="${project.link}" target="_blank">${project.link}</a></td>
                    <td><button class="edit-button" data-id="${project.id}">Edit</button></td>
                `;
                tableBody.appendChild(row);
            });

            document.querySelectorAll('.edit-button').forEach(button => {
                button.addEventListener('click', () => {
                    openEditForm(parseInt(button.getAttribute('data-id')));
                });
            });
        })
        .catch(err => console.error('Error fetching projects:', err));
}

function cleanLink(link) {
    if (typeof link !== 'string') return link;

    const match = link.match(/^https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+/);
    return match ? match[0] : link; 
}

// Open form in edit mode
function openEditForm(id) {
    fetch(`/projects/${id}`)
        .then(res => res.json())
        .then(project => {
            populateForm(project);
            openModal();
            const originalLink = project.link;

            form.onsubmit = (event) => {
                event.preventDefault();
                const updatedProject = extractFormValues();
                updatedProject.id = id;

                if (updatedProject.link !== originalLink) {
                    const cleanedLink = cleanLink(updatedProject.link);
                    console.log(cleanedLink)
                    updatedProject.link = cleanedLink;
                }

                fetch(`/projects/update`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedProject)
                })
                    .then(() => {
                        populateTable();
                        closeModal();
                        console.log('Project updated:', updatedProject);
                    })
                    .catch(err => console.error('Error updating project:', err));
            };

            submitButton.textContent = 'Update';
        })
        .catch(err => console.error('Error loading project:', err));
}

// populate form with project data
function populateForm(project) {
    document.getElementById('projectName').value = project.projectName;
    document.getElementById('mainPartner').value = project.mainPartner;
    document.getElementById('otherpartners').value = project.otherpartners;
    document.getElementById('projectType').value = project.projectType;
    document.getElementById('areaScope').value = project.areaScope;
    document.getElementById('deliverables').value = project.deliverables;
    document.getElementById('link').value = project.link;
    document.getElementById('lat').textContent = project.lat.toFixed(5);
    document.getElementById('lng').textContent = project.lng.toFixed(5);
    if (marker) {
        marker.setLatLng([project.lat, project.lng]);
    } else {
        marker = L.marker([project.lat, project.lng]).addTo(map);
    }
}

// extract values from form
function extractFormValues() {
    return {
        projectName: document.getElementById('projectName').value,
        mainPartner: document.getElementById('mainPartner').value,
        otherpartners: document.getElementById('otherpartners').value,
        projectType: document.getElementById('projectType').value,
        areaScope: document.getElementById('areaScope').value,
        deliverables: document.getElementById('deliverables').value,
        link: document.getElementById('link').value,
        lat: parseFloat(document.getElementById('lat').textContent),
        lng: parseFloat(document.getElementById('lng').textContent)
    };
}

// Form open in create mode
addBtn.onclick = () => {
    document.getElementById('input-container').reset();
    form.onsubmit = handleFormSubmit;
    submitButton.textContent = 'Submit';
    openModal();
};

// Modal controls
span.onclick = closeModal;
window.onclick = (event) => {
    if (event.target === form) {
        closeModal();
    }
};

function openModal() {
    form.style.display = 'block';
    setTimeout(() => map.invalidateSize(), 200); 
}

function closeModal() {
    form.style.display = 'none';
}

document.getElementById('select-button').addEventListener('click', () => {
    const rows = document.querySelectorAll('#project-table tr');
    rows.forEach(row => {
        if (!row.querySelector('.row-checkbox')) {
            const checkboxCell = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'row-checkbox';
            checkboxCell.appendChild(checkbox);
            row.insertBefore(checkboxCell, row.firstChild); 
        }
    });


    const headerRow = document.querySelector('#project-table').closest('table').querySelector('thead tr');
    if (!headerRow.querySelector('.select-header')) {
        const th = document.createElement('th');
        th.textContent = 'Select';
        th.className = 'select-header';
        headerRow.insertBefore(th, headerRow.firstChild); 
    }

    document.getElementById('table-controls').style.display = 'block';
    document.getElementById('select-button').style.display = 'none';
});


document.getElementById('cancel-selection-button').addEventListener('click', () => {
    
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.closest('td').remove();
    });

    
    const headerRow = document.querySelector('#project-table').previousElementSibling;
    const selectHeader = headerRow.querySelector('.select-header');
    if (selectHeader) selectHeader.remove();

    document.getElementById('table-controls').style.display = 'none';
    document.getElementById('select-button').style.display = 'inline';
});

document.getElementById('delete-button').addEventListener('click', () => {
    const rows = document.querySelectorAll('#project-table tr');
    const idsToDelete = [];

    // Collect the IDs of the selected rows
    rows.forEach(row => {
        const checkbox = row.querySelector('.row-checkbox');
        if (checkbox && checkbox.checked) {
            const id = row.getAttribute('data-id'); 
            idsToDelete.push(id);
        }
    });

    // Ensure there are IDs to delete
    if (idsToDelete.length === 0) {
        alert('No projects selected for deletion.');
        return;
    }

    // Send the selected IDs to the backend
    fetch('/projects/delete/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: idsToDelete }) 
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message); 
            populateTable(); 
            document.getElementById('cancel-selection-button').click(); 
        }
    })
    .catch(err => {
        console.error('Error deleting projects:', err);
        alert('Failed to delete projects. Check the console.');
    });
});


function handlePermissions() {

    if (currentUserPermission === 'admin') {

        addBtn.style.display = 'inline';
        document.getElementById('select-button').style.display = 'inline';
    } else if (currentUserPermission === 'add/edit') {

        addBtn.style.display = 'inline';
        document.getElementById('select-button').style.display = 'none';
    } else if (currentUserPermission === 'add/edit/delete') {

        addBtn.style.display = 'inline';
        document.getElementById('select-button').style.display = 'inline';
    } else {

        addBtn.style.display = 'none';
        document.getElementById('select-button').style.display = 'none';
    }
}

window.onload = () => {
    populateTable();
    handlePermissions();
};