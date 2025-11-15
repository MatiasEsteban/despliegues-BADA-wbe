// handlers/CduActionHandlers.js - Manejadores de acciones de CDU

import { Modal } from '../../modals/Modal.js';
import { HistorialModal } from '../../modals/HistorialModal.js';


export class CduActionHandlers {
    constructor(dataStore, renderer) {
        this.dataStore = dataStore;
        this.renderer = renderer;
    }

    /**
     * Muestra el historial de cambios del CDU
     */
    async handleHistorialClick(btn) {
        const cduId = parseInt(btn.dataset.cduId);
        const versiones = this.dataStore.getAll();
        let cdu = null;
        
        // Buscar el CDU en todas las versiones
        for (const version of versiones) {
            cdu = version.cdus.find(c => c.id === cduId);
            if (cdu) break;
        }
        
        if (cdu) {
            await HistorialModal.show(cdu.nombreCDU, cdu.historial || []);
        }
    }

    /**
     * Elimina un CDU con confirmación y animación
     */
    async handleEliminarClick(btn) {
        const cduId = parseInt(btn.dataset.cduId);
        
        let cduNombre = '';
        let versionNumero = '';
        
        // Buscar el CDU
        for (const version of this.dataStore.getAll()) {
            const cdu = version.cdus.find(c => c.id === cduId);
            if (cdu) {
                cduNombre = cdu.nombreCDU || 'Sin nombre';
                versionNumero = version.numero;
                break;
            }
        }
        
        // Confirmar con el usuario
        const confirmacion = await Modal.confirm(
            '¿Está seguro de eliminar este CDU?',
            'Confirmar Eliminación'
        );
        
        if (confirmacion) {
            // 1. Animación de salida rápida
            const row = document.querySelector(`tr[data-cdu-id="${cduId}"]`);
            if (row) {
                row.classList.add('removing');
                // Esperar solo la animación CSS (200ms)
                await new Promise(resolve => setTimeout(resolve, 200));
                row.remove();
            }
            
            // 2. Actualizar dataStore
            this.dataStore.addPendingChange({
                cduId,
                campo: 'cdu-eliminado',
                valorAnterior: `CDU: ${cduNombre}`,
                valorNuevo: null,
                cduNombre,
                versionNumero,
                timestamp: new Date().toISOString(),
                tipo: 'eliminacion'
            });
            
            this.dataStore.deleteCdu(cduId);
            
            // 3. Actualizar Virtual Scroll si está activo
            const version = this.dataStore.getAll().find(v => v.id === this.renderer.currentVersionId);
            if (version && this.renderer.virtualScroll && this.renderer.virtualScroll.currentCdus.length > 0) {
                this.renderer.virtualScroll.updateData(version.cdus);
            }
        }
    }
}