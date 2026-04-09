import { useEffect, useRef, useState } from "react";
import promoDia1BannerGif from "../../assets/gif/promodia1banner.gif";

// GIFs de banner por id de item — solo kiosko, no toca datos compartidos
const bannerGifMap = {
  101: promoDia1BannerGif,
};
import Lottie from "lottie-react";
import discountAnim from "@assets/animations/discount.json";
import cuponesAnim from "@assets/animations/cupones.json";
import cuponesImg from "@assets/img/nav/cupones.png";
import logoImg from "@assets/adaptive-icon.png";
import ticket1Img from "@assets/img/tickets/ticket-1.webp";
import ticket2Img from "@assets/img/tickets/ticket-2.webp";
import ticket3Img from "@assets/img/tickets/ticket-3.webp";
import ticket4Img from "@assets/img/tickets/ticket-4.webp";
import ticket5Img from "@assets/img/tickets/ticket-5.webp";
import ticket6Img from "@assets/img/tickets/ticket-6.webp";
import ticketsData from "../../assets/data/tickets.json";
import useMenuLogic from "../../hooks/useMenuLogic";
import menuItemsData from "../../assets/data/menuItems.json";
import { imageMap } from "../../assets/utils/imageMap";
import CouponButton from "./components/CouponButton";
import { useLang } from "./LanguageContext";
import FoodDetailModal from "./screen/FoodDetailModal";
import CartModal from "./screen/CartModal";
import UpsellModal from "./screen/UpsellModal";

const ticketImgMap = {
  "ticket-1.webp": ticket1Img,
  "ticket-2.webp": ticket2Img,
  "ticket-3.webp": ticket3Img,
  "ticket-4.webp": ticket4Img,
  "ticket-5.webp": ticket5Img,
  "ticket-6.webp": ticket6Img,
};

const categoryDefs = [
  { id: "TODOS", label: "Todos" },
  { id: "ENSALADAS", label: "Ensaladas" },
  { id: "BURGERS", label: "Burgers" },
  { id: "EMPLATADOS", label: "Emplatados" },
  { id: "SANDWICHS", label: "Sandwichs" },
  { id: "PROMOS", label: "Promos" },
  { id: "PIZZAS", label: "Pizzas" },
  { id: "PASTAS", label: "Pastas" },
  { id: "POSTRES", label: "Postres" },
  { id: "HELADOS", label: "Helados" },
  { id: "BEBIDAS", label: "Bebidas" },
  { id: "CUPONES", label: "Cupones" },
];

// Imágenes fijas para categorías que no tienen items en el JSON
const categoryImageOverride = {
  CUPONES: cuponesImg,
};

const getCategoryImage = (categoryId) => {
  if (categoryImageOverride[categoryId]) return categoryImageOverride[categoryId];
  if (categoryId === "TODOS") return "";
  const item = menuItemsData.find(
    (i) => i.category?.toLowerCase() === categoryId.toLowerCase(),
  );
  if (!item) return "";
  const key = Array.isArray(item.imageKey) ? item.imageKey[0] : item.imageKey;
  return imageMap[key] || "";
};

// ── Skeleton ──────────────────────────────────────────────
const SkeletonBox = ({ w, h, radius = 12, style = {} }) => (
  <div
    className="skeleton-box"
    style={{ width: w, height: h, borderRadius: radius, ...style }}
  />
);

