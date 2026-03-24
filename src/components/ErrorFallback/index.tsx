'use client';

import { FallbackProps } from 'react-error-boundary';
import { useRouter } from 'next/navigation';

import styles from './ErrorFallback.module.scss';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <div className={styles['icon-wrapper']}>
        <span className={`material-symbols-outlined ${styles.icon}`}>
          sentiment_dissatisfied
        </span>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>문제가 발생했어요</h1>
        <p className={styles.description}>
          잠시 후 다시 시도해 주세요
        </p>
        {error instanceof Error && error.message && error.message !== 'SETUP_REQUIRED' && (
          <p className={styles['error-detail']}>{error.message}</p>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles['retry-button']} onClick={resetErrorBoundary}>
          <span className={`material-symbols-outlined ${styles['retry-icon']}`}>
            refresh
          </span>
          다시 시도
        </button>
        <button className={styles['home-button']} onClick={() => router.push('/')}>
          홈으로
        </button>
      </div>
    </div>
  );
}
