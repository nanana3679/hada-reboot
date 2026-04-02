'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import TextButton from '@/components/material-components/TextButton';
import { Icon } from '@/components/material-components/IconButton/IconButton';

import styles from '@/components/ErrorFallback/ErrorFallback.module.scss';

export default function NotFound() {
  const router = useRouter();
  const t = useTranslations('error');

  return (
    <div className={styles.page}>
      <div className={styles['icon-wrapper']}>
        <Icon className={styles.icon}>search_off</Icon>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>{t('notFound')}</h1>
        <p className={styles.description}>{t('notFoundDescription')}</p>
      </div>

      <div className={styles.actions}>
        <TextButton onClick={() => router.push('/')}>
          {t('home')}
        </TextButton>
      </div>
    </div>
  );
}
