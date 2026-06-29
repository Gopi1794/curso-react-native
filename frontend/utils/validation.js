// utils/validation.js — Validadores reutilizables para formularios

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d\s()-]{6,}$/;

export const isValidEmail = (email) => EMAIL_RE.test(String(email || '').trim());

export const isValidPhone = (phone) => PHONE_RE.test(String(phone || '').trim());

export const isStrongPassword = (pwd) => {
    const v = String(pwd || '');
    return v.length >= 8 && /\d/.test(v) && /[a-zA-Z]/.test(v);
};

export const isNotEmpty = (value) => String(value || '').trim().length > 0;
