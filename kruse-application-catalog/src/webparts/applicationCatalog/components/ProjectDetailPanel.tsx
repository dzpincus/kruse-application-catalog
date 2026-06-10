import * as React from 'react';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { Icon } from '@fluentui/react/lib/Icon';
import { IProject } from '../models/IProject';
import { categoryConfig, workstreamConfig, serviceTypeConfig } from '../styles/theme';
import StatusBadge from './StatusBadge';
import CategoryIcon from './CategoryIcon';
import styles from './ApplicationCatalog.module.scss';

export interface IProjectDetailPanelProps {
  project: IProject | null;
  allProjects: IProject[];
  isOpen: boolean;
  onDismiss: () => void;
  onNavigateToProject: (project: IProject) => void;
}

const ProjectDetailPanel: React.FC<IProjectDetailPanelProps> = ({
  project,
  allProjects,
  isOpen,
  onDismiss,
  onNavigateToProject,
}) => {
  if (!project) return null;

  const catConfig = categoryConfig[project.category] || { color: '#64748b' };
  const wsConfig = workstreamConfig[project.workstream] || { color: '#64748b', icon: 'More' };

  let parentProject: IProject | null = null;
  if (project.parentProjectId) {
    for (let i = 0; i < allProjects.length; i++) {
      if (allProjects[i].kruseId === project.parentProjectId) {
        parentProject = allProjects[i];
        break;
      }
    }
  }
  const childProjects = allProjects.filter((p: IProject) =>
    project.childProjectIds.indexOf(p.kruseId) !== -1
  );
  const hasLinks = project.links.parent || project.links.child || project.links.simplified;

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '--';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      type={PanelType.medium}
      isLightDismiss
      closeButtonAriaLabel="Close"
      styles={{
        main: { maxWidth: 560 },
        scrollableContent: { padding: 0 },
      }}
    >
      <div className={styles.detailPanel}>
        {/* Header */}
        <div className={styles.detailHeader}>
          <div className={styles.detailCategoryBar}>
            <CategoryIcon category={project.category} size="large" />
            <span className={styles.detailCategoryLabel} style={{ color: catConfig.color }}>
              {project.category}
            </span>
            <StatusBadge status={project.status} />
          </div>
          <h2 className={styles.detailTitle}>{project.simplifiedName}</h2>
          {project.parentProjectName !== project.simplifiedName && (
            <p className={styles.detailSubtitle}>{project.parentProjectName}</p>
          )}
          <div className={styles.detailHeaderMeta}>
            <span className={styles.detailKruseId}>{project.kruseId}</span>
            <span className={styles.detailWorkstream} style={{ color: wsConfig.color }}>
              <Icon iconName={wsConfig.icon} style={{ fontSize: 12 }} />
              {project.workstream}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className={styles.detailBody}>
          {/* Value Statement — prominent callout if present */}
          {project.valueStatement && (
            <div className={styles.valueStatement}>
              <div className={styles.valueStatementIcon}>
                <Icon iconName="Lightbulb" />
              </div>
              <p className={styles.valueStatementText}>{project.valueStatement}</p>
            </div>
          )}

          {/* Parent project link */}
          {parentProject !== null && (
            <div
              className={styles.parentProjectLink}
              onClick={() => onNavigateToProject(parentProject as IProject)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onNavigateToProject(parentProject as IProject); }}
            >
              <Icon iconName="NavigateBack" /> Part of: {parentProject.simplifiedName}
            </div>
          )}

          {/* Description */}
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionTitle}>Description</h3>
            <p className={styles.detailDescription}>{project.description}</p>
          </div>

          {/* Audience */}
          {project.audience && (
            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>Audience</h3>
              <p className={styles.detailDescription}>{project.audience}</p>
            </div>
          )}

          {/* Product Overview */}
          {project.productOverview && (
            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>Product Overview</h3>
              <p className={styles.detailDescription}>{project.productOverview}</p>
            </div>
          )}

          {/* Service Types */}
          {project.serviceTypes.length > 0 && (
            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>Service Types</h3>
              <div className={styles.serviceTypeTags}>
                {project.serviceTypes.map(st => {
                  const stConfig = serviceTypeConfig[st] || { icon: 'Tag', color: '#64748b' };
                  return (
                    <span key={st} className={styles.serviceTypeTag} style={{ borderColor: stConfig.color, color: stConfig.color }}>
                      <Icon iconName={stConfig.icon} style={{ fontSize: 12 }} />
                      {st}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completion percentage */}
          {project.completionPercentage !== null && project.completionPercentage !== undefined && (
            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>Completion — {project.completionPercentage}%</h3>
              <div className={styles.completionBar}>
                <div className={styles.completionFill} style={{ width: `${project.completionPercentage}%` }} />
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionTitle}>Details</h3>
            <div className={styles.detailMetaGrid}>
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaLabel}>Topic</span>
                <span className={styles.detailMetaValue}>{project.topic || '--'}</span>
              </div>
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaLabel}>Deployed To</span>
                <span className={styles.detailMetaValue}>
                  {project.deployedTo.length > 0 ? project.deployedTo.join(', ') : '--'}
                </span>
              </div>
              {project.projectManager && (
                <div className={styles.detailMetaItem}>
                  <span className={styles.detailMetaLabel}>Project Manager</span>
                  <span className={styles.detailMetaValue}>{project.projectManager}</span>
                </div>
              )}
              {project.socoSponsor && (
                <div className={styles.detailMetaItem}>
                  <span className={styles.detailMetaLabel}>SoCo Sponsor</span>
                  <span className={styles.detailMetaValue}>{project.socoSponsor}</span>
                </div>
              )}
              {project.teamSize !== null && project.teamSize !== undefined && (
                <div className={styles.detailMetaItem}>
                  <span className={styles.detailMetaLabel}>Team Size</span>
                  <span className={styles.detailMetaValue}>
                    {project.teamSize} member{project.teamSize !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaLabel}>Stakeholder Dept</span>
                <span className={styles.detailMetaValue}>{project.stakeholderDept || '--'}</span>
              </div>
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaLabel}>Stakeholder</span>
                <span className={styles.detailMetaValue}>
                  {project.stakeholderRepresentative.length > 0 ? project.stakeholderRepresentative.join(', ') : '--'}
                </span>
              </div>
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaLabel}>Start Date</span>
                <span className={styles.detailMetaValue}>{formatDate(project.startDate)}</span>
              </div>
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaLabel}>End Date</span>
                <span className={styles.detailMetaValue}>{formatDate(project.endDate)}</span>
              </div>
              <div className={styles.detailMetaItem}>
                <span className={styles.detailMetaLabel}>Originating OpCo</span>
                <span className={styles.detailMetaValue}>{project.originatingOpCo || '--'}</span>
              </div>
            </div>
          </div>

          {/* Links */}
          {hasLinks && (
            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>Links</h3>
              <div className={styles.detailLinks}>
                {project.links.simplified && (
                  <a
                    href={project.links.simplified}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.detailLink}
                  >
                    <Icon iconName="OpenInNewTab" /> Main link
                  </a>
                )}
                {project.links.parent && (
                  <a
                    href={project.links.parent}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.detailLink}
                  >
                    <Icon iconName="OpenInNewTab" /> Parent link
                  </a>
                )}
                {project.links.child && project.links.child !== project.links.parent && (
                  <a
                    href={project.links.child}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.detailLink}
                  >
                    <Icon iconName="OpenInNewTab" /> Child link
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Child projects */}
          {childProjects.length > 0 && (
            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>
                Sub-projects ({childProjects.length})
              </h3>
              <div className={styles.childProjectsList}>
                {childProjects.map(child => (
                  <div
                    key={child.kruseId}
                    className={styles.childProjectCard}
                    onClick={() => onNavigateToProject(child)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') onNavigateToProject(child); }}
                  >
                    <div className={styles.childProjectName}>{child.simplifiedName}</div>
                    <div style={{ marginTop: 4 }}>
                      <StatusBadge status={child.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
};

export default ProjectDetailPanel;
