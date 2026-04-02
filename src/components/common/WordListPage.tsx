'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useWindowSize } from '@/hooks/useWindowSize';

import FilledButton from '@/components/material-components/FilledButton';
import { Icon, IconButton } from '@/components/material-components/IconButton/IconButton';
import { Menu, MenuItem } from '@/components/material-components/Menu';
import WordListItemDesktop from '@/components/WordListItem/WordListItemDesktop';
import WordListItemMobile from '@/components/WordListItem/WordListItemMobile';
import { WordListItem } from '@/types/schemes';
import styles from './WordListPage.module.scss';
import { isDifficulty } from '@/types/Category';
import { getCategoryKey } from '@/constants/categoryKeys';
import CircularProgress from '@/components/material-components/CircularProgress';

export default function WordListPage({
  wordList,
  category,
  onLoadMore,
  isLoading,
  hasMore
}: {
  wordList: WordListItem[];
  category: string;
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { width } = useWindowSize();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isHideKorean, setIsHideKorean] = useState(false);
  const [isHideForeign, setIsHideForeign] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'studyState' | 'alphabetical'>('default');

  const sortedWordList = useMemo(() => {
    if (sortBy === 'default') return wordList;
    const sorted = [...wordList];
    if (sortBy === 'studyState') {
      // reviewed(2) → learning/relearning(1,3) → new(null,0)
      const stateOrder = (state: number | null) => {
        if (state === 2) return 0;
        if (state === 1 || state === 3) return 1;
        return 2;
      };
      sorted.sort((a, b) => stateOrder(a.studyState) - stateOrder(b.studyState));
    } else if (sortBy === 'alphabetical') {
      sorted.sort((a, b) => a.headword.localeCompare(b.headword, 'ko'));
    }
    return sorted;
  }, [wordList, sortBy]);

  const isCompact = width < 600;
  const isLarge = width >= 1200;

  const WordListItem = !isLarge ? WordListItemMobile : WordListItemDesktop;

  const title = `category.${getCategoryKey(category)}`;

  const onLearnClick = () => {
    router.push(`/learning/${getCategoryKey(category)}`);
  };

  const toggleExpandAll = () => {
    if (!isLarge) setIsExpanded(true);
  };

  const toggleCollapseAll = () => {
    if (!isLarge) setIsExpanded(false);
  };

  const toggleHideKorean = () => {
    if (isLarge) setIsHideKorean((prev) => !prev);
  };

  const toggleHideForeign = () => {
    if (isLarge) setIsHideForeign((prev) => !prev);
  };

  const handleMenuClick = () => {
    const menu = document.getElementById('word-list-more') as HTMLDialogElement;
    menu.open = !menu.open;
  };

  const loadTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      });
    });

    if (loadTriggerRef.current) {
      observer.observe(loadTriggerRef.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore]);

  const MenuButton = () => {
    return (
      <div style={{ position: 'relative' }}>
        <IconButton onClick={handleMenuClick}>
          <Icon>more_vert</Icon>
        </IconButton>
        <Menu
          id="word-list-more"
          anchor="menu-button"
          xOffset={-160}
          yOffset={47}
          style={{ minWidth: '200px' }}
        >
          {!isLarge && <MenuItem onClick={toggleExpandAll}>{t('expandAll')}</MenuItem>}
          {!isLarge && <MenuItem onClick={toggleCollapseAll}>{t('collapseAll')}</MenuItem>}
          <MenuItem onClick={() => setSortBy('studyState')}>{t('sortByStudyState')}</MenuItem>
          <MenuItem onClick={() => setSortBy('alphabetical')}>{t('sortByAlphabetical')}</MenuItem>
          {isLarge && (
            <MenuItem onClick={toggleHideKorean}>
              {isHideKorean ? t('showKorean') : t('hideKorean')}
            </MenuItem>
          )}
          {isLarge && (
            <MenuItem onClick={toggleHideForeign}>
              {isHideForeign ? t('showForeign') : t('hideForeign')}
            </MenuItem>
          )}
        </Menu>
      </div>
    );
  };

  return (
    <div className={styles['page']}>
      <div className={styles['content']}>
        <div className={styles['header-container']}>
          <h1 className={styles.title}>{t(title)}</h1>
          <div className={styles['button-container']}>
            <FilledButton className={styles['learn-button']} onClick={onLearnClick}>
              {t('learn')}
            </FilledButton>
            <MenuButton />
          </div>
        </div>
        <div className={`${styles['list-container']} .word-list`}>
          {sortedWordList.map((word, index) => (
            <WordListItem
              key={index}
              headword={word.headword}
              translation={word.translation}
              homographNumber={+word.homographNumber + 1}
              isExpanded={!isLarge && isExpanded}
              isHideKorean={isLarge && isHideKorean}
              isHideForeign={isLarge && isHideForeign}
              wordId={word.wordId}
            />
          ))}

          {hasMore && (
            <div className={styles['load-more']} ref={loadTriggerRef}>
              {isLoading ? (
                <div className={styles['loading-spinner']}>
                  <CircularProgress indeterminate />
                </div>
              ) : (
                'Load More'
              )}
            </div>
          )}
        </div>
      </div>
      {isCompact && (
        <div className={styles['button-container-compact']}>
          <FilledButton className={styles['learn-button-compact']} onClick={onLearnClick}>
            {t('learn')}
          </FilledButton>
        </div>
      )}
    </div>
  );
}
