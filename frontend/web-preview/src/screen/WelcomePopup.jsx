import { useEffect, useState } from "react";
import styles from "./WelcomePopup.module.css";

const WelcomePopup = ({ showWelcomePopup, setShowWelcomePopup }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (showWelcomePopup) {
      setVisible(true);
    }
  }, [showWelcomePopup]);

  const handleStart = () => {
    setVisible(false);
    setTimeout(() => {
      setShowWelcomePopup(false);
    }, 300);
  };

  if (!showWelcomePopup) return null;

  return (
    <div className={styles.overlay}>
      <div
        className={`${styles.container} ${
          visible ? styles.scaleIn : styles.scaleOut
        }`}
      >
        {/* Card central */}
        <div className={styles.card}>
          <span className={styles.subtitle}>Bienvenido</span>

          <img
            src="/assets/adaptive-icon.png"
            alt="APPFOOD"
            className={styles.logo}
          />

          <button className={styles.startButton} onClick={handleStart}>
            Comenzar
          </button>
        </div>

        {/* Idiomas */}
        <div className={styles.languages}>
          <img src="/assets/flags/arg.png" alt="Español" />
          <img src="/assets/flags/usa.png" alt="English" />
          <img src="/assets/flags/bra.png" alt="Português" />
        </div>
      </div>
    </div>
  );
};

export default WelcomePopup;