function ScreenSkeleton() {
  return (
    <div className="kiosk-skeleton-root">
      {/* Banner */}
      <SkeletonBox w="100%" h={420} radius={0} />

      {/* Nav row */}
      <div className="kiosk-skeleton-nav">
        <SkeletonBox w={160} h={52} radius={26} />
        <SkeletonBox w={180} h={34} />
        <SkeletonBox w={220} h={52} radius={26} />
      </div>

      {/* Categories */}
      <div className="kiosk-skeleton-cats">
        {[...Array(8)].map((_, i) => (
          <SkeletonBox key={i} w={90} h={90} radius={45} />
        ))}
      </div>

      {/* Label */}
      <SkeletonBox w={180} h={30} style={{ margin: "12px 32px" }} />

      {/* Grid de productos */}
      <div className="kiosk-skeleton-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="kiosk-skeleton-card">
            <SkeletonBox w={150} h={150} radius={75} />
            <SkeletonBox w="75%" h={26} />
            <SkeletonBox w="45%" h={34} />
            <SkeletonBox w={54} h={54} radius={27} />
          </div>
        ))}
      </div>

      {/* Order bar */}
      <div className="kiosk-skeleton-order-bar">
        <SkeletonBox w={160} h={28} />
        <SkeletonBox w={280} h={24} style={{ marginTop: 8 }} />
        <div className="kiosk-skeleton-order-actions">
          <SkeletonBox w="48%" h={64} radius={16} />
          <SkeletonBox w="48%" h={64} radius={16} />
        </div>
      </div>
    </div>
  );
}
// ── TicketCard ────────────────────────────────────────────
function TicketCard({ ticket, t }) {
  const src = ticketImgMap[ticket.img] || "";
  return (
    <div className="kiosk-ticket-card">
      {/* Barra de color superior */}
      <div className="kiosk-ticket-glow" style={{ background: ticket.color }} />

      {/* Izquierda: imagen + info */}
      <div className="kiosk-ticket-left">
        {src && <img src={src} alt={ticket.title} className="kiosk-ticket-img" />}
        <div className="kiosk-ticket-overlay" />
        <div className="kiosk-ticket-content">
          <span
            className="kiosk-ticket-offer-badge"
            style={{ background: ticket.color }}
          >
            {ticket.offer}
          </span>
          <div className="kiosk-ticket-title">{ticket.title}</div>
        </div>
        <div className="kiosk-ticket-valid">
          📅 {ticket.validUntil}
        </div>
      </div>

      {/* Divisor punteado */}
      <div className="kiosk-ticket-divider">
        <div className="kiosk-ticket-circle" />
        <div className="kiosk-ticket-dotted" />
        <div className="kiosk-ticket-circle" />
      </div>

      {/* Derecha: logo + disclaimer + botón */}
      <div className="kiosk-ticket-right">
        <img src={logoImg} alt="AppFood" className="kiosk-ticket-logo" />
        <div className="kiosk-ticket-disclaimer">{ticket.disclaimer}</div>
        <button
          className="kiosk-ticket-btn"
          style={{ background: ticket.color }}
        >
          {t.home.applyCoupon}
        </button>
      </div>
    </div>
  );
}
// ──────────────────────────────────────────────────────────

