'use server';

import { Paginated, StudyType, StudyInfo, StudyInfoDTO, UserCardDTO } from '@/types/schemes';
import { Category } from '@/types/Category';
import { toStudyInfo, toUserCard } from '@/utils/converter';

export const getLearningCards = async (studyType: StudyType, category: Category) => {
  const res = await fetch(`/api/study/cards?studyType=${studyType}&category=${category}`);
  const data = (await res.json()) as Paginated<UserCardDTO>;
  const convertedData = data.content.map((card) => toUserCard(card));
  return { ...data, content: convertedData };
};

export const postStudyInfo = async (userCardId: number, studyInfo: StudyInfo) => {
  const res = await fetch(`/api/study/${userCardId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studyInfo),
  });
  const data = (await res.json()) as StudyInfoDTO;
  return toStudyInfo(data);
};
