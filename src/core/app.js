// src/core/app.js

import { DataStore } from './dataStore.js';
import { EventCoordinator } from '../events/eventCoordinator.js';
import { Renderer } from './renderer.js';
import { auth } from './firebaseConfig.js';
import { onAuthStateChanged } from "firebase/auth";
import { LoginModal } from '../modals/LoginModal.js';
import { NotificationSystem } from '../utils/notifications.js';

export class App {
    constructor() {
        this.dataStore = new DataStore();
        this.renderer = new Renderer(this.dataStore);
        this.eventCoordinator = new EventCoordinator(this.dataStore, this.renderer);
    }

    init() {
        console.log("🚀 Iniciando aplicación...");

        // 1. Intentar Inicializar UI y Eventos
        try {
            this.renderer.init();
            
            // Verificamos que el método exista antes de llamarlo para evitar crash
            if (typeof this.eventCoordinator.setupEventListeners === 'function') {
                this.eventCoordinator.setupEventListeners();
            } else if (typeof this.eventCoordinator.setup === 'function') {
                // Fallback por si tienes la versión vieja del archivo
                console.warn("⚠️ Usando 'setup()' antiguo en EventCoordinator.");
                this.eventCoordinator.setup();
            } else {
                console.error("❌ No se encontró método de setup en EventCoordinator");
            }

            console.log("✅ UI y Eventos inicializados.");
        } catch (error) {
            console.error("❌ Error crítico al inicializar UI:", error);
        }

        // 2. Verificar Auth
        if (!auth) {
            console.error("❌ Error: 'auth' no importado. Verifica firebaseConfig.js");
            return;
        }

        // 3. Listener de Autenticación
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("👤 Usuario detectado:", user.email);
                // Solo mostramos notificación si no se está recargando la página (opcional)
                // NotificationSystem.success(`Sesión: ${user.email}`, 2000);
                
                // Cargar datos
                this.dataStore.subscribeToRemoteChanges();
            } else {
                console.log("🔒 Sin sesión. Abriendo login...");
                LoginModal.show();
            }
        });
    }
}