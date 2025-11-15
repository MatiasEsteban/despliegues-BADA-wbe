// stores/StatsCalculator.js - Cálculo de estadísticas

export class StatsCalculator {
    constructor(versionStore) {
        this.versionStore = versionStore;
    }

    /**
     * Calcula estadísticas únicas (por UUID)
     * Solo cuenta cada CDU una vez, tomando su estado más reciente
     */
    getUniqueStats() {
        const cduMap = new Map();
        const versiones = this.versionStore.getAll();
        
        // Recorrer versiones de la más reciente a la más antigua
        for (let i = versiones.length - 1; i >= 0; i--) {
            const version = versiones[i];
            
            version.cdus.forEach(cdu => {
                const uuid = cdu.uuid;
                
                // Solo guardar el primer estado encontrado (más reciente)
                if (uuid && !cduMap.has(uuid)) {
                    cduMap.set(uuid, cdu.estado);
                }
            });
        }
        
        // Contar por estado
        const stats = {
            total: 0,
            desarrollo: 0,
            pendiente: 0,
            certificado: 0,
            produccion: 0
        };
        
        cduMap.forEach(estado => {
            stats.total++;
            
            switch(estado) {
                case 'En Desarrollo':
                    stats.desarrollo++;
                    break;
                case 'Pendiente de Certificacion':
                    stats.pendiente++;
                    break;
                case 'Certificado OK':
                    stats.certificado++;
                    break;
                case 'En Produccion':
                    stats.produccion++;
                    break;
            }
        });
        
        return stats;
    }

    /**
     * Calcula estadísticas globales
     * Cuenta todos los CDUs en todas las versiones (con repeticiones)
     */
    getGlobalStats() {
        const stats = {
            total: 0,
            desarrollo: 0,
            pendiente: 0,
            certificado: 0,
            produccion: 0
        };
        
        this.versionStore.getAll().forEach(version => {
            version.cdus.forEach(cdu => {
                stats.total++;
                
                switch(cdu.estado) {
                    case 'En Desarrollo':
                        stats.desarrollo++;
                        break;
                    case 'Pendiente de Certificacion':
                        stats.pendiente++;
                        break;
                    case 'Certificado OK':
                        stats.certificado++;
                        break;
                    case 'En Produccion':
                        stats.produccion++;
                        break;
                }
            });
        });
        
        return stats;
    }

    /**
     * Estadísticas de una versión específica
     */
    getVersionStats(versionId) {
        const version = this.versionStore.getById(versionId);
        if (!version) {
            return {
                total: 0,
                desarrollo: 0,
                pendiente: 0,
                certificado: 0,
                produccion: 0
            };
        }
        
        const stats = {
            total: version.cdus.length,
            desarrollo: 0,
            pendiente: 0,
            certificado: 0,
            produccion: 0
        };
        
        version.cdus.forEach(cdu => {
            switch(cdu.estado) {
                case 'En Desarrollo':
                    stats.desarrollo++;
                    break;
                case 'Pendiente de Certificacion':
                    stats.pendiente++;
                    break;
                case 'Certificado OK':
                    stats.certificado++;
                    break;
                case 'En Produccion':
                    stats.produccion++;
                    break;
            }
        });
        
        return stats;
    }

    /**
     * Obtiene el total de CDUs únicos
     */
    getTotalUniqueCdus() {
        const uuidSet = new Set();
        
        this.versionStore.getAll().forEach(version => {
            version.cdus.forEach(cdu => {
                if (cdu.uuid) {
                    uuidSet.add(cdu.uuid);
                }
            });
        });
        
        return uuidSet.size;
    }

    /**
     * Obtiene el total de versiones
     */
    getTotalVersions() {
        return this.versionStore.getAll().length;
    }

    /**
     * Estadísticas agregadas (para resúmenes)
     */
    getAggregatedStats() {
        return {
            unique: this.getUniqueStats(),
            global: this.getGlobalStats(),
            totalVersions: this.getTotalVersions(),
            totalUniqueCdus: this.getTotalUniqueCdus()
        };
    }
}