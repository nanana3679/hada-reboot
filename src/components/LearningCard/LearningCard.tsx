import { FilledCard } from '../Card/Card';
import { Word } from '@/types/schemes';

import styles from './LearningCard.module.scss';
import classNames from 'classnames';
import ConjugationSection from './ConjugationSection';
import ExampleSection from './ExampleSection';
import WordSection from './WordSection';
import { useWindowSize } from '@/hooks/useWindowSize';
import { IconButton, Icon } from '@/components/material-components/IconButton/IconButton';
import { Menu, MenuItem } from '@/components/material-components/Menu';
import { MdIconButton } from '@material/web/iconbutton/icon-button.js';

import { MenuItem as MenuItemType } from '@/types/Menu';
import { useTranslations } from 'next-intl';
import { motion } from 'motion/react';

/**
 * "가감한[가감한], 가감하여[가감하여](가감해[가감해]), ..."
 * → ["가감한[가감한]", "가감하여[가감하여](가감해[가감해])", ...]
 */
function parseConjugations(raw: string | null | undefined): string[] {
  if (!raw) return [];
  // 괄호/대괄호 밖의 ", "로만 분리
  const result: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of raw) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

/**
 * ["<구> 가감한 금액.\n<구> 가감한 돈.\n<문장> ..."]
 * → ["<구> 가감한 금액.", "<구> 가감한 돈.", "<문장> ..."]
 */
function parseExamples(raw: string[] | null | undefined): string[] {
  if (!raw || raw.length === 0) return [];
  return raw.flatMap((s) => s.split('\n')).filter(Boolean);
}

export interface LearningCardState {
  isRevealed: boolean;
  showDetail: boolean;
  showConjugation: boolean;
  showExample: boolean;
  isKoreanToForeign?: boolean;
}

interface LearningCardProps {
  card: Word;
  className?: string;
  cardState: LearningCardState;
  handleReveal?: () => void;
  handleShowDetail?: () => void;
  toggleConjugation: () => void;
  toggleExample: () => void;
  menuItems: MenuItemType[];
}

const LearningCard = ({
  card,
  className,
  cardState,
  handleReveal,
  toggleConjugation,
  toggleExample,
  menuItems
}: LearningCardProps) => {
  const t = useTranslations();
  const { width } = useWindowSize();
  const isCompact = width < 600;

  const handleMenuClick = (e: React.MouseEvent<MdIconButton>) => {
    e.stopPropagation();
    const menu = document.getElementById('learning-card-menu') as HTMLDialogElement;
    menu.open = !menu.open;
  };

  return (
    <motion.div layout>
      <FilledCard
        className={classNames(styles['learning-card'], className)}
        ripple={false}
        onClick={handleReveal}
      >
        {!cardState.isRevealed && (
          <div className={styles['content-container']}>
            <span className={styles['korean-word']}>
              {cardState.isKoreanToForeign ? card.headword : card.translation}
            </span>
            <span className={classNames(styles['foreign-word'], styles['revealed'])}>
              {t('learning.checkAnswer')}
            </span>
          </div>
        )}

        {cardState.isRevealed && !cardState.showDetail && (
          <div className={styles['content-container']}>
            <span className={styles['korean-word']}>
              {cardState.isKoreanToForeign ? card.headword : card.translation}
            </span>
            <span className={styles['foreign-word']}>
              {cardState.isKoreanToForeign ? card.translation : card.headword}
            </span>
          </div>
        )}

        {cardState.isRevealed && cardState.showDetail && (
          <div className={classNames(styles['content-container'], styles['detailed'])}>
            <WordSection card={card} />
            <div>
              <ConjugationSection
                conjugations={parseConjugations(card.conjugation)}
                toggleExpanded={toggleConjugation}
                isExpanded={cardState.showConjugation}
              />
              <ExampleSection
                examples={parseExamples(card.examples)}
                toggleExpanded={toggleExample}
                isExpanded={cardState.showExample}
              />
            </div>
          </div>
        )}
        {!isCompact && (
          <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 1000 }}>
            <div style={{ position: 'relative', zIndex: 1000 }}>
              <IconButton id="learning-card-menu-button" onClick={handleMenuClick}>
                <Icon>more_vert</Icon>
              </IconButton>
              <Menu
                id="learning-card-menu"
                anchor="learning-card-menu-button"
                anchorCorner="end-start"
                xOffset={-160}
                yOffset={4}
                style={{ minWidth: '200px' }}
              >
                {menuItems.map((item) => (
                  <MenuItem
                    key={item.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick();
                    }}
                  >
                    {item.label}
                  </MenuItem>
                ))}
              </Menu>
            </div>
          </div>
        )}
      </FilledCard>
    </motion.div>
  );
};

export default LearningCard;
