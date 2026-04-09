import { useEffect, useState } from "react";
import { useLang } from "../LanguageContext";
import styles from "./OrderConfirmedScreen.module.css";

const AUTO_RETURN_S = 15;

const PAYMENT_META = {
  card: {
    icon: (
      <svg viewBox="0 0 64 64" fill="none">
        <rect x="4" y="14" width="56" height="36" rx="6" fill="#e8f0fe" stroke="#4285f4" strokeWidth="3"/>
        <rect x="4" y="24" width="56" height="10" fill="#4285f4"/>
        <rect x="12" y="38" width="16" height="5" rx="2" fill="#4285f4"/>
      </svg>
    ),
    color: "#4285f4",
    hint: { SPA: "Presentá tu ticket en la terminal", ENG: "Present your ticket at the terminal", PRT: "Apresente seu ticket no terminal" },
  },
  cash: {
    icon: (
      <svg viewBox="0 0 64 64" fill="none">
        <rect x="4" y="18" width="56" height="28" rx="6" fill="#e8f5e9" stroke="#4caf50" strokeWidth="3"/>
        <circle cx="32" cy="32" r="9" stroke="#4caf50" strokeWidth="3"/>
        <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#4caf50">$</text>
        <circle cx="12" cy="32" r="3" fill="#4caf50"/>
        <circle cx="52" cy="32" r="3" fill="#4caf50"/>
      </svg>
    ),
    color: "#4caf50",
    hint: { SPA: "Presentá tu ticket en caja para pagar", ENG: "Present your ticket at the counter to pay", PRT: "Apresente seu ticket no caixa para pagar" },
  },
  qr: {
    icon: (
      <svg viewBox="0 0 64 64" fill="none">
        <rect x="6" y="6" width="22" height="22" rx="3" stroke="#00b4d8" strokeWidth="3" fill="#e0f7fa"/>
        <rect x="12" y="12" width="10" height="10" rx="1" fill="#00b4d8"/>
        <rect x="36" y="6" width="22" height="22" rx="3" stroke="#00b4d8" strokeWidth="3" fill="#e0f7fa"/>
        <rect x="42" y="12" width="10" height="10" rx="1" fill="#00b4d8"/>
        <rect x="6" y="36" width="22" height="22" rx="3" stroke="#00b4d8" strokeWidth="3" fill="#e0f7fa"/>
        <rect x="12" y="42" width="10" height="10" rx="1" fill="#00b4d8"/>
        <rect x="36" y="36" width="8" height="8" rx="1" fill="#00b4d8"/>
        <rect x="50" y="36" width="8" height="8" rx="1" fill="#00b4d8"/>
        <rect x="36" y="50" width="8" height="8" rx="1" fill="#00b4d8"/>
        <rect x="50" y="50" width="8" height="8" rx="1" fill="#00b4d8"/>
      </svg>
    ),
    color: "#00b4d8",
    hint: { SPA: "Escaneá el QR de tu ticket para pagar", ENG: "Scan the QR on your ticket to pay", PRT: "Escaneie o QR do seu ticket para pagar" },
  },
};

function formatDateTime() {
  const now = new Date();
  return now.toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function OrderConfirmedScreen({ orderNumber, paymentMethod, onDone }) {
  const { t, lang } = useLang();
  const meta = PAYMENT_META[paymentMethod] || PAYMENT_META.cash;
  const [countdown, setCountdown] = useState(AUTO_RETURN_S);
  const [dateStr] = useState(formatDateTime);

  // Countdown tick
  useEffect(() => {
    if (countdown <= 0) { onDone(); return; }
    const tick = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(tick);
  }, [countdown]);

  const progress = ((AUTO_RETURN_S - countdown) / AUTO_RETURN_S) * 100;

  return (
    <div className={styles.root}>
      {/* Decorative blobs */}
      <div className={styles.blobTL} />
      <div className={styles.blobBR} />

      {/* ── TICKET ── */}
      <div className={styles.ticket}>
        {/* Ticket header */}
        <div className={styles.ticketHeader}>
          <div className={styles.ticketBrand}>TU APP FOOD</div>
          <div className={styles.ticketDate}>{dateStr}</div>
        </div>

        <hr className={styles.divider} />

        {/* Check circle */}
        <div className={styles.checkWrap}>
          <svg className={styles.checkSvg} viewBox="0 0 120 120">
            <circle
              className={styles.checkRing}
              cx="60" cy="60" r="54"
              fill="none" strokeWidth="6"
            />
            <polyline
              className={styles.checkMark}
              points="34,62 52,80 86,42"
              fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Title */}
        <div className={styles.title}>{t.orderConfirmed.title}</div>

        {/* Order number */}
        <div className={styles.numberCard}>
          <div className={styles.numberLabel}>{t.orderConfirmed.number}</div>
          <div className={styles.numberValue}>#{orderNumber}</div>
        </div>

        {/* Subtitle messages */}
        <div className={styles.preparing}>{t.orderConfirmed.preparing}</div>
        <div className={styles.wait}>{t.orderConfirmed.wait}</div>

        <hr className={styles.divider} />

        {/* Payment method badge */}
        {paymentMethod && (
          <div className={styles.paymentBadge} style={{ borderColor: meta.color }}>
            <div className={styles.paymentBadgeIcon}>{meta.icon}</div>
            <div className={styles.paymentBadgeText}>
              <span className={styles.paymentBadgeLabel} style={{ color: meta.color }}>
                {t.orderConfirmed.paymentMethod}
              </span>
              <span className={styles.paymentBadgeName}>
                {t.payment[paymentMethod]}
              </span>
              <span className={styles.paymentBadgeHint}>
                {meta.hint[lang]}
              </span>
            </div>
          </div>
        )}

        {/* Bouncing dots loader */}
        <div className={styles.dotsRow}>
          <span className={styles.dot} style={{ animationDelay: "0s" }} />
          <span className={styles.dot} style={{ animationDelay: "0.2s" }} />
          <span className={styles.dot} style={{ animationDelay: "0.4s" }} />
        </div>
      </div>

      {/* Progress bar + countdown — outside ticket */}
      <div className={styles.footer}>
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.countdownText}>
          {t.orderConfirmed.returnIn} <strong>{countdown}</strong> {t.orderConfirmed.seconds}
        </div>
      </div>
    </div>
  );
}
