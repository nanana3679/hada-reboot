import { Word } from '@/types/schemes';

import styles from './WordSection.module.scss';

const difficultyStars: Record<string, string> = {
  easy: '★★★',
  normal: '★★',
  hard: '★',
};

interface WordSectionProps {
  card: Word;
}

const WordSection = ({ card }: WordSectionProps) => {
  const difficultyTopic = card.categories.find((t) => t in difficultyStars);
  const levelLabel = difficultyTopic ? difficultyStars[difficultyTopic] : '';

  return (
    <>
      <div className={styles['korean-container']}>
        <span className={styles['korean-word']}>{card.headword}</span>
        <span className={styles['korean-homograph-number']}>{+card.homographNumber + 1}</span>
        <div className={styles['korean-info-container']}>
          <span className={styles['korean-level']}>{levelLabel}</span>
          <div className={styles['korean-info-sub-container']}>
            {card.pronunciation && <span className={styles['pronunciation']}>{`[${card.pronunciation}]`}</span>}
            {card.origin && <span className={styles['origin']}>{card.origin}</span>}
          </div>
        </div>
      </div>
      <div className={styles['foreign-container']}>
        <span className={styles['foreign-word']}>
          {card.partOfSpeech} {card.translation}
        </span>
        <span className={styles['foreign-word-sub']}>{card.definition}</span>
      </div>
    </>
  );
};

export default WordSection;
