import { useEffect, useRef, useState } from "react";
import { LanguageProvider, useLang } from "./LanguageContext";
import Screensaver from "./screen/Screensaver";
import WelcomePopup from "./screen/WelcomePopup";
import OrderTypeScreen from "./screen/OrderTypeScreen";
import ScreenHome from "./ScreenHome";
import OrderConfirmedScreen from "./screen/OrderConfirmedScreen";
import "./styles.css";

const KIOSK_W = 1080;
const KIOSK_H = 1920;
const IDLE_MS  = 60_000; // 60 s sin actividad → screensaver
const WARN_MS  = 50_000; // aviso 10 s antes

function IdleWarningModal({ countdown, onContinue }) {
  const { t } = useLang();
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.72)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 48,
        padding: "80px 80px 72px", textAlign: "center", width: 820,
        fontFamily: "'Poppins', Arial, sans-serif",
        boxShadow: "0 32px 80px rgba(0,0,0,0.45)",
      }}>
        {/* Círculo countdown */}
        <div style={{
          width: 200, height: 200, borderRadius: "50%",
          background: "#fff8f0", border: "8px solid #f7931e",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 52px",
          fontSize: 100, fontWeight: 900, color: "#f7931e",
          fontFamily: "'Poppins', Arial, sans-serif",
          boxShadow: "0 0 0 16px rgba(247,147,30,0.12)",
          transition: "all 0.4s",
        }}>
          {countdown}
        </div>
        <div style={{ fontSize: 50, fontWeight: 700, color: "#222", marginBottom: 20 }}>
          {t.idle.title}
        </div>
        <div style={{ fontSize: 30, color: "#999", marginBottom: 64, lineHeight: 1.5 }}>
          {t.idle.sub}
        </div>
        <button
          onClick={onContinue}
          style={{
            background: "#f7931e", color: "#fff", border: "none",
            borderRadius: 28, padding: "36px 110px",
            fontSize: 36, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Poppins', Arial, sans-serif",
            boxShadow: "0 8px 32px rgba(247,147,30,0.4)",
          }}
        >
          {t.idle.continue}
        </button>
      </div>
    </div>
  );
}

const enterFullscreen = () => {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (req) req.call(el).catch(() => {});
};

const isFullscreen = () =>
  !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);

