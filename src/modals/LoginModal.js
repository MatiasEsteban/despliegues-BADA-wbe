// src/modals/LoginModal.js - Modal de inicio de sesión

import { ModalBase } from './ModalBase.js';
import { auth } from '../core/firebaseConfig.js';
import { signInWithEmailAndPassword } from "firebase/auth";
import { NotificationSystem } from '../utils/notifications.js';

export class LoginModal {
    static show() {
        return new Promise((resolve) => {
            const overlay = ModalBase.createOverlay();
            // Usamos un tipo 'login' para estilos específicos si se requiere, o 'info' por defecto
            const modal = ModalBase.createModal('info');
            modal.classList.add('modal-login'); // Clase específica para styling

            // Icono de candado
            const iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>`;

            modal.innerHTML = `
                ${ModalBase.createHeader('Iniciar Sesión', iconSvg)}
                <div class="modal-body-content">
                    <form id="login-form" class="login-form">
                        <div class="login-group">
                            <label for="login-email">Correo Electrónico</label>
                            <input type="email" id="login-email" class="login-input" placeholder="usuario@ejemplo.com" required>
                        </div>
                        <div class="login-group">
                            <label for="login-password">Contraseña</label>
                            <input type="password" id="login-password" class="login-input" placeholder="••••••••" required>
                        </div>
                        <div id="login-error" class="login-error" style="display: none;"></div>
                        <div class="modal-actions login-actions">
                            <button type="submit" class="btn btn-primary btn-login-submit">
                                Ingresar
                            </button>
                        </div>
                    </form>
                </div>
            `;

            // Remover el botón de cerrar del header para obligar al login
            const closeBtn = modal.querySelector('.modal-close-btn');
            if (closeBtn) closeBtn.remove();

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            requestAnimationFrame(() => {
                overlay.classList.add('modal-show');
                document.getElementById('login-email').focus();
            });

            // Manejo del Submit
            const form = modal.querySelector('#login-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                const errorDiv = document.getElementById('login-error');
                const btnSubmit = modal.querySelector('.btn-login-submit');

                try {
                    btnSubmit.textContent = 'Verificando...';
                    btnSubmit.disabled = true;
                    errorDiv.style.display = 'none';

                    await signInWithEmailAndPassword(auth, email, password);
                    
                    // Si el login es exitoso:
                    NotificationSystem.success('Bienvenido');
                    overlay.classList.remove('modal-show');
                    setTimeout(() => {
                        document.body.removeChild(overlay);
                        resolve(true);
                    }, 300);

                } catch (error) {
                    console.error("Error login:", error);
                    let msg = 'Error al iniciar sesión.';
                    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                        msg = 'Usuario o contraseña incorrectos.';
                    } else if (error.code === 'auth/too-many-requests') {
                        msg = 'Demasiados intentos. Intente más tarde.';
                    }
                    errorDiv.textContent = msg;
                    errorDiv.style.display = 'block';
                    btnSubmit.textContent = 'Ingresar';
                    btnSubmit.disabled = false;
                }
            });
        });
    }
}