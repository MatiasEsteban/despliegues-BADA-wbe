// main.js - Punto de entrada de la aplicación

import { App } from './src/core/app.js';

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
    
    // Exportar para acceso global si es necesario
    window.DesplieguesApp = app;
});