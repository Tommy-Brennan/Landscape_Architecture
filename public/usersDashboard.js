const form = document.getElementById('form-map-container');
const addBtn = document.getElementById('add-button');
const span = document.querySelector('.close');
const submitButton = document.getElementById('submit-button');
const currentUserPermission = sessionStorage.getItem('user') ? JSON.parse(sessionStorage.getItem('user')).permissions : null;


function populateTable() {
    fetch('/users')
        .then(res => res.json())
        .then(data => {
            const tableBody = document.getElementById('users-table');
            tableBody.innerHTML = '';

            data.forEach(user => {
                const row = document.createElement('tr');
                row.setAttribute('data-id', user.user_id);
                row.innerHTML = `
                    <td>${user.email}</td>
                    <td>${user.permissions}</td>
                    <td>
                        <button 
                            class="edit-button" 
                            data-id="${user.user_id}" 
                            ${currentUserPermission !== 'admin' ? 'disabled style="background-color: #ccc; cursor: not-allowed;"' : ''}>
                            Edit
                        </button>
                    </td>
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

function addToDatabase(project) {
    fetch('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
    }).then(() => console.log('Project added:', project));
}

function extractFormValues() {
    return {
        email: document.getElementById('email').value,
        permissions: document.getElementById('permissions').value,
    };
}

function handleFormSubmit(event) {
    event.preventDefault();

    const user = extractFormValues();

    // Wait for the POST request to finish before refreshing the table
    fetch('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
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
        console.error('Error adding user:', err);
        alert('Error saving user. Check the console.');
    });
};


function openEditForm(id) {
    fetch(`/users/${id}`)
        .then(res => {
            if (!res.ok) {
                return res.text().then(errorText => {
                    throw new Error(`Failed to load user data: ${errorText}`);
                });
            }
            return res.json();
        })
        .then(user => {
            populateForm(user);
            openModal();

            form.onsubmit = (event) => {
                event.preventDefault();
                const updatedUser = extractFormValues();
                updatedUser.user_id = id;

                fetch(`/users/update`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedUser)
                })
                    .then(response => {
                        if (!response.ok) {
                            return response.text().then(errorText => {
                                throw new Error(`Failed to update user: ${errorText}`);
                            });
                        }
                        populateTable();
                        closeModal();
                        console.log('User updated:', updatedUser);
                    })
                    .catch(err => {
                        console.error('Error:', err);
                        alert(`An error occurred: ${err.message}`);
                    });
            };

            submitButton.textContent = 'Update';
        })
        .catch(err => {
            console.error('Error loading user:', err);
            alert(`Failed to load user: ${err.message}`);
        });
}



function populateForm(user) {
    document.getElementById('email').value = user.email;
    document.getElementById('permissions').value = user.permissions;

}


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
}

function closeModal() {
    form.style.display = 'none';
}


document.getElementById('select-button').addEventListener('click', () => {
    const rows = document.querySelectorAll('#users-table tr');
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

    // Add the "Select" header cell at the beginning of the header row
    const headerRow = document.querySelector('#users-table').closest('table').querySelector('thead tr');
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
    // Remove all checkboxes
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.closest('td').remove();
    });

    // Remove select header cell
    const headerRow = document.querySelector('#users-table').previousElementSibling;
    const selectHeader = headerRow.querySelector('.select-header');
    if (selectHeader) selectHeader.remove();

    document.getElementById('table-controls').style.display = 'none';
    document.getElementById('select-button').style.display = 'inline';
});


document.getElementById('delete-button').addEventListener('click', () => {
    const rows = document.querySelectorAll('#users-table tr');
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
        alert('No users selected for deletion.');
        return;
    }

    // Send the selected IDs to the backend
    fetch('/users/delete/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: idsToDelete })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(errorText => {
                throw new Error(`Failed to delete users: ${errorText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.message) {
            alert(data.message); 
            populateTable(); 
            document.getElementById('cancel-selection-button').click(); 
        }
    })
    .catch(err => {
        console.error('Error deleting users:', err);
        alert(`Failed to delete user: ${err.message}`);
    });
});


function handlePermissions() {

    if (currentUserPermission === 'admin') {

        addBtn.style.display = 'inline';
        document.getElementById('select-button').style.display = 'inline';
    } else if (currentUserPermission === 'add/edit') {

        addBtn.style.display = 'none';
        document.getElementById('select-button').style.display = 'none';
    } else if (currentUserPermission === 'add/edit/delete') {

        addBtn.style.display = 'none';
        document.getElementById('select-button').style.display = 'none';
    } else {

        addBtn.style.display = 'none';
        document.getElementById('select-button').style.display = 'none';
    }
}

window.onload = () => {
    populateTable();
    handlePermissions();
};