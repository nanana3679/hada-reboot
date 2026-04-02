'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useWindowSize } from '@/hooks/useWindowSize';
import { useRouter } from 'next/navigation';

import DeckCardDesktop from '@/components/DeckCard/DeckCard';
import DeckCardCompact from '@/components/DeckCard/DeckCardCompact';
import CustomDialog from '@/components/Dialogs/CustomDialog';

import styles from './DeckListPage.module.scss';
import { Deck } from '@/types/schemes';
import { getCategoryKey } from '@/constants/categoryKeys';

export default function DeckListPage({
  decks,
  displayOrder
}: {
  decks: Deck[];
  displayOrder: string[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const { width } = useWindowSize();
  const isCompact = width < 1200;

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const buttonLabels = useMemo(
    () => ({
      viewWords: t('viewWords'),
      learn: t('learn')
    }),
    [t]
  );

  const handleLearn = (deck: Deck) => {
    router.push(`/${locale}/learning/${getCategoryKey(deck.category)}`);
  };

  const handleViewWords = (deck: Deck) => {
    router.push(`/${locale}/decks/${getCategoryKey(deck.category)}`);
  };

  const DeckCard = isCompact ? DeckCardCompact : DeckCardDesktop;

  const sortedDecks = useMemo(() => {
    return decks.sort(
      (a, b) => displayOrder.indexOf(a.category) - displayOrder.indexOf(b.category)
    );
  }, [decks, displayOrder]);

  const getTitle = (category: string) => `category.${getCategoryKey(category)}`;

  return (
    <>
      <div className={styles['page']}>
        <div className={styles['content']}>
          {!isCompact && (
            <h1 className={styles.title}>
              {t('decks.title')}
            </h1>
          )}
          <div className={styles.cards}>
            {sortedDecks.map((deck) => (
              <DeckCard
                key={deck.category}
                deck={deck}
                title={t(getTitle(deck.category))}
                isCompleted={false} // TODO
                locale={locale}
                buttonLabels={buttonLabels}
                onLearn={() => handleLearn(deck)}
                onViewWords={() => handleViewWords(deck)}
              />
            ))}
          </div>
        </div>
      </div>
      <CustomDialog
        open={isDialogOpen}
        headline={t('goalComplete')}
        prompt={
          <>
            {t('continuePrompt')}
            <br />
            {t('chooseOption')}
          </>
        }
        firstButtonString={t('learnMore')}
        secondButtonString={t('reviewMore')}
        onCancel={() => setIsDialogOpen(false)}
      />
    </>
  );
}
