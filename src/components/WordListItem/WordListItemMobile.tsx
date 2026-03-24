'use client';

import React, { useEffect, useState } from 'react';
import { WordListItemProps } from './types';
import { OutlinedCard } from '../Card/Card';
import styles from './WordListItemMobile.module.scss';
import { useRouter } from 'next/navigation';

const WordListItemMobile = ({
  headword,
  translation,
  isExpanded,
  homographNumber,
  wordId
}: WordListItemProps) => {
  const [expanded, setExpanded] = useState(isExpanded || false);
  const router = useRouter();

  useEffect(() => {
    if (isExpanded !== undefined) setExpanded(isExpanded);
  }, [isExpanded]);

  const handleClick = () => {
    if (expanded) {
      router.push(`/card/${wordId}`);
    } else {
      setExpanded(true);
    }
  };

  return (
    <OutlinedCard
      className={styles.card}
      style={{ minHeight: expanded ? '104px' : '56px' }}
      onClick={handleClick}
    >
      <div className={styles['korean-word']}>
        {headword}
        <span className={styles['homograph-number']}>{homographNumber}</span>
      </div>
      {expanded && <div className={styles['foreign-word']}>{translation}</div>}
    </OutlinedCard>
  );
};

export default WordListItemMobile;
