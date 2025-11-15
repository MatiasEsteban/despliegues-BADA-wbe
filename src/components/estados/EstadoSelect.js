// EstadoSelect.js - Componente de select de estado con iconos

export class EstadoSelect {
    static create(estadoActual, cduId = null) {
        const opciones = ['En Desarrollo', 'Pendiente de Certificacion', 'Certificado OK', 'En Produccion'];
        
        const container = document.createElement('div');
        container.className = 'estado-select-container ' + this.getEstadoClass(estadoActual);
        
        const display = document.createElement('div');
        display.className = 'estado-display';
        display.innerHTML = `
            ${this.getEstadoIcon(estadoActual)}
            <span>${estadoActual}</span>
        `;
        
        const select = document.createElement('select');
        select.className = 'campo-estado';
        select.setAttribute('data-campo', 'estado');
        
        // CRÍTICO: Agregar data-cdu-id al select
        if (cduId !== null) {
            select.dataset.cduId = cduId;
        }
        
        opciones.forEach(opcion => {
            const option = document.createElement('option');
            option.value = opcion;
            option.textContent = opcion;
            if (estadoActual === opcion) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        container.appendChild(display);
        container.appendChild(select);
        return container;
    }

    static getEstadoIcon(estado) {
        const icons = {
            'En Desarrollo': `<svg class="estado-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>`,
            'Pendiente de Certificacion': `<svg class="estado-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>`,
            'Certificado OK': `<svg class="estado-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>`,
            'En Produccion': `<svg class="estado-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>`
        };
        return icons[estado] || '';
    }

    static getEstadoClass(estado) {
        const classes = {
            'En Desarrollo': 'estado-desarrollo',
            'Pendiente de Certificacion': 'estado-pendiente',
            'Certificado OK': 'estado-certificado',
            'En Produccion': 'estado-produccion'
        };
        return classes[estado] || 'estado-desarrollo';
    }
}