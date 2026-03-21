'use server';

import { Locale } from '@/types/Locale';
import { Paginated, UserStudyHistory, Deck, KoreanCardWithForeignWords } from '@/types/schemes';
import { Category } from '@/types/Category';

export const getDecks = async () => {
  const res = await fetch('/api/decks');
  return (await res.json()) as Paginated<Deck>;
};

export const getCardsFromDeck = async (locale: Locale, category: Category, page: number) => {
  const res = await fetch(`/api/decks/cards?category=${category}&lang=${locale}&page=${page}&pageSize=100`);
  return (await res.json()) as Paginated<KoreanCardWithForeignWords>;
};

export const getUserStudyHistories = async () => {
  const res = await fetch('/api/user/history');
  return (await res.json()) as Paginated<UserStudyHistory>;
};
