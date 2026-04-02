'use client';

import LearningCard from '@/components/LearningCard/LearningCard';

import styles from './layout.module.scss';

import { useParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { getWord } from '@/api/cards';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';

export default function LearningPage() {
  const { cardId } = useParams() ?? {};

  const cardState = {
    isRevealed: true,
    showDetail: true,
    showConjugation: true,
    showExample: true,
    isKoreanToForeign: true
  };

  const { data: cardDetail, isLoading } = useQuery({
    queryKey: ['card', cardId],
    queryFn: () => getWord(+(cardId!))
  });

  if (isLoading || !cardDetail) return <LoadingSpinner />;

  return (
    <div className={styles['card-container']}>
      <LearningCard
        card={cardDetail}
        className={styles['learning-card']}
        cardState={cardState}
        menuItems={[]}
      />
    </div>
  );
}
