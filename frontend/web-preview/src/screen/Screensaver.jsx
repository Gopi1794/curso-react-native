import { useLang } from "../LanguageContext";
import videoSrc from "@assets/video/Video_4.mp4";
import styles from "./Screensaver.module.css";

const requestFS = () => {
  const el = document.documentElement;
  const req =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;
  if (req) req.call(el).catch(() => {});
};

const Screensaver = ({ onDismiss }) => {
  const { t } = useLang();
  const handleDismiss = () => {
    requestFS();
    onDismiss();
  };
  return (
    <div className={styles.root} onClick={handleDismiss} onTouchStart={handleDismiss}>
      <video
        className={styles.video}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
      />
      <div className={styles.overlay}>
        <span className={styles.hint}>{t.screensaver.hint}</span>
      </div>
    </div>
  );
};

export default Screensaver;
