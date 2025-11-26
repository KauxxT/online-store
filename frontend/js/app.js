// Main application initialization
document.addEventListener('DOMContentLoaded', function() {
    // Profile link handler
    const profileLink = document.getElementById('profile-link');
    if (profileLink) {
        profileLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (authManager.isLoggedIn() && !authManager.isAdmin()) {
                window.location.href = '/profile.html';
            } else {
                authManager.showNotification('Войдите как пользователь для доступа к личному кабинету');
            }
        });
    }

    // Admin link handler
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.addEventListener('click', function(e) {
            if (!authManager.isAdmin()) {
                e.preventDefault();
                authManager.showNotification('Доступ только для администраторов');
            }
        });
    }

    // Initialize managers
    console.log('Online Store initialized');
});