// Escala el contenedor 1080×1920 para que quepa en cualquier pantalla
function KioskScaler({ children }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const sx = window.innerWidth  / KIOSK_W;
      const sy = window.innerHeight / KIOSK_H;
      setScale(Math.min(sx, sy));
    };
    update();
    window.addEventListener("resize", update);
    document.addEventListener("fullscreenchange", update);
    document.addEventListener("webkitfullscreenchange", update);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("fullscreenchange", update);
      document.removeEventListener("webkitfullscreenchange", update);
    };
  }, []);

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#111",
      overflow: "hidden",
    }}>
      {/* Botón fullscreen — visible solo cuando NO está en pantalla completa */}
      {!isFullscreen() && (
        <button
          onClick={enterFullscreen}
          style={{
            position: "fixed", bottom: 12, right: 12, zIndex: 9999,
            background: "rgba(0,0,0,0.55)", color: "#fff",
            border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 10,
            padding: "6px 14px", fontSize: 20, cursor: "pointer",
            fontFamily: "sans-serif", backdropFilter: "blur(4px)",
          }}
          title="Pantalla completa"
        >
          ⛶
        </button>
      )}
      <div style={{
        width: KIOSK_W,
        height: KIOSK_H,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
      }}>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen]       = useState("screensaver");
  const [orderType, setOrderType] = useState(null);
  const [cart, setCart]           = useState([]);
  const [orderNumber, setOrderNumber]   = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [loggedUser, setLoggedUser]     = useState(null);

  // ── Idle timeout ──────────────────────────────────────────
  const [idleWarning, setIdleWarning] = useState(false);
  const [countdown, setCountdown]     = useState(10);
  const timerRef    = useRef(null);
  const warnRef     = useRef(null);
  const scheduleRef = useRef(null); // siempre apunta a la versión actualizada

  // Actualiza la función de schedule cada vez que cambia screen
  useEffect(() => {
    scheduleRef.current = () => {
      clearTimeout(timerRef.current);
      clearTimeout(warnRef.current);
      setIdleWarning(false);
      if (screen === "screensaver" || screen === "orderConfirmed") return;
      warnRef.current = setTimeout(() => {
        setIdleWarning(true);
        setCountdown(10);
      }, WARN_MS);
      timerRef.current = setTimeout(() => {
        setIdleWarning(false);
        setCart([]);
        setScreen("screensaver");
      }, IDLE_MS);
    };
  }, [screen]);

  // Registra listeners una sola vez
  useEffect(() => {
    const onActivity = () => scheduleRef.current?.();
    document.addEventListener("pointerdown", onActivity, { passive: true });
    document.addEventListener("touchstart",  onActivity, { passive: true });
    scheduleRef.current?.();
    return () => {
      document.removeEventListener("pointerdown", onActivity);
      document.removeEventListener("touchstart",  onActivity);
      clearTimeout(timerRef.current);
      clearTimeout(warnRef.current);
    };
  }, []);

  // Reinicia el timer cuando cambia de pantalla
  useEffect(() => { scheduleRef.current?.(); }, [screen]);

  // Countdown tick (descuenta 1 por segundo cuando el warning está visible)
  useEffect(() => {
    if (!idleWarning) { setCountdown(10); return; }
    if (countdown <= 0) return;
    const tick = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(tick);
  }, [idleWarning, countdown]);

  const handleIdleContinue = () => scheduleRef.current?.();
  // ─────────────────────────────────────────────────────────

  const addToCart = (item, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, qty: c.qty + qty } : c
        );
      }
      return [...prev, { ...item, qty }];
    });
  };

  const cancelOrder = () => setCart([]);

  const updateCartQty = (itemId, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.id !== itemId));
    } else {
      setCart((prev) =>
        prev.map((c) => (c.id === itemId ? { ...c, qty } : c))
      );
    }
  };

  const removeFromCart = (itemId) =>
    setCart((prev) => prev.filter((c) => c.id !== itemId));

  const confirmOrder = (method) => {
    const num = Math.floor(100 + Math.random() * 900); // 100–999
    setOrderNumber(num);
    setPaymentMethod(method);
    setCart([]);
    setScreen("orderConfirmed");
  };

  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  return (
    <LanguageProvider>
    <KioskScaler>
      <div className="kiosk-root">
        {screen === "screensaver" && (
          <Screensaver onDismiss={() => setScreen("welcome")} />
        )}
        {screen === "welcome" && (
          <WelcomePopup onStart={(user) => { setLoggedUser(user); setScreen("orderType"); }} />
        )}
        {screen === "orderType" && (
          <OrderTypeScreen
            onSelect={(type) => { setOrderType(type); setScreen("menu"); }}
          />
        )}
        {screen === "menu" && (
          <ScreenHome
            orderType={orderType}
            onBack={() => setScreen("orderType")}
            cart={cart}
            cartCount={cartCount}
            onAddToCart={addToCart}
            onCancelOrder={cancelOrder}
            onUpdateCartQty={updateCartQty}
            onRemoveFromCart={removeFromCart}
            onConfirmOrder={confirmOrder}
          />
        )}

        {screen === "orderConfirmed" && (
          <OrderConfirmedScreen
            orderNumber={orderNumber}
            paymentMethod={paymentMethod}
            onDone={() => setScreen("screensaver")}
          />
        )}

        {/* ── IDLE WARNING ── */}
        {idleWarning && screen !== "screensaver" && screen !== "orderConfirmed" && (
          <IdleWarningModal countdown={countdown} onContinue={handleIdleContinue} />
        )}
      </div>
    </KioskScaler>
    </LanguageProvider>
  );
}
