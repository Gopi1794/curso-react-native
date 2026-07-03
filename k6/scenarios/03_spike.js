/**
 * ESCENARIO 3 — Spike test
 *
 * Simula un pico repentino de tráfico (ej: una promo que se viraliza).
 * Sube de 0 a 100 usuarios en 10s, los mantiene 30s, luego baja.
 * Sirve para ver si el pool de conexiones (max:20) aguanta o se satura.
 *
 * Correr: k6 run k6/scenarios/03_spike.js -e BASE_URL=https://tu-api.onrender.com ...
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { RESTAURANTE_ID } from '../config.js';
import { login, authHeaders } from '../helpers.js';

export const options = {
    stages: [
        { duration: '5s',  target: 0   },  // inicio en reposo
        { duration: '10s', target: 100 },  // spike abrupto
        { duration: '30s', target: 100 },  // pico sostenido
        { duration: '10s', target: 0   },  // bajada
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'],  // más permisivo en spike
        http_req_failed:   ['rate<0.05'],   // tolerar hasta 5% de error en pico
    },
};

export function setup() {
    return { token: login() };
}

export default function ({ token }) {
    const base = __ENV.BASE_URL || 'https://curso-react-native.onrender.com';

    const res = http.get(
        `${base}/api/restaurants/${RESTAURANTE_ID}/menu`,
        { ...authHeaders(token), tags: { name: 'menu_spike' } }
    );

    check(res, {
        'status ok':    r => r.status === 200,
        'sin timeout':  r => r.timings.duration < 5000,
    });

    sleep(0.5);
}
