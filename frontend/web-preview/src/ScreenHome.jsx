import React from "react";
import useMenuLogic from "../../hooks/useMenuLogic";
import menuItemsData from "../../assets/data/menuItems.json";
import { imageMap } from "../../assets/utils/imageMap";
import WelcomePopup from "../../components/WelcomePopup";

const categories = [
  "TODOS",
  "ENSALADAS",
  "BURGERS",
  "EMPLATADOS",
  "SANDWICHS",
  "PROMOS",
  "PIZZAS",
  "PASTAS",
  "POSTRES",
  "HELADOS",
  "BEBIDAS",
];

export default function ScreenHome() {
  const promos = menuItemsData.filter((i) => i.category === "promoDia");

  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    filteredMenuItems,
  } = useMenuLogic(menuItemsData);

  <WelcomePopup
    showWelcomePopup={showWelcomePopup}
    setShowWelcomePopup={setShowWelcomePopup}
  />;

  return (
    <div className="sh-container">
      <header className="sh-header">
        <div className="sh-header-left">
          <div className="sh-logo">Mi App</div>
        </div>

        <div className="sh-header-right">
          <button className="sh-icon-btn" title="Tickets">
            🎫
          </button>
          <button className="sh-icon-btn" title="Carrito">
            🛒
          </button>
        </div>

        <div className="sh-header-search">
          <input
            className="sh-search"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="sh-controls">
        <div className="sh-categories">
          {categories.map((c) => (
            <button
              key={c}
              className={
                "sh-cat-btn " + (selectedCategory === c ? "active" : "")
              }
              onClick={() => {
                setSelectedCategory(c);
                setSearchQuery("");
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Promo carousel (hidden when searching) */}
      {!searchQuery.trim() && promos.length > 0 && (
        <div className="promo-section">
          <div className="promo-carousel" role="list">
            {promos.map((p) => {
              const key = Array.isArray(p.imageKey)
                ? p.imageKey[0]
                : p.imageKey;
              const src = imageMap[key] || "";
              return (
                <div className="promo-item" key={p.id} role="listitem">
                  {src ? (
                    <img src={src} alt={p.name} className="promo-img" />
                  ) : (
                    <div className="promo-placeholder">{p.name}</div>
                  )}
                  <div className="promo-title">{p.name}</div>
                </div>
              );
            })}
          </div>
          <div className="promo-indicators">
            {promos.map((_, idx) => (
              <button
                key={idx}
                className="promo-dot"
                aria-label={`promo-${idx + 1}`}
              ></button>
            ))}
          </div>
        </div>
      )}

      <div className="sh-results">
        <div className="sh-summary">
          {filteredMenuItems.length} resultado
          {filteredMenuItems.length !== 1 ? "s" : ""}
        </div>
        <div className="menu-scroller" role="list">
          {filteredMenuItems.map((item) => {
            const key = Array.isArray(item.imageKey)
              ? item.imageKey[0]
              : item.imageKey;
            const src = imageMap[key] || "";
            return (
              <div className="menu-card" key={item.id} role="listitem">
                {src ? (
                  <img className="menu-img" src={src} alt={item.name} />
                ) : (
                  <div className="menu-img-placeholder" />
                )}
                <div className="menu-card-body">
                  <div className="menu-title">{item.name}</div>
                  <div className="menu-desc">{item.descriptionText}</div>
                  <div className="menu-bottom">
                    <div
                      className="menu-price"
                      style={{ color: item.priceColor || "#ff8700" }}
                    >
                      {item.price}
                    </div>
                    <button className="menu-add">+ Añadir</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
