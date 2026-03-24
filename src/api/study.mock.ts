/* eslint-disable @typescript-eslint/no-unused-vars */

import { DUMMY_STUDY_INFO, DUMMY_USER_CARDS } from '@/utils/dummyData';
import { Paginated, CardState, StudyType, CardDetail } from '@/types/schemes';
import { Category } from '@/types/Category';

export const getLearningCards = async (studyType: StudyType, query: Category) => {
  return new Promise<Paginated<CardDetail>>((resolve) => {
    setTimeout(() => {
      const data = DUMMY_USER_CARDS;
      console.log('mockGetUserCards:', data);
      resolve(data);
    }, 500);
  });
};

export const getCardState = async (cardId: number) => {
  return new Promise<CardState>((resolve) => {
    setTimeout(() => {
      const data = DUMMY_STUDY_INFO;
      console.log('mockGetCardCardState:', data);
      resolve(data);
    }, 500);
  });
};

export const postCardState = async (cardId: number, userCardId: number, cardState: CardState) => {
  return new Promise<CardState>((resolve) => {
    setTimeout(() => {
      const data = DUMMY_STUDY_INFO;
      console.log('mockPostCardState:', data);
      resolve(data);
    }, 500);
  });
};
