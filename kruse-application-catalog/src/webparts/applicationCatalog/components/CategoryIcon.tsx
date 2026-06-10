import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { ProjectCategory } from '../models/IProject';
import { categoryConfig } from '../styles/theme';
import styles from './ApplicationCatalog.module.scss';

export interface ICategoryIconProps {
  category: ProjectCategory;
  size?: 'small' | 'large';
}

const CategoryIcon: React.FC<ICategoryIconProps> = ({ category, size = 'small' }) => {
  const config = categoryConfig[category] || { color: '#64748b', icon: 'More' };
  const iconSize = size === 'large' ? 18 : 14;

  return (
    <span
      className={styles.cardCategoryIcon}
      style={{
        backgroundColor: config.color + '15',
        color: config.color,
        width: size === 'large' ? 36 : 28,
        height: size === 'large' ? 36 : 28,
        fontSize: iconSize,
      }}
    >
      <Icon iconName={config.icon} />
    </span>
  );
};

export default CategoryIcon;
