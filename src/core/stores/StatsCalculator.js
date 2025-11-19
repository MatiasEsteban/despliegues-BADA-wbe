// src/core/stores/StatsCalculator.js - Cálculo de estadísticas

export class StatsCalculator {
    constructor(versionStore) {
        this.versionStore = versionStore;
    }

    /**
     * Calcula el % de progreso total de una versión
     * Enfoque: Promedio Ponderado (Pesos iguales = 100)
     * Se suma el % de avance de cada CDU y se divide por la cantidad de CDUs.
     */
    calculateVersionProgress(versionId) {
        const version = this.versionStore.getById(versionId);
        if (!version || !version.cdus || version.cdus.length === 0) return 0;

        let sumOfPercentages = 0;
        const totalCdus = version.cdus.length;

        // Calcular % individual de cada CDU
        version.cdus.forEach(cdu => {
            const pasos = cdu.pasos || [];
            if (pasos.length > 0) {
                const completed = pasos.filter(p => p.completado).length;
                // Porcentaje de este CDU (0 a 100)
                const cduProgress = (completed / pasos.length) * 100;
                sumOfPercentages += cduProgress;
            } else {
                // Si el CDU no tiene pasos definidos, su contribución es 0%
                sumOfPercentages += 0;
            }
        });

        // Cálculo del promedio (Equivalente a peso 100 por CDU)
        // Fórmula: (∑ %CDU) / Total_CDUs
        return Math.round(sumOfPercentages / totalCdus);
    }

    /**
     * Calcula estadísticas únicas (por UUID)
     */
    getUniqueStats() {
        const cduMap = new Map();
        const versiones = this.versionStore.getAll();
        
        for (let i = versiones.length - 1; i >= 0; i--) {
            const version = versiones[i];
            version.cdus.forEach(cdu => {
                const uuid = cdu.uuid;
                if (uuid && !cduMap.has(uuid)) {
                    cduMap.set(uuid, cdu.estado);
                }
            });
        }
        
        const stats = { total: 0, desarrollo: 0, pendiente: 0, certificado: 0, produccion: 0 };
        
        cduMap.forEach(estado => {
            stats.total++;
            switch(estado) {
                case 'En Desarrollo': stats.desarrollo++; break;
                case 'Pendiente de Certificacion': stats.pendiente++; break;
                case 'Certificado OK': stats.certificado++; break;
                case 'En Produccion': stats.produccion++; break;
            }
        });
        
        return stats;
    }

    getGlobalStats() {
        const stats = { total: 0, desarrollo: 0, pendiente: 0, certificado: 0, produccion: 0 };
        this.versionStore.getAll().forEach(version => {
            version.cdus.forEach(cdu => {
                stats.total++;
                switch(cdu.estado) {
                    case 'En Desarrollo': stats.desarrollo++; break;
                    case 'Pendiente de Certificacion': stats.pendiente++; break;
                    case 'Certificado OK': stats.certificado++; break;
                    case 'En Produccion': stats.produccion++; break;
                }
            });
        });
        return stats;
    }

    getVersionStats(versionId) {
        const version = this.versionStore.getById(versionId);
        if (!version) return { total: 0, desarrollo: 0, pendiente: 0, certificado: 0, produccion: 0 };
        
        const stats = { total: version.cdus.length, desarrollo: 0, pendiente: 0, certificado: 0, produccion: 0 };
        
        version.cdus.forEach(cdu => {
            switch(cdu.estado) {
                case 'En Desarrollo': stats.desarrollo++; break;
                case 'Pendiente de Certificacion': stats.pendiente++; break;
                case 'Certificado OK': stats.certificado++; break;
                case 'En Produccion': stats.produccion++; break;
            }
        });
        return stats;
    }

    getTotalUniqueCdus() {
        const uuidSet = new Set();
        this.versionStore.getAll().forEach(version => {
            version.cdus.forEach(cdu => { if (cdu.uuid) uuidSet.add(cdu.uuid); });
        });
        return uuidSet.size;
    }

    getTotalVersions() {
        return this.versionStore.getAll().length;
    }

    getAggregatedStats() {
        return {
            unique: this.getUniqueStats(),
            global: this.getGlobalStats(),
            totalVersions: this.getTotalVersions(),
            totalUniqueCdus: this.getTotalUniqueCdus()
        };
    }
}