// src/components/cards/VersionCard.js

export class VersionCard {
    static create(version, onClickCallback, isEnProduccion = false) {
        const card = document.createElement('div');
        card.className = 'version-card';
        if (isEnProduccion) {
            card.classList.add('version-en-produccion');
        }
        card.dataset.versionId = version.id;

        if (!version || typeof version !== 'object') {
             console.error("VersionCard.create recibió una versión inválida:", version);
             card.innerHTML = `<div class="version-card-header error">Versión Inválida</div>`;
             return card;
        }
        const cdus = Array.isArray(version.cdus) ? version.cdus : [];

        // Calcular estadísticas
        const desarrollo = cdus.filter(c => c?.estado === 'En Desarrollo').length;
        const pendiente = cdus.filter(c => c?.estado === 'Pendiente de Certificacion').length;
        const certificado = cdus.filter(c => c?.estado === 'Certificado OK').length;
        const produccion = cdus.filter(c => c?.estado === 'En Produccion').length;

        // Formatear fechas y horas
        const fechaCreacionFormateada = this.formatDate(version.fechaCreacion);
        const horaCreacionFormateada = version.horaCreacion ? `a las ${version.horaCreacion} hs` : ''; // Incluir hora si existe
        const fechaDespliegueFormateada = this.formatDate(version.fechaDespliegue);
        const horaDespliegueFormateada = version.horaDespliegue ? `${version.horaDespliegue} hs` : '--:-- hs';

        card.innerHTML = `
            <div class="version-card-header">
                <div class="version-card-number">
                    V${version.numero || '?'}
                    ${isEnProduccion ? '<span class="badge-produccion">EN PRODUCCIÓN</span>' : ''}
                </div>
                <div class="version-card-cdus-count">${cdus.length} CDU${cdus.length !== 1 ? 's' : ''}</div>
                <button class="btn-marcar-produccion" data-version-id="${version.id}" title="${isEnProduccion ? 'Desmarcar de producción' : 'Marcar como en producción'}">
                    <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${isEnProduccion
                            ? '<path d="M20 6L9 17l-5-5"></path>'
                            : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
                    </svg>
                </button>
                <button class="btn-version-info" data-version-id="${version.id}" title="Ver reporte de despliegue">
                    <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <circle cx="12" cy="8" r="1" fill="currentColor"></circle>
                        <line x1="12" y1="12" x2="12" y2="16" stroke-width="2.5"></line>
                    </svg>
                </button>
            </div>
            <div class="version-card-body">
                 <div class="version-card-detail">
                     <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <path d="M8 2v4"></path> <path d="M16 2v4"></path> <rect width="18" height="18" x="3" y="4" rx="2"></rect> <path d="M3 10h18"></path> </svg>
                     <span>Creada: <strong>${fechaCreacionFormateada} ${horaCreacionFormateada}</strong></span>
                 </div>
                 <div class="version-card-detail">
                     <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <path d="m13 16 5-14-5 14zm6.53 1.47L21 16m-6.59-1.41-1.18 3.32a1 1 0 0 1-1.8.04l-1.4-3.88"></path> </svg>
                     <span>Fuente: <strong>${version.fuente || 'N/A'}</strong></span>
                 </div>
                 <hr class="card-separator">
                 <div class="version-card-stats">
                     <div class="version-card-stat">
                         <div class="version-card-stat-icon stat-desarrollo" title="${desarrollo} En Desarrollo">${desarrollo}</div>
                         <div class="version-card-stat-label">Desarrollo</div>
                     </div>
                     <div class="version-card-stat">
                         <div class="version-card-stat-icon stat-pendiente" title="${pendiente} Pendiente">${pendiente}</div>
                         <div class="version-card-stat-label">Pendiente</div>
                     </div>
                     <div class="version-card-stat">
                         <div class="version-card-stat-icon stat-certificado" title="${certificado} Certificado">${certificado}</div>
                         <div class="version-card-stat-label">Certif.</div>
                     </div>
                     <div class="version-card-stat">
                         <div class="version-card-stat-icon stat-produccion" title="${produccion} Producción">${produccion}</div>
                         <div class="version-card-stat-label">Prod.</div>
                     </div>
                 </div>
            </div>
            <div class="version-card-footer">
                <div class="version-card-date">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect> <line x1="16" y1="2" x2="16" y2="6"></line> <line x1="8" y1="2" x2="8" y2="6"></line> <line x1="3" y1="10" x2="21" y2="10"></line> </svg>
                    Despliegue: ${fechaDespliegueFormateada}
                </div>
                <div class="version-card-time">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <circle cx="12" cy="12" r="10"></circle> <polyline points="12 6 12 12 16 14"></polyline> </svg>
                    ${horaDespliegueFormateada}
                </div>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-marcar-produccion') && !e.target.closest('.btn-version-info')) {
                if (typeof onClickCallback === 'function') onClickCallback(version.id);
                else console.warn("onClickCallback no es función", version);
            }
        });

        return card;
    }

    static formatDate(dateString) {
        if (!dateString || typeof dateString !== 'string') return 'Sin fecha';
         try {
             const date = new Date(dateString + 'T00:00:00Z');
              if (isNaN(date.getTime())) {
                   const genericDate = new Date(dateString);
                   if (isNaN(genericDate.getTime())) return 'Fecha inválida';
                    const day = genericDate.getDate().toString().padStart(2, '0');
                    const month = (genericDate.getMonth() + 1).toString().padStart(2, '0');
                    const year = genericDate.getFullYear();
                     if (year < 1900 || year > 3000) return 'Fecha inválida';
                    return `${day}/${month}/${year}`;
              }
             const day = date.getUTCDate().toString().padStart(2, '0');
             const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
             const year = date.getUTCFullYear();
             if (year < 1900 || year > 3000) return 'Fecha inválida';
             return `${day}/${month}/${year}`;
         } catch (e) { console.error("Error formateando fecha:", dateString, e); return 'Error fecha'; }
    }
}