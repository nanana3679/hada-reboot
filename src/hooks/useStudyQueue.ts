import { Category } from '@/types/Category';
import { getLearningCards, postStudyInfo } from '@/api/study';
import { StudyService } from '@/lib/StudyService';
import { Rating } from 'ts-fsrs';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export const useStudyQueue = (category: Category) => {
  const [error, setError] = useState<Error | null>(null);

  const { data: studyService, isPending: isLoading } = useQuery({
    queryKey: ['studyService', category],
    queryFn: async () => {
      const newCards = await getLearningCards('new', category);
      const reviewCards = await getLearningCards('review', category);
      return new StudyService([...newCards.content, ...reviewCards.content]);
    }
  });

  const [, forceUpdate] = useState(0);

  const withStudyService = <T>(
    studyService: StudyService | undefined,
    callback: (service: StudyService) => T
  ): T => {
    if (!studyService) {
      throw new Error('Study service not found');
    }
    return callback(studyService);
  };

  const repeatMutation = useMutation({
    mutationFn: async ({ rating }: { rating: Rating }) => {
      return withStudyService(studyService, async (service) => {
        const newCard = service.repeat(rating);
        forceUpdate((n) => n + 1);
        const result = await postStudyInfo(newCard.userCardId, newCard.word.wordId, newCard.fsrs);
        // New 카드 INSERT 후 userCardId 갱신
        if (newCard.userCardId === null && result.userCardId) {
          service.updateUserCardId(newCard.word.wordId, result.userCardId);
        }
        return result;
      });
    },
    onError: (error) => {
      withStudyService(studyService, (service) => {
        service.revert();
        forceUpdate((n) => n + 1);
        setError(error);
      });
    }
  });

  const repeat = async (rating: Rating) => {
    await repeatMutation.mutateAsync({ rating });
  };

  const currentCardDetail = studyService?.hasCards ? studyService.currentCard : null;

  const StateCounts = studyService?.StateCounts ?? {
    reviewCounts: 0,
    learningCounts: 0,
    overdueCounts: 0,
    newCounts: 0
  };
  const iPreview = studyService?.hasCards ? studyService.iPreview : null;
  const isCompleted = studyService?.isCompleted ?? false;

  const clearError = () => {
    setError(null);
  };

  return {
    queue: studyService?.queue ?? [],
    iPreview,
    currentCardDetail,
    isLoading,
    isCompleted,
    StateCounts,
    repeat,
    error,
    clearError
  };
};
