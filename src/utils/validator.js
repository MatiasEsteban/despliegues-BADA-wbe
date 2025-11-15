// validator.js - Sistema de validaciones de campos con soporte para responsables con roles

export class Validator {
    // Validar una versión completa
    static validateVersion(version) {
        const errors = [];
        
        if (!version.numero || version.numero.trim() === '') {
            errors.push({
                field: 'numero',
                message: 'El número de versión es obligatorio'
            });
        }
        
        if (!version.fechaDespliegue || version.fechaDespliegue === '') {
            errors.push({
                field: 'fechaDespliegue',
                message: 'La fecha de despliegue es obligatoria'
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    // Validar un CDU con nuevo formato de responsables
    static validateCdu(cdu) {
        const errors = [];
        
        if (!cdu.nombreCDU || cdu.nombreCDU.trim() === '') {
            errors.push({
                field: 'nombreCDU',
                message: 'El nombre del CDU es obligatorio'
            });
        }
        
        if (!cdu.descripcionCDU || cdu.descripcionCDU.trim() === '') {
            errors.push({
                field: 'descripcionCDU',
                message: 'La descripción es obligatoria'
            });
        }
        
        // CORREGIDO: Validar nuevo formato de responsables (array)
        let tieneResponsable = false;
        
        // Verificar formato NUEVO (array de objetos)
        if (Array.isArray(cdu.responsables) && cdu.responsables.length > 0) {
            // Verificar que al menos un responsable tenga nombre
            tieneResponsable = cdu.responsables.some(r => r.nombre && r.nombre.trim() !== '');
        } 
        // Verificar formato ANTIGUO (campo responsable)
        else if (cdu.responsable && cdu.responsable.trim() !== '') {
            tieneResponsable = true;
        }
        
        if (!tieneResponsable) {
            errors.push({
                field: 'responsables',
                message: 'El CDU debe tener al menos un responsable con nombre'
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    // Validar todas las versiones
    static validateAllVersions(versiones) {
        const allErrors = [];
        
        versiones.forEach((version, vIndex) => {
            const versionValidation = this.validateVersion(version);
            if (!versionValidation.isValid) {
                allErrors.push({
                    versionId: version.id,
                    versionNumber: version.numero || `Versión ${vIndex + 1}`,
                    type: 'version',
                    errors: versionValidation.errors
                });
            }
            
            version.cdus.forEach((cdu, cIndex) => {
                const cduValidation = this.validateCdu(cdu);
                if (!cduValidation.isValid) {
                    allErrors.push({
                        versionId: version.id,
                        versionNumber: version.numero || `Versión ${vIndex + 1}`,
                        cduId: cdu.id,
                        cduName: cdu.nombreCDU || `CDU ${cIndex + 1}`,
                        type: 'cdu',
                        errors: cduValidation.errors
                    });
                }
            });
        });
        
        return {
            isValid: allErrors.length === 0,
            errors: allErrors
        };
    }
    
    // Mostrar error visual en un campo
    static showFieldError(element, message) {
        if (!element) return;
        
        // Agregar clase de error
        element.classList.add('campo-invalido');
        
        // Crear y mostrar mensaje
        const errorMsg = document.createElement('div');
        errorMsg.className = 'validation-message';
        errorMsg.textContent = message;
        
        const parent = element.parentElement;
        const existingMsg = parent.querySelector('.validation-message');
        if (existingMsg) {
            existingMsg.remove();
        }
        
        parent.style.position = 'relative';
        parent.appendChild(errorMsg);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            element.classList.remove('campo-invalido');
            errorMsg.remove();
        }, 3000);
        
        // Focus en el campo
        element.focus();
    }
    
    // Limpiar errores visuales
    static clearFieldErrors() {
        document.querySelectorAll('.campo-invalido').forEach(el => {
            el.classList.remove('campo-invalido');
        });
        document.querySelectorAll('.validation-message').forEach(el => {
            el.remove();
        });
    }
    
    // Generar reporte de validación
    static generateValidationReport(validationResult) {
        if (validationResult.isValid) {
            return 'Todas las validaciones pasaron correctamente ✓';
        }
        
        let report = `Se encontraron ${validationResult.errors.length} errores:\n\n`;
        
        validationResult.errors.forEach((error, index) => {
            report += `${index + 1}. ${error.versionNumber}`;
            if (error.type === 'cdu') {
                report += ` - ${error.cduName}`;
            }
            report += ':\n';
            
            error.errors.forEach(err => {
                report += `   • ${err.message}\n`;
            });
            report += '\n';
        });
        
        return report;
    }
}