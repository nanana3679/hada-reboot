// app/[locale]/decks/ClientPage.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import DeckListPage from '@/components/common/DeckListPage';
import { getDecks } from '@/api/decks';
import { Deck } from '@/types/schemes';
import CustomDialog from '@/components/Dialogs/CustomDialog';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import { CATEGORY_GROUP, CategoryGroupKey } from '@/types/Category';

export default function DecksClientPage({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const filter = searchParams?.get('filter') as CategoryGroupKey | null;

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

  const filteredDecks = useMemo(() => {
    if (!decks) return undefined;
    if (!filter || !(filter in CATEGORY_GROUP)) return decks;
    const allowed = CATEGORY_GROUP[filter] as readonly string[];
    return decks.filter((d) => allowed.includes(d.category));
  }, [decks, filter]);

  const handleCookieConsent = () => {
    localStorage.setItem('cookieConsent', 'true');
    setIsCookieConsentOpen(false);
  };

  if (!filteredDecks) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <DeckListPage
        decks={filteredDecks}
        displayOrder={filteredDecks.map((d) => d.category)}
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
