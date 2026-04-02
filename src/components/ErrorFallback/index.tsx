'use client';

import { FallbackProps } from 'react-error-boundary';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import FilledButton from '@/components/material-components/FilledButton';
import TextButton from '@/components/material-components/TextButton';
import { Icon } from '@/components/material-components/IconButton/IconButton';

import styles from './ErrorFallback.module.scss';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const router = useRouter();
  const t = useTranslations('error');

  return (
    <div className={styles.page}>
      <div className={styles['icon-wrapper']}>
        <Icon className={styles.icon}>sentiment_dissatisfied</Icon>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.description}>{t('description')}</p>
        {error instanceof Error && error.message && error.message !== 'SETUP_REQUIRED' && (
          <p className={styles['error-detail']}>{error.message}</p>
        )}
      </div>

      <div className={styles.actions}>
        <FilledButton onClick={resetErrorBoundary}>
          <Icon slot="icon">refresh</Icon>
          {t('retry')}
        </FilledButton>
        <TextButton onClick={() => router.push('/')}>
          {t('home')}
        </TextButton>
      </div>
    </div>
  );
}
