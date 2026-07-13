// frontend/components/rewards/wheelMath.js

export const SEGMENT_COUNT = 8;
export const SEGMENT_ANGLE = 360 / SEGMENT_COUNT; // 45

const toRad = (deg) => (deg * Math.PI) / 180;

// Ángulo (grados) del centro del gajo `index`, con index 0 centrado arriba (-90°).
export function segmentMidAngle(index) {
    return -90 + index * SEGMENT_ANGLE;
}

// Path SVG (pie slice) del gajo `index`, radio `r`, centro `(cx, cy)`.
export function segmentPath(index, cx, cy, r) {
    const mid = segmentMidAngle(index);
    const a0 = mid - SEGMENT_ANGLE / 2;
    const a1 = mid + SEGMENT_ANGLE / 2;
    const x0 = cx + r * Math.cos(toRad(a0));
    const y0 = cy + r * Math.sin(toRad(a0));
    const x1 = cx + r * Math.cos(toRad(a1));
    const y1 = cy + r * Math.sin(toRad(a1));
    return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`;
}

// Posición (x, y) del ícono/label del gajo `index` en reposo (sin rotación aplicada).
export function labelPosition(index, cx, cy, rLabel) {
    const mid = segmentMidAngle(index);
    return {
        x: cx + rLabel * Math.cos(toRad(mid)),
        y: cy + rLabel * Math.sin(toRad(mid)),
    };
}

// Ángulo (grados) al que hay que rotar la rueda para que el gajo `index` quede
// exactamente bajo el puntero fijo de arriba, dado el ángulo actual acumulado
// `currentRotationDeg` (puede ser cualquier número, no normalizado) y una
// cantidad mínima de vueltas completas `spins`.
export function targetRotationForIndex(index, currentRotationDeg, spins = 4) {
    const targetMod = -(index * SEGMENT_ANGLE);
    const currentMod = ((currentRotationDeg % 360) + 360) % 360;
    const targetModPositive = ((targetMod % 360) + 360) % 360;
    let delta = targetModPositive - currentMod;
    delta = ((delta % 360) + 360) % 360;
    return currentRotationDeg + delta + spins * 360;
}
