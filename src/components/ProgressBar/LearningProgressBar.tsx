import ProgressBar from './ProgressBar';

import styles from './LearningProgressBar.module.scss';

import { ProgressBarSegment } from '@/types/ProgressBarSegment';
import { LEARNING_PROGRESS_BAR_COLORS } from '@/constants/colors';
import { StateCounts } from '@/types/study';

const LearningProgressBar = ({ stateCounts }: { stateCounts: StateCounts; className: string }) => {
  const progressBarSegments: ProgressBarSegment[] = [
    {
      value: stateCounts.reviewCounts,
      label: stateCounts.reviewCounts,
      tooltip: 'Completed',
      color: LEARNING_PROGRESS_BAR_COLORS.Review
    },
    {
      value: stateCounts.overdueCounts,
      label: stateCounts.overdueCounts,
      tooltip: 'Review',
      color: LEARNING_PROGRESS_BAR_COLORS.Overdue
    },
    {
      value: stateCounts.newCounts,
      label: stateCounts.newCounts,
      tooltip: 'New',
      color: LEARNING_PROGRESS_BAR_COLORS.New
    },
    {
      value: stateCounts.learningCounts,
      label: stateCounts.learningCounts,
      tooltip: 'Learning',
      color: LEARNING_PROGRESS_BAR_COLORS.Learning
    }
  ];

  return (
    <div className={styles['container']}>
      <ProgressBar progressBarSegments={progressBarSegments} height={15} />
    </div>
  );
};

export default LearningProgressBar;
