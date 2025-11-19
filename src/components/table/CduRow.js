// src/components/table/CduRow.js

import { EstadoSelect } from '../estados/EstadoSelect.js';

export class CduRow {
    static create(cdu) {
        const tr = document.createElement('tr');
        tr.dataset.cduId = cdu.id;
        
        // 1. CDU
        const tdCDU = document.createElement('td');
        const cduContainer = document.createElement('div');
        cduContainer.className = 'cdu-cell-with-actions';
        
        const inputCDU = this.createInput('text', 'campo-cdu', cdu.nombreCDU, 'nombreCDU', 'Nombre CDU');
        inputCDU.dataset.cduId = cdu.id;
        
        const btnHistorial = document.createElement('button');
        btnHistorial.className = 'btn-historial';
        btnHistorial.type = 'button';
        btnHistorial.title = 'Ver historial';
        btnHistorial.dataset.cduId = cdu.id;
        btnHistorial.dataset.action = 'show-historial';
        btnHistorial.innerHTML = `<svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>`;
        
        cduContainer.appendChild(inputCDU);
        cduContainer.appendChild(btnHistorial);
        tdCDU.appendChild(cduContainer);
        tr.appendChild(tdCDU);
        
        // 2. Descripción
        const tdDescripcion = document.createElement('td');
        const textareaDescripcion = this.createTextarea(cdu.descripcionCDU, 'descripcionCDU', 'Descripción del CDU');
        textareaDescripcion.className = 'campo-descripcion';
        textareaDescripcion.dataset.cduId = cdu.id;
        tdDescripcion.appendChild(textareaDescripcion);
        tr.appendChild(tdDescripcion);
        
        // 3. Estado
        const tdEstado = document.createElement('td');
        const selectEstado = EstadoSelect.create(cdu.estado, cdu.id);
        tdEstado.appendChild(selectEstado);
        tr.appendChild(tdEstado);
        
        // 4. Métrica BADA (Gráfico)
        const tdVersionBADA = document.createElement('td');
        tdVersionBADA.appendChild(this.createBadaGraph(cdu));
        tr.appendChild(tdVersionBADA);

        // 5. Versión Miró
        const tdVersionMiro = document.createElement('td');
        const inputVersionMiro = this.createInput('text', 'campo-version-miro', cdu.versionMiro, 'versionMiro', 'V__');
        inputVersionMiro.dataset.cduId = cdu.id;
        inputVersionMiro.maxLength = 3;
        tdVersionMiro.appendChild(inputVersionMiro);
        tr.appendChild(tdVersionMiro);

        // 6. PASOS (PERSISTENTE)
        const tdPasos = document.createElement('td');
        tdPasos.appendChild(this.createPasosContainer(cdu));
        tr.appendChild(tdPasos);
        
        // 7. Responsables
        const tdResponsables = document.createElement('td');
        const containerResponsables = this.createResponsablesContainer(cdu);
        tdResponsables.appendChild(containerResponsables);
        tr.appendChild(tdResponsables);
        
        // 8. Observaciones
        const tdObservaciones = document.createElement('td');
        const containerObservaciones = this.createObservacionesContainer(cdu);
        tdObservaciones.appendChild(containerObservaciones);
        tr.appendChild(tdObservaciones);
        
        // 9. Acciones
        const tdAcciones = document.createElement('td');
        tdAcciones.style.textAlign = 'center';
        const btnEliminar = this.createBotonEliminar(cdu.id);
        tdAcciones.appendChild(btnEliminar);
        tr.appendChild(tdAcciones);
        
        return tr;
    }

    // --- GRÁFICO BADA ---
    static createBadaGraph(cdu) {
        const container = document.createElement('div');
        container.className = 'bada-graph-container';
        container.dataset.cduId = cdu.id;

        const pasos = Array.isArray(cdu.pasos) ? cdu.pasos : [];
        const total = pasos.length;

        if (total === 0) {
            container.innerHTML = '<span class="bada-graph-empty">N/A</span>';
            return container;
        }

        const v1Count = pasos.filter(p => p.version === 'V1').length;
        const v2Count = pasos.filter(p => p.version === 'V2').length;

        const v1Percent = (v1Count / total) * 100;
        const v2Percent = (v2Count / total) * 100;

        container.innerHTML = `
            <div class="bada-graph-bar">
                ${v1Count > 0 ? `<div class="bada-segment segment-v1" style="width: ${v1Percent}%"></div>` : ''}
                ${v2Count > 0 ? `<div class="bada-segment segment-v2" style="width: ${v2Percent}%"></div>` : ''}
            </div>
            <div class="bada-graph-labels">
                ${v1Count > 0 ? `<span class="label-v1">V1: ${Math.round(v1Percent)}%</span>` : ''}
                ${v2Count > 0 ? `<span class="label-v2">V2: ${Math.round(v2Percent)}%</span>` : ''}
            </div>
        `;
        return container;
    }

