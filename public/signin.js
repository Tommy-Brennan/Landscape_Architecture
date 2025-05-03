
function handleCredentialResponse(response) {
    // Send the credential token to backend for authentication
    fetch('/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
    })
    .then(async res => {
        if (!res.ok) {
            const errorData = await res.json();
            if (res.status === 401) {
                alert('You are not authorized to access this application.');
            } else {
                alert(`Login failed: ${errorData.error || 'Unknown error'}`);
            }
            throw new Error(errorData.error);
        }
        return res.json();
    })
    .then(data => {
        console.log('Login successful:', data);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard'; // Redirect to dashboard
    })
    .catch(err => console.error('Login failed', err));
}

async function signOut() {
    try {
        await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/login'; // or wherever your login page is
    } catch (err) {
        console.error('Logout failed:', err);
    }
};

function toggleAuthButtons(isLoggedIn) {
    const signInBtn = document.querySelector('.g_id_signin');
    const signOutBtn = document.getElementById('sign-out-btn');
    
    if (isLoggedIn) {
        signInBtn.style.display = 'none';
        signOutBtn.style.display = 'inline-block';
    } else {
        signInBtn.style.display = 'inline-block';
        signOutBtn.style.display = 'none';
    }
}

