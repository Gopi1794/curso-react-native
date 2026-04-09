import { useEffect } from "react";
import { imageMap } from "../../../assets/utils/imageMap";
import { useLang } from "../LanguageContext";
import styles from "./UpsellModal.module.css";

// Categorías que se sugieren como complemento (en orden de prioridad)
const SUGGEST_CATS = ["BEBIDAS", "POSTRES", "HELADOS", "PASTAS", "PIZZAS", "BURGERS"];

function getSuggestions(addedItem, allItems, cart) {
  const cartIds = new Set(cart.map((c) => c.id));
  const addedCat = addedItem.category?.toUpperCase();

  // Excluir la categoría del item agregado para no sugerir lo mismo
  const preferred = SUGGEST_CATS.filter((c) => c !== addedCat);

  const suggestions = [];
  const usedIds = new Set([addedItem.id]);

  for (const cat of preferred) {
    if (suggestions.length >= 3) break;
    const item = allItems.find(
      (i) =>
        i.category?.toUpperCase() === cat &&
        !usedIds.has(i.id) &&
        !cartIds.has(i.id),
    );
    if (item) {
      suggestions.push(item);
      usedIds.add(item.id);
    }
  }

  return suggestions;
}

export default function UpsellModal({ addedItem, allItems, cart, onAddSuggestion, onClose }) {
  const { t, lang } = useLang();
  const getItemName = (item) => item[`name_${lang.toLowerCase()}`] || item.name;
  const suggestions = getSuggestions(addedItem, allItems, cart);

  // Auto-dismiss a los 10 segundos si el usuario no hace nada
  useEffect(() => {
    const timer = setTimeout(onClose, 10_000);
    return () => clearTimeout(timer);
  }, []);

  if (suggestions.length === 0) {
    onClose();
    return null;
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className={styles.header}>
          <div className={styles.checkCircle}>✓</div>
          <div className={styles.headerText}>
            <div className={styles.headerTitle}>
              <strong>{getItemName(addedItem)}</strong> {t.upsell.added}
            </div>
            <div className={styles.headerSub}>{t.upsell.title}</div>
          </div>
        </div>

        {/* ── SUGERENCIAS ── */}
        <div className={styles.grid}>
          {suggestions.map((item) => {
            const key = Array.isArray(item.imageKey) ? item.imageKey[0] : item.imageKey;
            const src = imageMap[key] || "";
            return (
              <div key={item.id} className={styles.card}>
                <div className={styles.cardImgWrap}>
                  {src ? (
                    <img src={src} alt={getItemName(item)} className={styles.cardImg} />
                  ) : (
                    <div className={styles.cardImgPlaceholder} />
                  )}
                </div>
                <div className={styles.cardName}>{getItemName(item)}</div>
                <div
                  className={styles.cardPrice}
                  style={{ color: item.priceColor || "#f7931e" }}
                >
                  {item.price}
                </div>
                <button
                  className={styles.addBtn}
                  onClick={() => { onAddSuggestion(item); onClose(); }}
                >
                  + {t.upsell.add}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── DISMISS ── */}
        <button className={styles.dismissBtn} onClick={onClose}>
          {t.upsell.noThanks}
        </button>
      </div>
    </div>
  );
}
