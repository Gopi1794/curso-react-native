/**
 * ESCENARIO 2 — Flujo realista de un usuario
 *
 * Simula lo que hace un cliente real: login → menú → recomendaciones → pedido.
 * El sleep() entre pasos imita el tiempo que tarda una persona en leer la pantalla.
 *
 * Correr: k6 run k6/scenarios/02_flujo_usuario.js -e BASE_URL=https://tu-api.onrender.com ...
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { THRESHOLDS, RESTAURANTE_ID } from '../config.js';
import { login, authHeaders } from '../helpers.js';

export const options = {
    vus:      20,
    duration: '60s',
    thresholds: THRESHOLDS,
};

export function setup() {
    return { token: login() };
}

export default function ({ token }) {
    const h = authHeaders(token);
    const base = __ENV.BASE_URL || 'https://curso-react-native.onrender.com';

    // 1. Menú
    const menu = http.get(`${base}/api/restaurants/${RESTAURANTE_ID}/menu`, {
        ...h, tags: { name: 'menu' },
    });
    check(menu, { 'menu ok': r => r.status === 200 });
    sleep(2); // el usuario mira la pantalla

    // 2. Recomendaciones IA
    const recs = http.get(`${base}/api/recommendations/${RESTAURANTE_ID}`, {
        ...h, tags: { name: 'recomendaciones' },
    });
    check(recs, { 'recs ok': r => r.status === 200 });
    sleep(3);

    // 3. Mis pedidos
    const pedidos = http.get(`${base}/api/orders`, {
        ...h, tags: { name: 'pedidos' },
    });
    check(pedidos, { 'pedidos ok': r => r.status === 200 });
    sleep(1);
}
