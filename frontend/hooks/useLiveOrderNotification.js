import { useEffect, useRef } from 'react';
import {
    showLiveOrderNotification,
    updateLiveOrderNotification,
    dismissLiveOrderNotification,
} from '../modules/live-order-notification';

const STATUS_STEPS = {
    pendiente:      { step: 0, message: 'Pedido recibido' },
    en_preparacion: { step: 1, message: 'En preparación' },
    en_camino:      { step: 2, message: 'En ruta' },
    entregado:      { step: 3, message: 'Entregado' },
    cancelado:      { step: 0, message: 'Cancelado' },
};

const TOTAL_STEPS = 4;

const STATUS_TITLES = {
    pendiente:      'Recibimos tu pedido',
    en_preparacion: 'Tu pedido está en cocina',
    en_camino:      'Tu pedido viene en camino!',
    entregado:      'Pedido entregado!',
    cancelado:      'Pedido cancelado',
};

/**
 * Muestra y actualiza una notificación Live Update para un pedido activo.
 *
 * @param {object|null} order  - { id, estado, numero_pedido, eta?, repartidor? }
 *   repartidor: { nombre, telefono }
 */
export function useLiveOrderNotification(order) {
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (!order) return;

        const { id, estado, numero_pedido, eta, repartidor } = order;
        const config = STATUS_STEPS[estado] ?? STATUS_STEPS.pendiente;

        const options = {
            orderId:             id,
            status:              estado,
            step:                config.step,
            totalSteps:          TOTAL_STEPS,
            title:               STATUS_TITLES[estado] ?? `Pedido #${numero_pedido ?? id}`,
            message:             config.message,
            eta:                 eta ?? undefined,
            repartidorNombre:    repartidor?.nombre ?? undefined,
            repartidorTelefono:  repartidor?.telefono ?? undefined,
        };

        if (isFirstRender.current) {
            showLiveOrderNotification(options);
            isFirstRender.current = false;
        } else {
            updateLiveOrderNotification(options);
        }

        return () => {
            if (estado === 'entregado' || estado === 'cancelado') {
                dismissLiveOrderNotification(id);
            }
        };
    }, [order?.id, order?.estado]);
}
