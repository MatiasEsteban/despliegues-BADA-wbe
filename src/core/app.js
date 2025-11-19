// src/core/app.js (Modificado)

import { DataStore } from './dataStore.js';
import { EventCoordinator } from '../events/eventCoordinator.js';
import { Renderer } from './renderer.js';
// import { StorageManager } from './storageManager.js'; // <- ELIMINADO

export class App {
    constructor() {
        this.dataStore = new DataStore();
        this.renderer = new Renderer(this.dataStore);
        this.eventCoordinator = new EventCoordinator(this.dataStore, this.renderer);
    }

    init() {
        // init() ahora es llamado DESPUÉS del login.
        
        // ...nos suscribimos a los cambios de Firebase.
        this.dataStore.subscribeToRemoteChanges();
        
        this.renderer.init();

        // Configura solo los listeners de la app principal
        this.eventCoordinator.setupAppEventListeners(); // <-- CAMBIADO
    }
}