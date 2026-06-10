import * as React from 'react';
import { ProjectStatus } from '../models/IProject';
import { statusConfig } from '../styles/theme';
import styles from './ApplicationCatalog.module.scss';

export interface IStatusBadgeProps {
  status: ProjectStatus;
}

const StatusBadge: React.FC<IStatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];
  return (
    <span
      className={styles.statusBadge}
      style={{ color: config.color, backgroundColor: config.backgroundColor }}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
