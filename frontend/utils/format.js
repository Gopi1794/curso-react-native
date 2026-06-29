// utils/format.js — Helpers de formato compartidos por toda la app

export const formatPrice = (value, { currency = 'ARS', symbol = '$' } = {}) => {
    const number = Number(value) || 0;
    return `${symbol}${number.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const formatDate = (value, { withTime = false } = {}) => {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';

    const date = d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
    if (!withTime) return date;
    const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
};

export const formatRelativeTime = (value) => {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    const diffMs = Date.now() - d.getTime();
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Hace ${days} d`;
    return formatDate(d);
};

export const truncate = (text, max = 80) => {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};
