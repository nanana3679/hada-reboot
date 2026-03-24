export interface WordListItemProps {
  headword: string;
  translation: string;
  isExpanded?: boolean;
  isHideKorean?: boolean;
  isHideForeign?: boolean;
  homographNumber: number;
  wordId: number;
}
