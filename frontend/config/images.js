// config/images.js

// Importar imágenes de tickets
const decoTicket1 = require('../assets/img/tickets/ticket-1.webp');
const decoTicket2 = require('../assets/img/tickets/ticket-2.webp');
const decoTicket3 = require('../assets/img/tickets/ticket-3.webp');
const decoTicket4 = require('../assets/img/tickets/ticket-4.webp');
const decoTicket5 = require('../assets/img/tickets/ticket-5.webp');
const decoTicket6 = require('../assets/img/tickets/ticket-6.webp');

// Importar imágenes reales de productos
const realProductImage1 = require('../assets/img/tickets/ticket-1-1.png');
const realProductImage2 = require('../assets/img/tickets/ticket-2-2.png');
const realProductImage3 = require('../assets/img/tickets/ticket-3-3.png');
const realProductImage4 = require('../assets/img/tickets/ticket-4-4.png');
const realProductImage5 = require('../assets/img/tickets/ticket-5-5.png');
const realProductImage6 = require('../assets/img/tickets/ticket-6-6.png');

// Imágenes comunes
const lineDecoTicket = require('../assets/img/line-deco-ticket.png');
const logoappTicket = require('../assets/adaptive-icon.png');

// Animaciones
const starAnimation = require('../assets/animations/Twinkle.json');

// MAPA DE IMÁGENES DE TICKETS
export const ticketImages = {
    'ticket-1.webp': decoTicket1,
    'ticket-2.webp': decoTicket2,
    'ticket-3.webp': decoTicket3,
    'ticket-4.webp': decoTicket4,
    'ticket-5.webp': decoTicket5,
    'ticket-6.webp': decoTicket6
};

// MAPA DE IMÁGENES REALES DE PRODUCTOS
export const realProductImages = {
    'ticket-1-1.png': realProductImage1,
    'ticket-2-2.png': realProductImage2,
    'ticket-3-3.png': realProductImage3,
    'ticket-4-4.png': realProductImage4,
    'ticket-5-5.png': realProductImage5,
    'ticket-6-6.png': realProductImage6
};

// IMÁGENES COMUNES
export const commonImages = {
    lineDecoTicket,
    logoappTicket
};

// ANIMACIONES
export const animations = {
    star: starAnimation
};

export default {
    ticketImages,
    realProductImages,
    commonImages,
    animations
};