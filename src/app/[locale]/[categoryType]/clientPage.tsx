// app/[locale]/difficulty/ClientPage.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import DeckListPage from '@/components/common/DeckListPage';
import { getDecks } from '@/api/decks';
import { Category } from '@/types/Category';
import { Deck } from '@/types/schemes';
import CustomDialog from '@/components/Dialogs/CustomDialog';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import { useParams } from 'next/navigation';

export default function CategoryTypeClientPage({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useTranslations();
  const params = useParams();
  const [decks, setDecks] = useState<Deck[]>();
  const [isCookieConsentOpen, setIsCookieConsentOpen] = useState(false);

  useEffect(() => {
    const fetchUserCards = async () => {
      const fetchedDecks = await getDecks();
      if (fetchedDecks) {
        setDecks(fetchedDecks.content);
      }
    };
    fetchUserCards();

    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent && isLoggedIn) {
      setIsCookieConsentOpen(true);
    }
  }, [isLoggedIn]);

  const handleCookieConsent = () => {
    localStorage.setItem('cookieConsent', 'true');
    setIsCookieConsentOpen(false);
  };

  if (!decks) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <DeckListPage
        decks={decks}
        displayOrder={decks.map((d) => d.category)}
      />
      <CustomDialog
        open={isCookieConsentOpen}
        headline={t('cookies')}
        prompt={t('cookieConsent')}
        firstButtonString="OK"
        firstButtonOnclick={handleCookieConsent}
      />
    </>
  );
}
