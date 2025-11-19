// src/core/authService.js
import { auth } from './firebaseConfig.js';
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "firebase/auth";

// Función para manejar el login
export function handleLogin(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

// Función para manejar el logout
export function handleLogout() {
    return signOut(auth);
}

// Función CLAVE: Observa los cambios de autenticación
export function observeAuthState(app) {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.querySelector('.container');
    const loginError = document.getElementById('login-error');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuario ESTÁ logueado
            console.log("Usuario autenticado:", user.email);
            if (appContainer) appContainer.style.display = 'block';
            if (loginContainer) loginContainer.style.display = 'none';
            if (loginError) loginError.textContent = '';
            
            // ¡AHORA SÍ inicializamos la app!
            // Verificamos si la app ya fue inicializada para evitar dobles cargas
            if (!window.DesplieguesAppInitialized) {
                app.init();
                window.DesplieguesAppInitialized = true;
            }

        } else {
            // Usuario NO está logueado
            console.log("No hay usuario, mostrando login.");
            if (appContainer) appContainer.style.display = 'none';
            if (loginContainer) loginContainer.style.display = 'block';
            window.DesplieguesAppInitialized = false;
        }
    });
}