// debouncer.js - Utilidad para optimizar eventos repetitivos

export class Debouncer {
    /**
     * Crea una función debounced que retrasa la invocación hasta que
     * hayan pasado 'wait' milisegundos desde la última vez que fue invocada
     * 
     * @param {Function} func - Función a ejecutar
     * @param {number} wait - Milisegundos a esperar (default: 300ms)
     * @returns {Function} Función debounced
     */
    static debounce(func, wait = 300) {
        let timeout;
        
        return function executedFunction(...args) {
            const context = this;
            
            // Limpiar timeout anterior
            clearTimeout(timeout);
            
            // Crear nuevo timeout
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    /**
     * Versión inmediata del debounce - ejecuta en el primer evento,
     * luego ignora eventos subsecuentes hasta que pase el tiempo de espera
     * 
     * @param {Function} func - Función a ejecutar
     * @param {number} wait - Milisegundos a esperar
     * @returns {Function} Función debounced
     */
    static debounceImmediate(func, wait = 300) {
        let timeout;
        
        return function executedFunction(...args) {
            const context = this;
            const callNow = !timeout;
            
            clearTimeout(timeout);
            
            timeout = setTimeout(() => {
                timeout = null;
            }, wait);
            
            if (callNow) {
                func.apply(context, args);
            }
        };
    }
    
    /**
     * Throttle - ejecuta la función máximo una vez cada 'wait' milisegundos
     * Útil para eventos de scroll o resize
     * 
     * @param {Function} func - Función a ejecutar
     * @param {number} wait - Milisegundos mínimos entre ejecuciones
     * @returns {Function} Función throttled
     */
    static throttle(func, wait = 300) {
        let inThrottle;
        
        return function executedFunction(...args) {
            const context = this;
            
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                
                setTimeout(() => {
                    inThrottle = false;
                }, wait);
            }
        };
    }
}