import { useLang } from "../LanguageContext";
import comerAquiImg from "@assets/kiosko/comer/comer-aqui.png";
import paraLlevarImg from "@assets/kiosko/comer/para-llevar.png";
import styles from "./OrderTypeScreen.module.css";

const OrderTypeScreen = ({ onSelect }) => {
  const { t } = useLang();
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t.orderType.title}</h2>

      <div className={styles.options}>
        <button className={styles.option} onClick={() => onSelect("here")}>
          <img src={comerAquiImg} alt={t.orderType.here} className={styles.optionImg} />
          <span className={styles.optionLabel}>{t.orderType.here}</span>
        </button>

        <button className={styles.option} onClick={() => onSelect("takeaway")}>
          <img src={paraLlevarImg} alt={t.orderType.takeaway} className={styles.optionImg} />
          <span className={styles.optionLabel}>{t.orderType.takeaway}</span>
        </button>
      </div>
    </div>
  );
};

export default OrderTypeScreen;
