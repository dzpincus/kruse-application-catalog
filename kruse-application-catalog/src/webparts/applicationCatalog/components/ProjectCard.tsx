import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { DirectionalHint } from '@fluentui/react/lib/Callout';
import { IProject } from '../models/IProject';
import { categoryConfig, workstreamConfig, serviceTypeConfig } from '../styles/theme';
import StatusBadge from './StatusBadge';
import styles from './ApplicationCatalog.module.scss';

export interface IProjectCardProps {
  project: IProject;
  onClick: (project: IProject) => void;
}

const ProjectCard: React.FC<IProjectCardProps> = ({ project, onClick }) => {
  const catConfig = categoryConfig[project.category] || { color: '#64748b' };
  const wsConfig = workstreamConfig[project.workstream] || { color: '#64748b', icon: 'More' };

  const splitName = (name: string): React.ReactNode => {
    const idx = name.indexOf(' ');
    if (idx === -1) return name;
    return <>{name.slice(0, idx)}<br />{name.slice(idx + 1)}</>;
  };

  const links: Array<{ href: string; label: string; icon: string; tooltip: string }> = [];
  if (project.links.simplified) {
    links.push({ href: project.links.simplified, label: 'Main link', icon: 'OpenInNewTab', tooltip: 'Main link' });
  }
  if (project.links.parent) {
    links.push({ href: project.links.parent, label: 'Parent link', icon: 'OpenInNewTab', tooltip: 'Parent link' });
  }
  if (project.links.child && project.links.child !== project.links.parent) {
    links.push({ href: project.links.child, label: 'Child link', icon: 'OpenInNewTab', tooltip: 'Child link' });
  }

  return (
    <div
      className={styles.projectCard}
      style={{ borderLeftColor: catConfig.color }}
      onClick={() => onClick(project)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(project); }}
    >
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{project.simplifiedName}</span>
      </div>

      <div className={styles.cardMeta}>
        <StatusBadge status={project.status} />
      </div>
      <div className={styles.cardTopic}>
        {project.topic && <span className={styles.topicPill}>{project.topic}</span>}
      </div>

      <TooltipHost content={project.workstream} calloutProps={{ gapSpace: 4, directionalHint: DirectionalHint.bottomLeftEdge }}>
        <div className={styles.workstreamBadge} style={{ color: wsConfig.color }}>
          <Icon iconName={wsConfig.icon} style={{ fontSize: 11 }} />
          <span>{project.workstream}</span>
        </div>
      </TooltipHost>

      {project.deployedTo.length > 0 && (
        <div className={styles.opcoChips}>
          {project.deployedTo.map(opco => (
            <span key={opco} className={styles.opcoChip}>{opco}</span>
          ))}
        </div>
      )}

      {project.serviceTypes.length > 0 && (
        <div className={styles.serviceTypeIcons}>
          {project.serviceTypes.slice(0, 5).map(st => {
            const stConfig = serviceTypeConfig[st] || { icon: 'Tag', color: '#64748b' };
            return (
              <TooltipHost key={st} content={st} calloutProps={{ gapSpace: 4 }}>
                <span className={styles.serviceTypeIcon} style={{ color: stConfig.color }}>
                  <Icon iconName={stConfig.icon} style={{ fontSize: 13 }} />
                </span>
              </TooltipHost>
            );
          })}
        </div>
      )}

      <p className={styles.cardDescription}>{project.description}</p>

      {links.length > 0 && (
        <div className={styles.cardLinks}>
          {links.map(link => (
            <TooltipHost key={link.label} content={link.tooltip} calloutProps={{ gapSpace: 4 }}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.cardLink}
                onClick={(e) => e.stopPropagation()}
              >
                <Icon iconName={link.icon} style={{ fontSize: 11 }} />
                <span>{link.label}</span>
              </a>
            </TooltipHost>
          ))}
        </div>
      )}

      <div className={styles.cardPeople}>
        <div className={styles.cardPeopleItem}>
          {project.stakeholderRepresentative.length > 0 && (
            <span className={styles.cardPeopleLabel}>Stakeholder</span>
          )}
          {project.stakeholderRepresentative.length > 1 ? (
            <TooltipHost
              content={project.stakeholderRepresentative.join(', ')}
              calloutProps={{ gapSpace: 4 }}
            >
              <span className={styles.cardPeopleValue} style={{ cursor: 'default' }}>
                {splitName(`${project.stakeholderRepresentative[0]} +${project.stakeholderRepresentative.length - 1}`)}
              </span>
            </TooltipHost>
          ) : project.stakeholderRepresentative.length === 1 ? (
            <TooltipHost
              content={project.stakeholderRepresentative[0]}
              calloutProps={{ gapSpace: 4 }}
            >
              <span className={styles.cardPeopleValue} style={{ cursor: 'default' }}>
                {splitName(project.stakeholderRepresentative[0])}
              </span>
            </TooltipHost>
          ) : null}
        </div>
        <div className={styles.cardPeopleItem}>
          {project.projectManager && <span className={styles.cardPeopleLabel}>PM</span>}
          {project.projectManager ? (
            <TooltipHost content={project.projectManager} calloutProps={{ gapSpace: 4 }}>
              <span className={styles.cardPeopleValue} style={{ cursor: 'default' }}>
                {splitName(project.projectManager)}
              </span>
            </TooltipHost>
          ) : null}
        </div>
      </div>


      {project.childProjectIds.length > 0 && (
        <div className={styles.childIndicator}>
          {project.childProjectIds.length} sub-project{project.childProjectIds.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default ProjectCard;
