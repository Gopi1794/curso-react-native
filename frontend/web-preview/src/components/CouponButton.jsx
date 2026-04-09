import Lottie from "lottie-react";
import twinkleAnim from "@assets/animations/Twinkle.json";
import { useLang } from "../LanguageContext";
import styles from "./CouponButton.module.css";

const CouponButton = ({ onClick }) => {
  const { t } = useLang();
  return (
    <button className={styles.btn} onClick={onClick}>
      <span className={styles.text}>{t.home.coupon}</span>

      <Lottie animationData={twinkleAnim} loop className={styles.lottie} />
    </button>
  );
};

export default CouponButton;
