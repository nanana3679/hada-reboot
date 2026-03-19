import { NextRequest, NextResponse } from 'next/server';
import { mockWords } from '@/mocks/words';
import { mockUserCards } from '@/mocks/study';
import { Difficulty } from '@/types/Category';

const LEVEL_MAP: Record<string, Difficulty> = { easy: 'easy', normal: 'normal', hard: 'hard' };

const TOPIC_MAP: Record<string, string> = {
  CONCEPT: 'CONCEPT', ECONOMY: 'ECONOMY', SCIENCE: 'SCIENCE', TRANSPORT: 'TRANSPORT',
  WEATHER: 'WEATHER', NEWS: 'NEWS', FEELING: 'FEELING', GRAMMAR_AND_LANGUAGE: 'GRAMMAR_AND_LANGUAGE',
  CULTURE: 'CULTURE', HOSPITAL: 'HOSPITAL', LIFE: 'LIFE', LIVING: 'LIVING',
  PERSONALITY: 'PERSONALITY', NUMBER: 'NUMBER', COMMUNICATION: 'COMMUNICATION', TIME: 'TIME',
  FOOD: 'FOOD', RELATIONSHIPS: 'RELATIONSHIPS', NATURE: 'NATURE', POLITICS: 'POLITICS',
  RELIGION: 'RELIGION', WORK: 'WORK', HOME: 'HOME', FASHION_AND_APPEARANCE: 'FASHION_AND_APPEARANCE',
  SCHOOL: 'SCHOOL', ACTION: 'ACTION', ADMINISTRATION: 'ADMINISTRATION',
};

// GET /api/decks?type=level|topic
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') ?? 'level';

  if (type === 'level') {
    const decks = Object.keys(LEVEL_MAP).map((level) => {
      const wordsInDeck = mockWords.filter((w) => w.level === level);
      const wordIds = new Set(wordsInDeck.map((w) => w.id));
      const userCardsInDeck = mockUserCards.filter((uc) => wordIds.has(uc.wordId));

      return {
        category: level,
        cardCounts: wordsInDeck.length,
        newCounts: userCardsInDeck.filter((uc) => uc.state === 0).length,
        learningCounts: userCardsInDeck.filter((uc) => uc.state === 1).length,
        overdueCounts: userCardsInDeck.filter((uc) => uc.state === 2 && new Date(uc.due) < new Date()).length,
        maturityCounts: userCardsInDeck.filter((uc) => uc.state === 2 && new Date(uc.due) >= new Date()).length,
      };
    });

    return NextResponse.json({ size: decks.length, pageSize: 100, page: 1, content: decks });
  }

  // type === 'topic'
  const topicCounts = new Map<string, number>();
  for (const word of mockWords) {
    for (const topic of word.topics) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  const decks = Object.keys(TOPIC_MAP)
    .filter((topic) => topicCounts.has(topic))
    .map((topic) => {
      const wordsInTopic = mockWords.filter((w) => w.topics.includes(topic));
      const wordIds = new Set(wordsInTopic.map((w) => w.id));
      const userCardsInDeck = mockUserCards.filter((uc) => wordIds.has(uc.wordId));

      return {
        category: topic,
        cardCounts: topicCounts.get(topic) ?? 0,
        newCounts: userCardsInDeck.filter((uc) => uc.state === 0).length,
        learningCounts: userCardsInDeck.filter((uc) => uc.state === 1).length,
        overdueCounts: userCardsInDeck.filter((uc) => uc.state === 2 && new Date(uc.due) < new Date()).length,
        maturityCounts: userCardsInDeck.filter((uc) => uc.state === 2 && new Date(uc.due) >= new Date()).length,
      };
    });

  return NextResponse.json({ size: decks.length, pageSize: 100, page: 1, content: decks });
}
