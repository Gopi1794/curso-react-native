import http from 'k6/http';
import { check, fail } from 'k6';
import { BASE_URL, TEST_USER } from './config.js';

export function login() {
    const res = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
        { headers: { 'Content-Type': 'application/json' } }
    );

    const ok = check(res, {
        'login 200':     r => r.status === 200,
        'tiene token':   r => r.json('token') !== undefined,
    });

    if (!ok) fail(`Login fallido: ${res.status} ${res.body}`);

    return res.json('token');
}

export function authHeaders(token) {
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type':  'application/json',
        },
    };
}
