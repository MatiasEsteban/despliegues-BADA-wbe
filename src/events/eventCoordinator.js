// eventCoordinator.js - Coordinador central de eventos

import { TableEvents } from './tableEvents.js';
import { VersionEvents } from './versionEvents.js';
import { FilterEvents } from './filterEvents.js';
import { NavigationEvents } from './navigationEvents.js';
// Importa las funciones de authService
import { handleLogin, handleLogout } from '../core/authService.js'; 

export class EventCoordinator {
    constructor(dataStore, renderer) {
        this.dataStore = dataStore;
        this.renderer = renderer;
        this.saveButton = null;
        
        // Inicializar manejadores de eventos
        this.tableEvents = new TableEvents(dataStore, renderer);
        this.versionEvents = new VersionEvents(dataStore, renderer);
        this.filterEvents = new FilterEvents(dataStore, renderer);
        this.navigationEvents = new NavigationEvents(dataStore, renderer);
        
        console.log('🎯 EventCoordinator constructor iniciado');
    }

    // ESTE MÉTODO SE ELIMINA (su contenido se divide en los 2 de abajo)
    // setupEventListeners() { ... }


    /**
     * Configura SOLO los listeners de autenticación.
     * Se llama inmediatamente al cargar la página desde main.js.
     */
    setupAuthEvents() {
        const btnLogin = document.getElementById('btn-login');
        const loginError = document.getElementById('login-error');

        if (btnLogin) {
            btnLogin.addEventListener('click', async () => {
                const emailInput = document.getElementById('login-email');
                const passwordInput = document.getElementById('login-password');
                
                if (!emailInput || !passwordInput) return;

                const email = emailInput.value;
                const password = passwordInput.value;
                
                try {
                    if(loginError) loginError.textContent = 'Ingresando...';
                    await handleLogin(email, password);
                    // onAuthStateChanged se encargará del resto
                } catch (error) {
                    console.error("Error de login:", error.code);
                    if (loginError) {
                        // Códigos de error comunes para credenciales inválidas
                        if (error.code === 'auth/invalid-credential' || 
                            error.code === 'auth/wrong-password' || 
                            error.code === 'auth/user-not-found' ||
                            error.code === 'auth/invalid-login-credentials') {
                            
                            loginError.textContent = 'Email o contraseña incorrecta.';
                        } else {
                            loginError.textContent = 'Error al iniciar sesión.';
                        }
                    }
                }
            });
        }
        
        // El listener de Logout SÍ puede estar aquí,
        // porque el botón de logout solo es visible
        // cuando la app principal está cargada.
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', async () => {
                await handleLogout();
                // onAuthStateChanged se encargará de mostrar el login
            });
        }
        console.log('✅ Eventos de autenticación configurados');
    }

    /**
     * Configura todos los listeners de la aplicación principal.
     * Se llama DESPUÉS de un login exitoso (desde app.init()).
     */
    setupAppEventListeners() {
        this.setupThemeToggle();
        this.navigationEvents.setup();
        this.versionEvents.setup();
        this.tableEvents.setup();
        this.filterEvents.setup();
        this.setupSaveChangesButton();
        
        console.log('✅ Event listeners de la APP configurados correctamente');
    }

    setupThemeToggle() {
        const btnTheme = document.getElementById('btn-theme-toggle');
        const sunIcon = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>`;
        const moonIcon = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>`;

        // Comprobación de existencia del botón
        if (btnTheme) {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            btnTheme.innerHTML = savedTheme === 'dark' ? sunIcon : moonIcon;

            btnTheme.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                btnTheme.innerHTML = newTheme === 'dark' ? sunIcon : moonIcon;
            });
        } else {
            console.warn("#btn-theme-toggle no encontrado");
        }
    }

    setupSaveChangesButton() {
        this.saveButton = document.createElement('button');
        this.saveButton.id = 'btn-save-changes';
        this.saveButton.className = 'btn-save-changes hidden';
        this.saveButton.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>Guardar Cambios</span>
            <span class="changes-count">0</span>
        `;
        document.body.appendChild(this.saveButton);

        this.dataStore.subscribeToChanges((changes) => {
            const count = changes.length;
            if (count > 0) {
                this.saveButton.classList.remove('hidden');
                this.saveButton.querySelector('.changes-count').textContent = count;
            } else {
                this.saveButton.classList.add('hidden');
            }
        });

        this.saveButton.addEventListener('click', async () => {
            await this.versionEvents.handleSaveChanges();
        });

        console.log('✅ Botón de guardar cambios configurado');
    }
}