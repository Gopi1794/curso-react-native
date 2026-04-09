import { useEffect, useState } from "react";
import { imageMap } from "../../../assets/utils/imageMap";
import { useLang } from "../LanguageContext";
import styles from "./CartModal.module.css";

export default function CartModal({
  cart,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onConfirmOrder,
}) {
  const { t, lang } = useLang();
  // step: "cart" | "payment" | "confirmed"
  const [step, setStep] = useState("cart");
  const [savedTotal, setSavedTotal] = useState(0);
  const [savedPayment, setSavedPayment] = useState(null);

  const getItemName = (item) =>
    item[`name_${lang.toLowerCase()}`] || item.name;

  const getItemSrc = (item) => {
    const key = Array.isArray(item.imageKey) ? item.imageKey[0] : item.imageKey;
    return imageMap[key] || "";
  };

  const subtotal = cart.reduce((sum, item) => {
    const p = parseFloat(item.price?.replace("$", "") || 0);
    return sum + p * item.qty;
  }, 0);

  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleSelectPayment = (method) => {
    setSavedTotal(subtotal);
    setSavedPayment(method);
    setStep("confirmed");
  };

  // After showing the confirmation screen, notify parent
  useEffect(() => {
    if (step !== "confirmed") return;
    const timer = setTimeout(() => {
      onConfirmOrder(savedPayment);
    }, 3000);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {step === "confirmed" ? (
          /* ── CONFIRMATION SCREEN ── */
          <div className={styles.confirmScreen}>
            <div className={styles.confirmCircle}>✓</div>
            <div className={styles.confirmTitle}>{t.cart.confirmed}</div>
            <div className={styles.confirmSub}>{t.cart.confirmedSub}</div>
            <div className={styles.confirmTotal}>${savedTotal.toFixed(2)}</div>
            <div className={styles.confirmDots}>
              <span className={styles.confirmDot} />
              <span className={styles.confirmDot} />
              <span className={styles.confirmDot} />
            </div>
          </div>
        ) : step === "payment" ? (
          /* ── PAYMENT SELECTION ── */
          <div className={styles.paymentScreen}>
            <div className={styles.paymentTitle}>{t.payment.title}</div>
            <div className={styles.paymentGrid}>

              {/* Tarjeta */}
              <button
                className={styles.paymentCard}
                onClick={() => handleSelectPayment("card")}
              >
                <div className={styles.paymentIcon}>
                  <svg viewBox="0 0 64 64" fill="none">
                    <rect x="4" y="14" width="56" height="36" rx="6" fill="#e8f0fe" stroke="#4285f4" strokeWidth="3"/>
                    <rect x="4" y="24" width="56" height="10" fill="#4285f4"/>
                    <rect x="12" y="38" width="16" height="5" rx="2" fill="#4285f4"/>
                  </svg>
                </div>
                <div className={styles.paymentLabel}>{t.payment.card}</div>
                <div className={styles.paymentSub}>Débito / Crédito</div>
              </button>

              {/* Efectivo */}
              <button
                className={styles.paymentCard}
                onClick={() => handleSelectPayment("cash")}
              >
                <div className={styles.paymentIcon}>
                  <svg viewBox="0 0 64 64" fill="none">
                    <rect x="4" y="18" width="56" height="28" rx="6" fill="#e8f5e9" stroke="#4caf50" strokeWidth="3"/>
                    <circle cx="32" cy="32" r="9" stroke="#4caf50" strokeWidth="3"/>
                    <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#4caf50">$</text>
                    <circle cx="12" cy="32" r="3" fill="#4caf50"/>
                    <circle cx="52" cy="32" r="3" fill="#4caf50"/>
                  </svg>
                </div>
                <div className={styles.paymentLabel}>{t.payment.cash}</div>
                <div className={styles.paymentSub}>Pagás en caja</div>
              </button>

              {/* QR */}
              <button
                className={styles.paymentCard}
                onClick={() => handleSelectPayment("qr")}
              >
                <div className={styles.paymentIcon}>
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
                </div>
                <div className={styles.paymentLabel}>{t.payment.qr}</div>
                <div className={styles.paymentSub}>Mercado Pago</div>
              </button>

            </div>
          </div>
        ) : (
          <>
            {/* ── HEADER ── */}
            <div className={styles.header}>
              <button className={styles.closeBtn} onClick={onClose}>✕</button>
              <div className={styles.headerCenter}>
                <div className={styles.headerTitle}>{t.cart.title}</div>
                <div className={styles.headerSub}>
                  {totalCount} {totalCount !== 1 ? t.home.products : t.home.product}
                </div>
              </div>
              {cart.length > 0 && (
                <button className={styles.clearBtn} onClick={onClearCart} title="Vaciar">
                  🗑
                </button>
              )}
            </div>

            {/* ── SCROLLABLE CONTENT ── */}
            <div className={styles.content}>
              {cart.length === 0 ? (
                /* Empty state */
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🛒</div>
                  <div className={styles.emptyText}>{t.home.emptyOrder}</div>
                  <button className={styles.keepBrowsingBtn} onClick={onClose}>
                    {t.cart.keepBrowsing}
                  </button>
                </div>
              ) : (
                <>
                  {/* Items list */}
                  <div className={styles.itemsList}>
                    {cart.map((item) => {
                      const src = getItemSrc(item);
                      const unitPrice = parseFloat(item.price?.replace("$", "") || 0);
                      const lineTotal = unitPrice * item.qty;
                      return (
                        <div className={styles.cartItem} key={item.id}>
                          {/* Thumbnail */}
                          {src && (
                            <img
                              src={src}
                              alt={getItemName(item)}
                              className={styles.itemImg}
                            />
                          )}

                          {/* Info */}
                          <div className={styles.itemInfo}>
                            <div className={styles.itemName}>{getItemName(item)}</div>
                            <div
                              className={styles.itemUnitPrice}
                              style={{ color: item.priceColor || "#f7931e" }}
                            >
                              {item.price} c/u
                            </div>
                            {/* Qty selector */}
                            <div className={styles.qtySelector}>
                              <button
                                className={styles.qtyBtn}
                                onClick={() => onUpdateQty(item.id, item.qty - 1)}
                              >
                                −
                              </button>
                              <span className={styles.qtyNum}>{item.qty}</span>
                              <button
                                className={styles.qtyBtn}
                                onClick={() => onUpdateQty(item.id, item.qty + 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Right: total + delete */}
                          <div className={styles.itemRight}>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => onRemoveItem(item.id)}
                            >
                              🗑
                            </button>
                            <div
                              className={styles.itemTotal}
                              style={{ color: item.priceColor || "#f7931e" }}
                            >
                              ${lineTotal.toFixed(2)}
                            </div>
                            {item.qty > 1 && (
                              <div className={styles.unitCalc}>
                                {item.qty} × ${unitPrice.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order summary */}
                  <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>
                        {t.cart.subtotal} ({totalCount}{" "}
                        {totalCount !== 1 ? t.home.products : t.home.product})
                      </span>
                      <span className={styles.summaryValue}>
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                      <span className={styles.totalLabel}>Total</span>
                      <span className={styles.totalAmount}>
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── ACTION BAR ── */}
            {cart.length > 0 && (
              <div className={styles.actionBar}>
                <button className={styles.confirmBtn} onClick={() => setStep("payment")}>
                  {t.cart.confirm} · ${subtotal.toFixed(2)}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
