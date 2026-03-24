/* eslint-disable @typescript-eslint/no-unused-vars */

import { Locale } from '@/types/Locale';
import { Word, Paginated } from '@/types/schemes';
import { DUMMY_WORD } from '@/utils/dummyData';

export const foreignSearch = async (locale: Locale, query: string) => {
  return new Promise<Paginated<Word>>((resolve) => {
    setTimeout(() => {
      const data = { size: 1, pageSize: 10, page: 1, content: [DUMMY_WORD] };
      console.log('mockForeignSearch:', data);
      resolve(data);
    }, 500);
  });
};

export const koreanSearch = async (locale: Locale, query: string) => {
  return new Promise<Paginated<Word>>((resolve) => {
    setTimeout(() => {
      const data = { size: 1, pageSize: 10, page: 1, content: [DUMMY_WORD] };
      console.log('mockKoreanSearch:', data);
      resolve(data);
    }, 500);
  });
};

export const getCard = async (cardId: number) => {
  return new Promise<Word>((resolve) => {
    setTimeout(() => {
      const data = DUMMY_WORD;
      console.log('mockGetCard:', data);
      resolve(data);
    }, 500);
  });
};

export const getCardDetail = async (cardId: number) => {
  return new Promise<Word>((resolve) => {
    setTimeout(() => {
      const data = DUMMY_WORD;
      console.log('mockGetCardDetail:', data);
      resolve(data);
    }, 500);
  });
};
