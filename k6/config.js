export const BASE_URL = __ENV.BASE_URL || 'https://curso-react-native.onrender.com';

export const TEST_USER = {
    email:    __ENV.TEST_EMAIL    || 'test@foodapp.com',
    password: __ENV.TEST_PASSWORD || '123456',
};

export const RESTAURANTE_ID = __ENV.RESTAURANTE_ID || '1';

export const THRESHOLDS = {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed:   ['rate<0.01'],
};
