import { useRef, useState } from "react";
import Lottie from "lottie-react";
import { imageMap } from "../../../assets/utils/imageMap";
import { useLang } from "../LanguageContext";
import clockAnim from "@assets/animations/clock.json";
import statAnim from "@assets/animations/statAnimate.json";
import styles from "./FoodDetailModal.module.css";

function getCarouselImages(item) {
  const keys = Array.isArray(item.imageKey) ? item.imageKey : [item.imageKey];
  const withSuffix = keys.filter(
    (k) => k.includes("_") && !isNaN(k.split("_").pop()),
  );
  if (withSuffix.length > 0) {
    return withSuffix.map((k) => imageMap[k]).filter(Boolean);
  }
  const main = imageMap[keys[0]];
  return main ? [main] : [];
}

export default function FoodDetailModal({ item, onClose, onAddToCart }) {
  const { t, lang } = useLang();
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const touchStartX = useRef(null);

  const getItemName = (i) => i[`name_${lang.toLowerCase()}`] || i.name;

  const images = getCarouselImages(item);
  const price = parseFloat(item.price?.replace("$", "") || 0);
  const totalPrice = (price * qty).toFixed(2);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta < -50 && imgIdx < images.length - 1) setImgIdx((i) => i + 1);
    if (delta > 50  && imgIdx > 0)                 setImgIdx((i) => i - 1);
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ── IMAGE CAROUSEL ── */}
        <div
          className={styles.carousel}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {images.length > 0 ? (
            <img
              src={images[imgIdx]}
              alt={getItemName(item)}
              className={styles.carouselImg}
            />
          ) : (
            <div className={styles.carouselPlaceholder} />
          )}

          {images.length > 1 && imgIdx > 0 && (
            <button
              className={`${styles.carouselBtn} ${styles.prevBtn}`}
              onClick={() => setImgIdx((i) => i - 1)}
            >
              ‹
            </button>
          )}
          {images.length > 1 && imgIdx < images.length - 1 && (
            <button
              className={`${styles.carouselBtn} ${styles.nextBtn}`}
              onClick={() => setImgIdx((i) => i + 1)}
            >
              ›
            </button>
          )}

          {images.length > 1 && (
            <>
              <div className={styles.counter}>
                {imgIdx + 1} / {images.length}
              </div>
              <div className={styles.dots}>
                {images.map((_, i) => (
                  <button
                    key={i}
                    className={
                      styles.dot + (i === imgIdx ? ` ${styles.dotActive}` : "")
                    }
                    onClick={() => setImgIdx(i)}
                  />
                ))}
              </div>
            </>
          )}

          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* ── SCROLLABLE CONTENT ── */}
        <div className={styles.content}>
          {/* Title + Price */}
          <div className={styles.titleRow}>
            <h2 className={styles.title}>{getItemName(item)}</h2>
            <span
              className={styles.price}
              style={{ color: item.priceColor || "#f7931e" }}
            >
              {item.price}
            </span>
          </div>

          {/* Rating */}
          <div className={styles.ratingRow}>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className={s <= 4 ? styles.starFilled : styles.starEmpty}
                >
                  ★
                </span>
              ))}
            </div>
            <span className={styles.ratingText}>
              4.8 (128 {t.home.reviews})
            </span>
          </div>

          {/* Stats */}
          <div className={styles.statsRow}>
            <div className={styles.statChip}>
              <Lottie animationData={clockAnim} loop style={{ width: 56, height: 56 }} />
              <span>15-20 min</span>
            </div>
            <div className={styles.statChip}>
              <Lottie animationData={statAnim} loop style={{ width: 56, height: 56 }} />
              <span>650 cal</span>
            </div>
          </div>

          {/* Description */}
          {item.descriptionText && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>{t.home.description}</h3>
              <p className={styles.descriptionText}>{item.descriptionText}</p>
            </div>
          )}

          {/* Ingredients */}
          {item.ingredientText && item.ingredientText.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>{t.home.ingredients}</h3>
              <div className={styles.ingredientsGrid}>
                {item.ingredientText.map((ing, i) => (
                  <span key={i} className={styles.ingredientChip}>
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── FIXED ACTION BAR ── */}
        <div className={styles.actionBar}>
          <div className={styles.qtySelector}>
            <button
              className={styles.qtyBtn}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className={styles.qtyNum}>{qty}</span>
            <button
              className={styles.qtyBtn}
              onClick={() => setQty((q) => q + 1)}
            >
              +
            </button>
          </div>

          <button
            className={styles.addBtn}
            onClick={() => {
              onAddToCart(item, qty);
              onClose();
            }}
          >
            {t.home.addToOrder} · ${totalPrice}
          </button>
        </div>
      </div>
    </div>
  );
}
