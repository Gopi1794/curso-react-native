const CATEGORIAS_POR_TIPO = {
    plato_gratis:  ['milanesas', 'platos', 'pastas'],
    postre_gratis: ['dulces', 'helados'],
    '2x1_bebidas': ['bebidas'],
    '2x1_pizzas':  ['pizzas'],
};

const SHIPPING_FEE = 2.99;

// items: [{ menu_item_id, cantidad }]
// menuItemsInfo: Map<string, { precio, categoria }> — las claves DEBEN ser String(id),
// tanto al construir el Map como al buscar acá adentro, porque Postgres devuelve las
// columnas BIGINT como string en node-pg y el JSON del cliente puede mandar el id como
// number — comparar sin normalizar hace que Map.get() falle silenciosamente.
// Devuelve { valido, mensaje, montoDescuento }
function evaluarCupon(tipo, valorPremio, subtotal, items, menuItemsInfo) {
    if (tipo === 'porcentaje') {
        const base = subtotal + SHIPPING_FEE;
        return { valido: true, montoDescuento: parseFloat((base * (valorPremio / 100)).toFixed(2)) };
    }

    if (tipo === 'envio_gratis') {
        return { valido: true, montoDescuento: SHIPPING_FEE };
    }

    if (tipo === 'plato_gratis' || tipo === 'postre_gratis') {
        const categorias = CATEGORIAS_POR_TIPO[tipo];
        let masBarato = null;
        for (const item of items) {
            const info = menuItemsInfo.get(String(item.menu_item_id));
            if (info && categorias.includes(info.categoria)) {
                if (!masBarato || info.precio < masBarato) masBarato = info.precio;
            }
        }
        if (masBarato === null) {
            const nombre = tipo === 'plato_gratis' ? 'plato' : 'postre';
            return { valido: false, mensaje: `Este cupón requiere un ${nombre} en tu pedido` };
        }
        return { valido: true, montoDescuento: masBarato };
    }

    if (tipo === '2x1_bebidas' || tipo === '2x1_pizzas') {
        const categorias = CATEGORIAS_POR_TIPO[tipo];
        const precios = [];
        for (const item of items) {
            const info = menuItemsInfo.get(String(item.menu_item_id));
            if (info && categorias.includes(info.categoria)) {
                for (let i = 0; i < item.cantidad; i++) precios.push(info.precio);
            }
        }
        if (precios.length < 2) {
            const nombre = tipo === '2x1_bebidas' ? 'bebidas' : 'pizzas';
            return { valido: false, mensaje: `Este cupón requiere 2 o más ${nombre} en tu pedido` };
        }
        precios.sort((a, b) => a - b);
        return { valido: true, montoDescuento: precios[0] };
    }

    return { valido: false, mensaje: 'Tipo de cupón desconocido' };
}

module.exports = { evaluarCupon, SHIPPING_FEE, CATEGORIAS_POR_TIPO };