    // --- CONTENEDOR DE PASOS (PERSISTENTE) ---
    static createPasosContainer(cdu) {
        const container = document.createElement('div');
        container.className = 'pasos-container';
        container.dataset.cduId = cdu.id;

        const pasos = Array.isArray(cdu.pasos) ? cdu.pasos : [];
        const total = pasos.length;
        const completed = pasos.filter(p => p.completado).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        let percentClass = 'percent-zero';
        if (percentage === 100) percentClass = 'percent-success';
        else if (percentage > 0) percentClass = 'percent-progress';

        // Determinar estado visual usando propiedad del objeto
        const isExpanded = cdu.isPasosExpanded === true;
        
        const iconSvg = isExpanded 
            ? `<svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>` // Flecha arriba
            : `<svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`; // Flecha abajo

        // HEADER
        const header = document.createElement('div');
        header.className = 'pasos-header';
        header.innerHTML = `
            <div class="pasos-summary-text">
                <span class="pasos-count-val">${completed}/${total}</span>
                <span class="pasos-percent-val ${percentClass}">${percentage}%</span>
            </div>
            <button class="btn-toggle-pasos ${isExpanded ? 'active' : ''}" type="button" data-action="toggle-pasos" title="Mostrar/Ocultar pasos">
                ${iconSvg}
            </button>
        `;
        container.appendChild(header);

        // CONTENIDO
        const content = document.createElement('div');
        content.className = `pasos-content ${isExpanded ? '' : 'hidden'}`;

        if (total === 0) {
            const empty = document.createElement('div');
            empty.className = 'pasos-empty';
            empty.textContent = 'Sin pasos definidos';
            content.appendChild(empty);
        } else {
            pasos.forEach((paso, index) => {
                const item = this.createPasoItem(cdu.id, paso, index);
                content.appendChild(item);
            });
        }

        const btnAgregar = document.createElement('button');
        btnAgregar.className = 'btn-paso btn-add';
        btnAgregar.type = 'button';
        btnAgregar.dataset.cduId = cdu.id;
        btnAgregar.dataset.action = 'add-paso';
        btnAgregar.innerHTML = '+ Paso';
        content.appendChild(btnAgregar);

        container.appendChild(content);
        return container;
    }

    static createPasoItem(cduId, paso, index) {
        const item = document.createElement('div');
        item.className = `paso-item ${paso.completado ? 'completed' : ''}`;
        item.dataset.index = index;

        item.innerHTML = `
            <div class="paso-inputs-row">
                <div class="paso-check-container">
                    <input type="checkbox" class="paso-check" 
                        ${paso.completado ? 'checked' : ''}
                        data-cdu-id="${cduId}" 
                        data-paso-index="${index}" 
                        data-campo="paso-completado"
                        title="Marcar como completado">
                </div>
                <input type="text" class="paso-titulo" value="${paso.titulo || ''}" placeholder="Título del paso..." 
                    data-cdu-id="${cduId}" data-paso-index="${index}" data-campo="paso-titulo">
                <button class="btn-paso btn-remove" type="button" title="Eliminar" 
                    data-cdu-id="${cduId}" data-paso-index="${index}" data-action="remove-paso">×</button>
            </div>
            <div class="paso-meta-row">
                <select class="paso-dificultad ${paso.dificultad ? paso.dificultad.toLowerCase() : 'baja'}" 
                    data-cdu-id="${cduId}" data-paso-index="${index}" data-campo="paso-dificultad">
                    <option value="Baja" ${paso.dificultad === 'Baja' ? 'selected' : ''}>Baja</option>
                    <option value="Media" ${paso.dificultad === 'Media' ? 'selected' : ''}>Media</option>
                    <option value="Alta" ${paso.dificultad === 'Alta' ? 'selected' : ''}>Alta</option>
                </select>
                <select class="paso-version" 
                    data-cdu-id="${cduId}" data-paso-index="${index}" data-campo="paso-version">
                    <option value="V1" ${paso.version === 'V1' ? 'selected' : ''}>V1</option>
                    <option value="V2" ${paso.version === 'V2' ? 'selected' : ''}>V2</option>
                </select>
            </div>
        `;
        return item;
    }

    // --- OTROS COMPONENTES (Sin cambios) ---
    static createResponsablesContainer(cdu) {
        const container = document.createElement('div');
        container.className = 'responsables-container';
        container.dataset.cduId = cdu.id;
        
        let responsables = Array.isArray(cdu.responsables) ? cdu.responsables : [];
        if (cdu.responsable && responsables.length === 0) responsables = [{ nombre: cdu.responsable, rol: 'DEV' }];
        
        if (responsables.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'responsables-empty';
            empty.textContent = 'Sin responsables';
            container.appendChild(empty);
        } else {
            responsables.forEach((resp, index) => {
                const item = this.createResponsableItem(cdu.id, resp.nombre, resp.rol, index);
                container.appendChild(item);
            });
        }
        
        const btnAgregar = document.createElement('button');
        btnAgregar.className = 'btn-responsable btn-add';
        btnAgregar.type = 'button';
        btnAgregar.dataset.cduId = cdu.id;
        btnAgregar.dataset.action = 'add-responsable';
        btnAgregar.innerHTML = '+';
        container.appendChild(btnAgregar);
        return container;
    }

