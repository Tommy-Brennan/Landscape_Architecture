let rightSidebarOpen = false;
let leftSidebarOpen = false;
const collapseButton = document.getElementById('collapseButton');
let lastClickedMarker = null;
const hamburgerToggle = document.getElementById('hamburgerToggle');
const map = L.map('map').setView([38.9072, -77.0369], 8);

L.tileLayer('https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=OnXBtQJuRfAynPnVkfBw', {
  attribution: '&copy; MapTiler & OpenStreetMap contributors'
}).addTo(map);


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

//Initialize the sidebar
const sidebar = L.control.sidebar({
  container: 'sidebar',
  position: 'right'
}).addTo(map);

// Handle collapse/expand for right sidebar
collapseButton.addEventListener('click', () => {
  if (rightSidebarOpen) {
    sidebar.close();
    rightSidebarOpen = false;
    collapseButton.style.display = 'none';
  }
});

// initialize left sidebar
// const leftSidebar = L.control.sidebar({
// container: 'leftSidebar',
// position: 'left'
// }).addTo(map);

// document.querySelector('a[href="#menu"]').addEventListener('click', () => {
//   if (leftSidebarOpen) {
//     leftSidebar.close();
//     hamburgerToggle.classList.remove('rotate-hamburger');
//   } else {
//     leftSidebar.open('menu');
//     hamburgerToggle.classList.add('rotate-hamburger');
//   }
//   leftSidebarOpen = !leftSidebarOpen;
// });

// Fetch projects from the database and add markers to the map
fetch('/projects')
.then(response => response.json())
.then(data => {
  data.forEach(project => {
    const marker = L.marker([project.lat, project.lng]).addTo(map);

    marker.on('click', () => {
      // If same marker and sidebar is open, toggle it closed
      if (rightSidebarOpen && lastClickedMarker === marker) {
        sidebar.close();
        rightSidebarOpen = false;
        collapseButton.style.display = 'none';
        lastClickedMarker = null;
        return;
      }

      // If different marker is clicked while sidebar is open, close it first
      if (rightSidebarOpen && lastClickedMarker !== marker) {
        sidebar.close();
        rightSidebarOpen = false;

        // Delay opening so the sidebar visibly closes first
        setTimeout(() => {
          openSidebarWithContent(project, marker);
        }, 550); // Adjust this delay to match sidebar's close animation
      } else {
        openSidebarWithContent(project, marker);
      }
    });
  });
})
.catch(error => console.error('Error fetching projects:', error));

function openSidebarWithContent(project, marker) {
sidebar.open('markerInfo');
rightSidebarOpen = true;
lastClickedMarker = marker;
collapseButton.style.display = 'inline';
collapseButton.innerHTML = '<i class="fa fa-arrow-right"></i>';

document.getElementById('sidebar-content').innerHTML = `
  <h2>${project.projectName}</h2>
  <p><strong>Main Partner:</strong> ${project.mainPartner}</p>
  <p><strong>Other Partners:</strong> ${project.otherpartners}</p>
  <p><strong>Project Type:</strong> ${project.projectType}</p>
  <p><strong>Area Scope:</strong> ${project.areaScope}</p>
  <p><strong>Deliverables:</strong> ${project.deliverables}</p>
  <p><strong>Link:</strong> <a href="${project.link}" target="_blank">${project.link}</a></p>
  <iframe src="${project.link}/preview" width="640px" height: 480px;" allow="autoplay"></iframe>
`;
}

  // Close sidebar when clicking outside of it
  map.on('click', () => {
    if (rightSidebarOpen) {
      sidebar.close();
      rightSidebarOpen = false;
      collapseButton.style.display = 'none';
    }
  });
