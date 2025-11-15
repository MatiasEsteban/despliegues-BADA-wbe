// stores/ChangeTracker.js - Sistema de cambios pendientes y snapshots

export class ChangeTracker {
    constructor(versionStore) {
        this.versionStore = versionStore;
        this.pendingChanges = [];
        this.changeObservers = [];
        this.snapshot = null;
    }

    /**
     * Suscripción a cambios
     */
    subscribe(callback) {
        this.changeObservers.push(callback);
    }

    notifyObservers() {
        this.changeObservers.forEach(callback => callback(this.pendingChanges));
    }

    /**
     * Obtiene cambios pendientes
     */
    getPendingChanges() {
        return this.pendingChanges;
    }

    hasPendingChanges() {
        return this.pendingChanges.length > 0;
    }

    /**
     * Agrega cambio pendiente con lógica de anulación
     */
    addPendingChange(change) {
        // Crear snapshot si es el primer cambio
        if (this.pendingChanges.length === 0) {
            this.createSnapshot();
        }
        
        // LÓGICA DE ANULACIÓN: Buscar cambios opuestos
        const oppositeIndex = this.findOppositeChange(change);
        
        if (oppositeIndex !== -1) {
            console.log('🔄 Cambio opuesto encontrado, anulando ambos');
            this.pendingChanges.splice(oppositeIndex, 1);
            
            // Si ya no hay cambios pendientes, limpiar snapshot
            if (this.pendingChanges.length === 0) {
                this.clearSnapshot();
            }
            
            this.notifyObservers();
            return;
        }
        
        // Verificar si ya existe un cambio para el mismo item y campo
        const existingIndex = this.findExistingChange(change);
        
        if (existingIndex !== -1) {
            const originalValorAnterior = this.pendingChanges[existingIndex].valorAnterior;
            
            // Si el nuevo valor es igual al original, eliminar el cambio
            if (change.valorNuevo === originalValorAnterior) {
                this.pendingChanges.splice(existingIndex, 1);
            } else {
                // Actualizar el cambio existente manteniendo el valorAnterior original
                this.pendingChanges[existingIndex] = {
                    ...change,
                    valorAnterior: originalValorAnterior
                };
            }
        } else {
            // Agregar nuevo cambio
            this.pendingChanges.push(change);
        }

        this.notifyObservers();
    }

    /**
     * Busca cambio opuesto para anular (crear vs eliminar)
     */
    findOppositeChange(change) {
        // Crear CDU vs Eliminar CDU
        if (change.tipo === 'creacion' && change.campo === 'creacion') {
            return this.pendingChanges.findIndex(
                c => c.cduId === change.cduId && 
                     c.tipo === 'eliminacion' && 
                     c.campo === 'cdu-eliminado'
            );
        }
        if (change.tipo === 'eliminacion' && change.campo === 'cdu-eliminado') {
            return this.pendingChanges.findIndex(
                c => c.cduId === change.cduId && 
                     c.tipo === 'creacion' && 
                     c.campo === 'creacion'
            );
        }
        
        // Agregar responsable vs Eliminar responsable
        if (change.campo === 'responsable-agregado') {
            return this.pendingChanges.findIndex(
                c => c.cduId === change.cduId && 
                     c.campo === 'responsable-eliminado' &&
                     c.index === change.index
            );
        }
        if (change.campo === 'responsable-eliminado') {
            for (let i = this.pendingChanges.length - 1; i >= 0; i--) {
                const c = this.pendingChanges[i];
                if (c.cduId === change.cduId && c.campo === 'responsable-agregado') {
                    return i;
                }
            }
        }
        
        // Agregar observación vs Eliminar observación
        if (change.campo === 'observacion-agregada') {
            return this.pendingChanges.findIndex(
                c => c.cduId === change.cduId && 
                     c.campo === 'observacion-eliminada' &&
                     c.index === change.index
            );
        }
        if (change.campo === 'observacion-eliminada') {
            for (let i = this.pendingChanges.length - 1; i >= 0; i--) {
                const c = this.pendingChanges[i];
                if (c.cduId === change.cduId && c.campo === 'observacion-agregada') {
                    return i;
                }
            }
        }
        
        // Agregar comentario de versión vs Eliminar comentario de versión
        if (change.campo && change.campo.includes('-agregado')) {
            const categoria = change.campo.replace('-agregado', '');
            return this.pendingChanges.findIndex(
                c => c.versionId === change.versionId &&
                     c.campo === categoria + '-eliminado' &&
                     c.index === change.index
            );
        }
        if (change.campo && change.campo.includes('-eliminado')) {
            const categoria = change.campo.replace('-eliminado', '');
            for (let i = this.pendingChanges.length - 1; i >= 0; i--) {
                const c = this.pendingChanges[i];
                if (c.versionId === change.versionId && 
                    c.campo === categoria + '-agregado') {
                    return i;
                }
            }
        }
        
        return -1;
    }

    /**
     * Busca cambio existente para el mismo item/campo
     */
    findExistingChange(change) {
        return this.pendingChanges.findIndex(
            c => c.cduId === change.cduId && 
                 c.campo === change.campo && 
                 c.versionId === change.versionId &&
                 (c.index === change.index || 
                  (c.index === undefined && change.index === undefined))
        );
    }

    /**
     * Gestión de snapshots
     */
    createSnapshot() {
        this.snapshot = JSON.parse(JSON.stringify({
            versiones: this.versionStore.getAll(),
            versionEnProduccionId: this.versionStore.getVersionEnProduccionId()
        }));
        console.log('📸 Snapshot creado');
    }

    clearSnapshot() {
        this.snapshot = null;
        console.log('🗑️ Snapshot limpiado');
    }

    restoreSnapshot() {
        if (this.snapshot) {
            this.versionStore.replaceAll(this.snapshot.versiones);
            this.versionStore.versionEnProduccionId = this.snapshot.versionEnProduccionId;
            console.log('↩️ Snapshot restaurado');
            return true;
        }
        return false;
    }

    /**
     * Confirma cambios pendientes
     */
    applyPendingChanges() {
        const appliedChanges = [...this.pendingChanges];
        
        // Los cambios ya están aplicados en versiones, solo limpiamos
        this.pendingChanges = [];
        this.clearSnapshot();
        
        console.log('✅ Cambios confirmados');
        
        this.notifyObservers();
        return appliedChanges;
    }

    /**
     * Descarta cambios pendientes y restaura snapshot
     */
    discardPendingChanges() {
        this.restoreSnapshot();
        this.pendingChanges = [];
        this.clearSnapshot();
        
        console.log('↩️ Cambios revertidos');
        
        this.notifyObservers();
    }

    /**
     * Limpia todo el estado
     */
    reset() {
        this.pendingChanges = [];
        this.clearSnapshot();
        this.notifyObservers();
    }
}