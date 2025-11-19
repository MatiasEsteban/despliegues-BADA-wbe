// main.js - Punto de entrada de la aplicación

import { App } from './src/core/app.js';
// Importamos nuestro nuevo observador
import { observeAuthState } from './src/core/authService.js'; // <--- SIN CAMBIOS

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    
    // ¡CAMBIO CLAVE!
    // 1. Configurar los listeners de autenticación INMEDIATAMENTE.
    //    Esto conecta el botón "Ingresar" y "Salir".
    app.eventCoordinator.setupAuthEvents(); 
            
    // 2. Observar el estado de autenticación.
    //    observeAuthState llamará a app.init() CUANDO el login sea exitoso.
    observeAuthState(app); 
    
    // Exportar para acceso global si es necesario
    window.DesplieguesApp = app;
});