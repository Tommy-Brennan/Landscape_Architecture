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

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in by verifying if the JWT is stored
    const isLoggedIn = document.cookie.includes('token=');
    toggleAuthButtons(isLoggedIn); // Show appropriate buttons on page load
});