    static createResponsableItem(cduId, nombre, rol, index) {
        const item = document.createElement('div');
        item.className = 'responsable-item';
        item.dataset.index = index;
        
        const rolContainer = document.createElement('div');
        rolContainer.className = 'rol-select-container';
        
        const rolDisplay = document.createElement('div');
        rolDisplay.className = 'rol-display';
        rolDisplay.innerHTML = `${this.getRolIcon(rol)}<span>${rol}</span>`;
        
        const selectRol = document.createElement('select');
        selectRol.className = 'responsable-rol-select';
        selectRol.dataset.cduId = cduId;
        selectRol.dataset.respIndex = index;
        selectRol.dataset.campo = 'responsable-rol';
        
        ['DEV', 'AF', 'UX', 'AN', 'QA'].forEach(r => {
            const opt = document.createElement('option');
            opt.value = r; opt.textContent = r; if(rol === r) opt.selected = true;
            selectRol.appendChild(opt);
        });
        
        rolContainer.appendChild(rolDisplay);
        rolContainer.appendChild(selectRol);
        
        const input = document.createElement('input');
        input.type = 'text'; input.value = nombre || ''; input.placeholder = 'Nombre...';
        input.dataset.cduId = cduId; input.dataset.respIndex = index; input.dataset.campo = 'responsable-nombre';
        
        const btn = document.createElement('button');
        btn.className = 'btn-responsable btn-remove'; btn.innerHTML = '×';
        btn.dataset.cduId = cduId; btn.dataset.respIndex = index; btn.dataset.action = 'remove-responsable';
        
        item.appendChild(rolContainer); item.appendChild(input); item.appendChild(btn);
        return item;
    }

    static createObservacionesContainer(cdu) {
        const container = document.createElement('div');
        container.className = 'observaciones-container';
        container.dataset.cduId = cdu.id;
        const obs = Array.isArray(cdu.observaciones) ? cdu.observaciones : [];
        
        if (obs.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'observaciones-empty';
            empty.textContent = 'Sin observaciones';
            container.appendChild(empty);
        } else {
            obs.forEach((o, i) => {
                const txt = typeof o === 'string' ? o : (o.texto || '');
                const item = this.createObservacionItem(cdu.id, txt, i);
                container.appendChild(item);
            });
        }
        
        const btn = document.createElement('button');
        btn.className = 'btn-observacion btn-add'; btn.innerHTML = '+';
        btn.dataset.cduId = cdu.id; btn.dataset.action = 'add-observacion';
        container.appendChild(btn);
        return container;
    }

    static createObservacionItem(cduId, texto, index) {
        const item = document.createElement('div');
        item.className = 'observacion-item';
        item.dataset.index = index;
        const input = document.createElement('input');
        input.type = 'text'; input.value = texto || ''; input.placeholder = 'Observación...';
        input.dataset.cduId = cduId; input.dataset.obsIndex = index; input.dataset.campo = 'observacion';
        const btn = document.createElement('button');
        btn.className = 'btn-observacion btn-remove'; btn.innerHTML = '×';
        btn.dataset.cduId = cduId; btn.dataset.obsIndex = index; btn.dataset.action = 'remove-observacion';
        item.appendChild(input); item.appendChild(btn);
        return item;
    }

    static createInput(type, className, value, campo, placeholder = '') {
        const input = document.createElement('input');
        input.type = type; input.className = className; input.value = value || '';
        input.setAttribute('data-campo', campo);
        if (placeholder) input.placeholder = placeholder;
        return input;
    }

    static createTextarea(valor, campo = 'observaciones', placeholder = 'Descripción...') {
        const textarea = document.createElement('textarea');
        textarea.className = campo === 'observaciones' ? 'campo-observaciones' : 'campo-descripcion';
        textarea.setAttribute('data-campo', campo);
        textarea.placeholder = placeholder; textarea.value = valor || '';
        return textarea;
    }

    static createBotonEliminar(cduId) {
        const button = document.createElement('button');
        button.className = 'btn btn-danger btn-eliminar';
        button.setAttribute('data-cdu-id', cduId);
        button.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
        return button;
    }

    static getRolIcon(rol) {
        const icons = {
            'DEV': `<svg class="rol-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
            'AF': `<svg class="rol-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
            'UX': `<svg class="rol-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
            'AN': `<svg class="rol-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>`,
            'QA': `<svg class="rol-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
        };
        return icons[rol] || icons['DEV'];
    }
}