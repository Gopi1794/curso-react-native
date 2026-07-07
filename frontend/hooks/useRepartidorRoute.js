import { useState, useRef, useCallback, useEffect } from 'react';
import API from '../services/api';
import { distanceToPolylineMeters, haversineMeters } from '../utils/routeGeometry';

const DESVIO_MAX_METROS = 70;
const ETA_CERCA_DE_CERO_MS = 60000;
const DISTANCIA_FIN_STEP_METROS = 25;

export function useRepartidorRoute({ location, coords, selected }) {
    const [routePoints, setRoutePoints] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const [etaTarget, setEtaTarget] = useState(null);
    const [steps, setSteps] = useState(null);
    const [stepActualIndex, setStepActualIndex] = useState(0);
    const recalculandoRef = useRef(false);
    const routeRequestSeq = useRef(0);

    const fetchRoute = useCallback(async (pedido) => {
        if (!pedido || !coords[pedido.id]) return;
        const mySeq = ++routeRequestSeq.current;
        recalculandoRef.current = true;
        try {
            const res = await API.repartidor.getRuta(pedido.id, coords[pedido.id]);
            if (mySeq !== routeRequestSeq.current) return; // llegó una respuesta vieja, descartar
            if (res.success) {
                setRoutePoints(res.points.map(p => ({ latitude: p.lat, longitude: p.lng })));
                setRouteInfo({ distanceMeters: res.distanceMeters, durationSeconds: res.durationSeconds });
                setEtaTarget(new Date(Date.now() + res.durationSeconds * 1000));
                setSteps(res.steps && res.steps.length > 0 ? res.steps : null);
                setStepActualIndex(0);
            }
        } catch {
            // No romper el flujo si Google falla — se mantienen pines y botones de Waze/Google Maps
        } finally {
            if (mySeq === routeRequestSeq.current) recalculandoRef.current = false;
        }
    }, [coords]);

    // ── Pedir la ruta al seleccionar un pedido ────────────
    useEffect(() => {
        if (selected) fetchRoute(selected);
        else {
            setRoutePoints(null);
            setRouteInfo(null);
            setEtaTarget(null);
            setSteps(null);
            setStepActualIndex(0);
        }
    }, [selected, fetchRoute]);

    // ── Detección de desvío y recálculo por ETA próxima a cero ──
    useEffect(() => {
        if (!location || !routePoints || !selected || recalculandoRef.current) return;

        const puntoActual = { lat: location.latitude, lng: location.longitude };
        const polylinePlano = routePoints.map(p => ({ lat: p.latitude, lng: p.longitude }));
        const desvioMetros = distanceToPolylineMeters(puntoActual, polylinePlano);

        const etaProximaACero = etaTarget && (etaTarget.getTime() - Date.now()) < ETA_CERCA_DE_CERO_MS && selected.estado === 'en_camino';

        if (desvioMetros > DESVIO_MAX_METROS || etaProximaACero) {
            fetchRoute(selected);
        }
    }, [location, routePoints, selected, etaTarget, fetchRoute]);

    // ── Avance del paso actual (client-side, sin llamar a Google) ──
    useEffect(() => {
        if (!location || !steps || steps.length === 0) return;
        if (stepActualIndex >= steps.length - 1) return;

        const step = steps[stepActualIndex];
        if (!step.points || step.points.length === 0) return;

        const puntoActual = { lat: location.latitude, lng: location.longitude };
        const finStep = step.points[step.points.length - 1];
        const distanciaAlFinDelStep = haversineMeters(puntoActual, finStep);

        if (distanciaAlFinDelStep < DISTANCIA_FIN_STEP_METROS) {
            setStepActualIndex(i => i + 1);
        }
    }, [location, steps, stepActualIndex]);

    return { routePoints, routeInfo, etaTarget, steps, stepActualIndex };
}
