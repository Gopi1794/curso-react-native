import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { useLang } from "../LanguageContext";
import backKiosko from "@assets/img/back-kiosko.jpg";
import logoImg from "@assets/adaptive-icon.png";
import flagEng from "@assets/img/flags/flag-eng.png";
import flagSpa from "@assets/img/flags/flag-spa.png";
import flagPrt from "@assets/img/flags/flag-prt.png";
import styles from "./WelcomePopup.module.css";

const LANGS = [
  { code: "SPA", flag: flagSpa },
  { code: "ENG", flag: flagEng },
  { code: "PRT", flag: flagPrt },
];

// ── Mock de usuarios — reemplazar por llamada real al backend ──────────────
async function fetchUserByQR(qrData) {
  // TODO: return await fetch(`/api/users/qr/${qrData}`).then(r => r.json());
  const MOCK_USERS = {
    "USR-GABRIEL-001": { name: "Gabriel" },
    "USR-MARIA-002":   { name: "María" },
    "USR-LUCAS-003":   { name: "Lucas" },
  };
  return MOCK_USERS[qrData] || null;
}
// ──────────────────────────────────────────────────────────────────────────

const WelcomePopup = ({ onStart }) => {
  const { lang, setLang, t } = useLang();
  const [welcomeUser, setWelcomeUser] = useState(null); // { name }
  const [scanning, setScanning]       = useState(false);
  const bufferRef = useRef("");        // acumula chars del lector QR (actúa como teclado)
  const timerRef  = useRef(null);      // resetea el buffer si para de escribir

  // ── Escucha el lector QR físico (envía chars + Enter como teclado) ──────
  useEffect(() => {
    const onKey = async (e) => {
      if (e.key === "Enter") {
        const qrData = bufferRef.current.trim();
        bufferRef.current = "";
        clearTimeout(timerRef.current);
        if (!qrData) return;

        setScanning(true);
        const user = await fetchUserByQR(qrData);
        setScanning(false);

        if (user) {
          setWelcomeUser(user);
          // Después de 3 s continúa automáticamente como usuario logueado
          setTimeout(() => onStart(user), 3000);
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
        // Si pasan 500 ms sin más caracteres, limpia (no era un escáner)
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { bufferRef.current = ""; }, 500);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart]);

  return (
    <div className={styles.overlay}>

      {/* ── BANNER superior ── */}
      <div className={styles.banner}>
        <img src={backKiosko} alt="" className={styles.bannerImg} />
        <div className={styles.bannerOverlay} />
        <img src={logoImg} alt="Logo" className={styles.bannerLogo} />
      </div>

      {/* ── DOS CARDS inferiores ── */}
      <div className={styles.cardsRow}>

        {/* Card izquierda — Login con QR */}
        <div className={styles.cardLogin}>
          {welcomeUser ? (
            /* ── Saludo tras escanear ── */
            <div className={styles.welcomeBack}>
              <div className={styles.welcomeCheck}>✓</div>
              <div className={styles.welcomeBackTitle}>
                {t.welcome.welcomeBack}
              </div>
              <div className={styles.welcomeBackName}>{welcomeUser.name}</div>
            </div>
          ) : scanning ? (
            <div className={styles.scanningMsg}>{t.welcome.scanning}</div>
          ) : (
            <>
              <div className={styles.cardLoginTitle}>{t.welcome.loginTitle}</div>
              <div className={styles.cardLoginSub}>{t.welcome.loginSub}</div>
              {/* QR ilustrativo — el usuario lo escanea desde su app */}
              <div className={styles.qrWrap}>
                <QRCode
                  value="kiosk://demo"
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  level="M"
                />
              </div>
              <div className={styles.cardLoginHint}>{t.welcome.loginHint}</div>
            </>
          )}
        </div>

        {/* Card derecha — Continuar sin sesión */}
        <div className={styles.cardGuest}>
          <button className={styles.guestBtn} onClick={() => onStart(null)}>
            {t.welcome.continueGuest}
          </button>

          <div className={styles.langRow}>
            {LANGS.map(({ code, flag }) => (
              <button
                key={code}
                className={styles.langBtn + (lang === code ? ` ${styles.langBtnActive}` : "")}
                onClick={() => setLang(code)}
              >
                <div className={styles.langCircle}>
                  <img src={flag} alt={code} className={styles.langFlag} />
                </div>
                <span className={styles.langCode}>{code}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default WelcomePopup;
