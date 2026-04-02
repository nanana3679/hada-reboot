import { useTranslations } from 'next-intl';

import styles from './ExampleItem.module.scss';

interface ExampleItemProps {
  title: string;
  examples: string[];
}

const ExampleItem = ({ title, examples }: ExampleItemProps) => {
  const t = useTranslations();

  return (
    <div className={styles['example-item-container']}>
      <div className={styles['example-item']}>
        <span className={styles['example-item-label']}>{t(`learning.${title}`)}</span>
      </div>
      <span className={styles['example-item-list']}>
        {examples.map((example, index) => (
          <p className={styles['example-item-list-text']} key={index}>
            {example}
          </p>
        ))}
      </span>
    </div>
  );
};

export default ExampleItem;
