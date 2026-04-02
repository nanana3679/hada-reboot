import CircularProgress from '@/components/material-components/CircularProgress';
import styles from './LoadingSpinner.module.scss';

export default function LoadingSpinner() {
  return (
    <div className={styles.container}>
      <CircularProgress indeterminate />
    </div>
  );
}