export default function ScreenHome({
  orderType,
  onBack,
  cart,
  cartCount,
  onAddToCart,
  onCancelOrder,
  onUpdateCartQty,
  onRemoveFromCart,
  onConfirmOrder,
}) {
  const { lang, t } = useLang();
  // Devuelve el nombre del item en el idioma activo, con fallback al nombre original
  const getItemName = (item) =>
    item[`name_${lang.toLowerCase()}`] || item.name;
  const promos = menuItemsData.filter((i) => i.category === "promoDia");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [upsellItem, setUpsellItem] = useState(null);

  // No mostrar upsell si el item agregado ya es una sugerencia típica
  const SKIP_UPSELL_CATS = ["BEBIDAS", "POSTRES", "HELADOS"];
  const handleAddToCart = (item, qty = 1) => {
    onAddToCart(item, qty);
    if (!SKIP_UPSELL_CATS.includes(item.category?.toUpperCase())) {
      setUpsellItem(item);
    }
  };
  const [bannerIndex, setBannerIndex] = useState(0);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const listRef = useRef(null);
  const trackRef = useRef(null);
  const translateRef = useRef(0); // valor real siempre actualizado
  const touchStartXRef = useRef(null);
  const touchStartTrRef = useRef(0);

  const {
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    filteredMenuItems,
  } = useMenuLogic(menuItemsData);

  // Aplica el translate directo al DOM (sin pasar por React state → 60fps)
  const applyTranslate = (val, animate = true) => {
    translateRef.current = val;
    if (!listRef.current) return;
    listRef.current.style.transition = animate ? "" : "none";
    listRef.current.style.transform = `translateX(${val}px)`;
  };

  // Centra la categoría activa animada
  const centerActive = () => {
    const list = listRef.current;
    const track = trackRef.current;
    if (!list || !track) return;
    const activeBtn = list.querySelector(".kiosk-cat-item.active");
    if (!activeBtn) return;
    const trackRect = track.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const btnCenter = btnRect.left - trackRect.left + btnRect.width / 2;
    const delta = trackRect.width / 2 - btnCenter;
    applyTranslate(translateRef.current + delta, true);
  };

  useEffect(() => {
    if (!initialLoaded) return;
    const raf = requestAnimationFrame(centerActive);
    return () => cancelAnimationFrame(raf);
  }, [selectedCategory, initialLoaded]);

  // ── Touch drag — listener no-pasivo para poder mover libremente ──
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !initialLoaded) return;

    const onStart = (e) => {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartTrRef.current = translateRef.current;
      if (listRef.current) listRef.current.style.transition = "none";
    };

    const onMove = (e) => {
      if (touchStartXRef.current === null) return;
      e.preventDefault(); // solo funciona con passive:false
      // El kiosk está escalado con CSS transform: scale(). getBoundingClientRect devuelve
      // píxeles de pantalla, pero translateX opera en el espacio interno (1080px).
      // Dividir por el factor de escala convierte el delta correctamente.
      const cssScale = track.getBoundingClientRect().width / track.offsetWidth;
      const delta = (e.touches[0].clientX - touchStartXRef.current) / cssScale;
      const val = touchStartTrRef.current + delta;
      translateRef.current = val;
      if (listRef.current)
        listRef.current.style.transform = `translateX(${val}px)`;
    };

    const onEnd = () => {
      if (touchStartXRef.current === null) return;
      touchStartXRef.current = null;
      if (listRef.current) listRef.current.style.transition = "";
      // Snap: selecciona la categoría más cercana al centro
      const list = listRef.current;
      if (!list) return;
      const trackCenter =
        track.getBoundingClientRect().left +
        track.getBoundingClientRect().width / 2;
      const buttons = list.querySelectorAll(".kiosk-cat-item");
      let nearestIdx = 0,
        nearestDist = Infinity;
      buttons.forEach((btn, i) => {
        const r = btn.getBoundingClientRect();
        const dist = Math.abs(r.left + r.width / 2 - trackCenter);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      });
      setSelectedCategory(categoryDefs[nearestIdx].id);
      setSearchQuery("");
    };

    track.addEventListener("touchstart", onStart, { passive: true });
    track.addEventListener("touchmove", onMove, { passive: false }); // ← clave
    track.addEventListener("touchend", onEnd);
    return () => {
      track.removeEventListener("touchstart", onStart);
      track.removeEventListener("touchmove", onMove);
      track.removeEventListener("touchend", onEnd);
    };
  }, [initialLoaded]);
  // ─────────────────────────────────────────────────────────────────

  // Auto-avance: 5 s después de cada cambio de slide (no desmonta las categorías)
  useEffect(() => {
    if (!initialLoaded || promos.length <= 1) return;
    const id = setTimeout(() => {
      setBannerIndex((i) => (i + 1) % promos.length);
    }, 5000);
    return () => clearTimeout(id);
  }, [bannerIndex, initialLoaded, promos.length]);

  const bannerItem = promos[bannerIndex];
  const bannerSrc = bannerItem
    ? bannerGifMap[bannerItem.id] ||
      imageMap[
        Array.isArray(bannerItem.imageKey)
          ? bannerItem.imageKey[0]
          : bannerItem.imageKey
      ] || ""
    : "";

  // Flechas: navegan a la categoría anterior / siguiente
  const goToPrev = () => {
    const idx = categoryDefs.findIndex((c) => c.id === selectedCategory);
    if (idx > 0) setSelectedCategory(categoryDefs[idx - 1].id);
  };
  const goToNext = () => {
    const idx = categoryDefs.findIndex((c) => c.id === selectedCategory);
    if (idx < categoryDefs.length - 1)
      setSelectedCategory(categoryDefs[idx + 1].id);
  };

  const cartTotal = cart.reduce((sum, c) => {
    const price = parseFloat(c.price?.replace("$", "") || 0);
    return sum + price * c.qty;
  }, 0);

  const activeCatLabel = t.categories[selectedCategory] || selectedCategory;

  return (
    <div className="kiosk-root">
      {/* Imagen oculta para precargar solo la primera vez */}
      {bannerSrc && !initialLoaded && (
        <img
          src={bannerSrc}
          alt=""
          style={{ display: "none" }}
          onLoad={() => setInitialLoaded(true)}
        />
      )}

      {/* Skeleton de carga — solo hasta la primera imagen lista */}
      {!initialLoaded && <ScreenSkeleton />}

      {/* Contenido real — se monta una sola vez y nunca se desmonta */}
      {initialLoaded && (
        <>
          {/* ── BANNER ── */}
          <div className="kiosk-banner">
            <img
              src={bannerSrc}
              alt={t.home.promoAlt}
              className="kiosk-banner-img"
            />

            <div className="kiosk-banner-overlay" />

            {bannerItem && (
              <div className="kiosk-banner-badge">
                <Lottie
                  animationData={discountAnim}
                  loop
                  className="kiosk-banner-lottie"
                />
                <span className="kiosk-banner-badge-text">
                  -{bannerItem.discountPercentage}%
                </span>
              </div>
            )}

            {bannerItem && (
              <button
                className="kiosk-banner-action-btn"
                onClick={() => setSelectedItem(bannerItem)}
              >
                {t.home.viewOffer}
              </button>
            )}

            {bannerItem && (
              <div className="kiosk-banner-info">
                <div className="kiosk-banner-title">{t.home.offerTitle}</div>
                <div className="kiosk-banner-desc">
                  {bannerItem.descriptionText}
                </div>
                <div className="kiosk-banner-prices">
                  <span className="kiosk-banner-old-price">
                    {bannerItem.originalPrice}
                  </span>
                  <span className="kiosk-banner-new-price">
                    {bannerItem.price}
                  </span>
                </div>
                <div className="kiosk-banner-timer">{t.home.offerTimer}</div>
              </div>
            )}

            {promos.length > 1 && (
              <div className="kiosk-banner-dots">
                {promos.map((_, i) => (
                  <button
                    key={i}
                    className={
                      "kiosk-dot" + (i === bannerIndex ? " active" : "")
                    }
                    onClick={() => setBannerIndex(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── NAV ROW ── */}
          <div className="kiosk-nav-row">
            <button className="kiosk-back-btn" onClick={onBack}>
              {t.home.back}
            </button>

            {/* Barra de búsqueda */}
            <div className="kiosk-search-bar">
              <svg className="kiosk-search-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7"/>
                <line x1="16.5" y1="16.5" x2="22" y2="22"/>
              </svg>
              <input
                className="kiosk-search-input"
                type="text"
                placeholder={t.home.search}
                value={searchVal}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchVal(val);
                  setSearchQuery(val);
                  if (val) setSelectedCategory("TODOS");
                }}
              />
              {searchVal && (
                <button
                  className="kiosk-search-clear"
                  onClick={() => {
                    setSearchVal("");
                    setSearchQuery("");
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <CouponButton />
          </div>

          {/* ── CATEGORÍAS ── */}
          <div className="kiosk-cat-row">
            <button className="kiosk-cat-arrow" onClick={goToPrev}>
              ‹
            </button>
            <div className="kiosk-cat-track" ref={trackRef}>
              <div className="kiosk-cat-list" ref={listRef}>
                {categoryDefs.map((c) => {
                  const src = getCategoryImage(c.id);
                  const isActive = selectedCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      className={"kiosk-cat-item" + (isActive ? " active" : "")}
                      onClick={() => {
                        setSelectedCategory(c.id);
                        setSearchQuery("");
                      }}
                    >
                      <div
                        className={
                          "kiosk-cat-circle" + (isActive ? " active" : "")
                        }
                        style={{ position: "relative" }}
                      >
                        {src ? (
                          <img
                            src={src}
                            alt={t.categories[c.id] || c.id}
                            className="kiosk-cat-img"
                          />
                        ) : (
                          <span className="kiosk-cat-emoji">🍽️</span>
                        )}
                        {c.id === "CUPONES" && (
                          <Lottie
                            animationData={cuponesAnim}
                            loop
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: "100%",
                              height: "100%",
                              pointerEvents: "none",
                            }}
                          />
                        )}
                      </div>
                      <span
                        className={
                          "kiosk-cat-label" + (isActive ? " active" : "")
                        }
                      >
                        {t.categories[c.id] || c.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button className="kiosk-cat-arrow" onClick={goToNext}>
              ›
            </button>
          </div>

          {/* ── LABEL CATEGORÍA ACTIVA ── */}
          <div className="kiosk-active-cat-label">{activeCatLabel}</div>

          {/* ── GRID DE PRODUCTOS / CUPONES ── */}
          <div className="kiosk-grid-area">
            {selectedCategory === "CUPONES" ? (
              <div className="kiosk-coupon-grid">
                {ticketsData.tickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} t={t} />
                ))}
              </div>
            ) : (
              <div className="kiosk-grid">
                {filteredMenuItems.map((item) => {
                  const key = Array.isArray(item.imageKey)
                    ? item.imageKey[0]
                    : item.imageKey;
                  const src = imageMap[key] || "";
                  return (
                    <div
                      className="kiosk-card"
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="kiosk-card-img-wrap">
                        {src ? (
                          <img
                            src={src}
                            alt={getItemName(item)}
                            className="kiosk-card-img"
                          />
                        ) : (
                          <div className="kiosk-card-img-placeholder" />
                        )}
                      </div>
                      <div className="kiosk-card-name">{getItemName(item)}</div>
                      <div
                        className="kiosk-card-price"
                        style={{ color: item.priceColor || "#f7931e" }}
                      >
                        {item.price}
                      </div>
                      <button
                        className="kiosk-card-add-btn"
                        onClick={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                        title={t.home.addToOrder}
                      >
                        ↗
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── BARRA DE PEDIDO ── */}
          <div className="kiosk-order-bar">
            <div className="kiosk-order-title">{t.home.myOrder}</div>
            <div className="kiosk-order-info">
              {cart.length === 0
                ? t.home.emptyOrder
                : `${cartCount} ${cartCount !== 1 ? t.home.products : t.home.product} · $${cartTotal.toFixed(2)}`}
            </div>
            <div className="kiosk-order-actions">
              <button className="kiosk-cancel-btn" onClick={onCancelOrder}>
                {t.home.cancelOrder}
              </button>
              <button className="kiosk-view-btn" onClick={() => setShowCart(true)}>{t.home.viewOrder}</button>
            </div>
          </div>
        </>
      )}

      {/* ── FOOD DETAIL MODAL ── */}
      {selectedItem && (
        <FoodDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* ── UPSELL MODAL ── */}
      {upsellItem && (
        <UpsellModal
          addedItem={upsellItem}
          allItems={menuItemsData}
          cart={cart}
          onAddSuggestion={(item) => handleAddToCart(item)}
          onClose={() => setUpsellItem(null)}
        />
      )}

      {/* ── CART MODAL ── */}
      {showCart && (
        <CartModal
          cart={cart}
          onClose={() => setShowCart(false)}
          onUpdateQty={onUpdateCartQty}
          onRemoveItem={onRemoveFromCart}
          onClearCart={onCancelOrder}
          onConfirmOrder={onConfirmOrder}
        />
      )}
    </div>
  );
}
