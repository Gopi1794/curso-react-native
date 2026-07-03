/**
 * ESCENARIO 1 — Carga en el menú
 *
 * Propósito: verificar que el caché aguanta 50 usuarios simultáneos
 * pidiendo el menú sin degradar el tiempo de respuesta.
 *
 * Correr: k6 run k6/scenarios/01_menu.js -e BASE_URL=https://tu-api.onrender.com -e TEST_EMAIL=... -e TEST_PASSWORD=...
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { THRESHOLDS, RESTAURANTE_ID } from '../config.js';
import { login, authHeaders } from '../helpers.js';

export const options = {
    stages: [
        { duration: '10s', target: 20 },  // calentamiento
        { duration: '30s', target: 50 },  // carga sostenida
        { duration: '10s', target: 0  },  // bajada
    ],
    thresholds: {
        ...THRESHOLDS,
        // El menú cacheado debe responder en menos de 200ms p95
        'http_req_duration{name:menu}': ['p(95)<200'],
    },
};

// Se ejecuta UNA VEZ por VU antes de empezar — hace login y guarda el token
export function setup() {
    return { token: login() };
}

export default function ({ token }) {
    const res = http.get(
        `${__ENV.BASE_URL || 'https://curso-react-native.onrender.com'}/api/restaurants/${RESTAURANTE_ID}/menu`,
        { ...authHeaders(token), tags: { name: 'menu' } }
    );

    check(res, {
        'menu 200':          r => r.status === 200,
        'tiene items':       r => r.json('items')?.length > 0,
        'responde rápido':   r => r.timings.duration < 800,
    });

    sleep(1);
}
