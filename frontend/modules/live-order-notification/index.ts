import { requireNativeModule } from 'expo-modules-core';

const LiveOrderNotification = requireNativeModule('LiveOrderNotification');

export type OrderStatus =
    | 'pendiente'
    | 'en_preparacion'
    | 'en_camino'
    | 'entregado'
    | 'cancelado';

export interface LiveOrderOptions {
    orderId: number;
    status: OrderStatus;
    step: number;
    totalSteps: number;
    title: string;
    message: string;
    /** Hora estimada de llegada, ej: "12:18 PM" */
    eta?: string;
    /** Nombre del repartidor para el botón "Llamar a Juan" */
    repartidorNombre?: string;
    /** Teléfono del repartidor — activa el botón de llamada */
    repartidorTelefono?: string;
}

export function showLiveOrderNotification(options: LiveOrderOptions): void {
    LiveOrderNotification.show(options);
}

export function updateLiveOrderNotification(options: LiveOrderOptions): void {
    LiveOrderNotification.update(options);
}

export function dismissLiveOrderNotification(orderId: number): void {
    LiveOrderNotification.dismiss(orderId);
}
