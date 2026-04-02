import styles from './LoadingSpinner.module.scss';

export default function LoadingSpinner() {
  return (
    <div className={styles.container}>
      <md-circular-progress indeterminate />
    </div>
  );
}
