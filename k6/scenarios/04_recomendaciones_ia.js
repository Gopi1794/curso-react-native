/**
 * ESCENARIO 4 — Caché de recomendaciones IA
 *
 * Verifica que el caché de 1h evita llamadas repetidas a Claude Haiku.
 * Corre 10 usuarios haciendo la misma request durante 30s.
 * Si el caché funciona, las respuestas deben ser < 100ms después de la primera.
 *
 * Correr: k6 run k6/scenarios/04_recomendaciones_ia.js -e BASE_URL=https://tu-api.onrender.com ...
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { RESTAURANTE_ID } from '../config.js';
import { login, authHeaders } from '../helpers.js';

export const options = {
    vus:      10,
    duration: '30s',
    thresholds: {
        'http_req_duration{name:recs}': ['p(95)<300'],
        http_req_failed: ['rate<0.01'],
    },
};

export function setup() {
    return { token: login() };
}

export default function ({ token }) {
    const base = __ENV.BASE_URL || 'https://curso-react-native.onrender.com';

    const res = http.get(
        `${base}/api/recommendations/${RESTAURANTE_ID}`,
        { ...authHeaders(token), tags: { name: 'recs' } }
    );

    check(res, {
        'recs 200':       r => r.status === 200,
        'tiene items':    r => Array.isArray(r.json('items')),
    });

    sleep(2);
}
