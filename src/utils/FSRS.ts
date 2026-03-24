import { Card, fsrs, generatorParameters } from 'ts-fsrs';
import { CardState } from '@/types/schemes';
import { camelizeKeys, decamelizeKeys } from 'humps';
import { IPreview } from '@/types/fsrs';

export function createFSRS() {
  const f = fsrs(generatorParameters());
  return {
    ...f,
    repeat: (card: CardState, now: Date) => {
      const snakeCaseCard = decamelizeKeys(card) as Card;
      return camelizeKeys(f.repeat(snakeCaseCard, now)) as unknown as IPreview;
    }
  };
}
