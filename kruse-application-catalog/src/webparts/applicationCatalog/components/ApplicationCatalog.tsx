import * as React from 'react';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Icon } from '@fluentui/react/lib/Icon';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import type { IApplicationCatalogProps } from './IApplicationCatalogProps';
import { IProject, IFilterState, IFilterOptions, ProjectCategory, ProjectStatus, OperatingCompany, Workstream, ServiceType, SortField } from '../models/IProject';
import { IProjectService } from '../services/IProjectService';
import { createProjectService } from '../services/ProjectServiceFactory';
import { filterProjects, sortProjects } from '../utils/filterUtils';
import ProjectCard from './ProjectCard';
import ProjectDetailPanel from './ProjectDetailPanel';
import styles from './ApplicationCatalog.module.scss';

initializeIcons();

// Load Montserrat font dynamically (SPFx CSS loader doesn't support @import)
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap';
fontLink.rel = 'stylesheet';
if (!document.querySelector(`link[href="${fontLink.href}"]`)) {
  document.head.appendChild(fontLink);
}

interface IApplicationCatalogState {
  allProjects: IProject[];
  displayedProjects: IProject[];
  filterOptions: IFilterOptions;
  filters: IFilterState;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  selectedProject: IProject | null;
  isPanelOpen: boolean;
  isLoading: boolean;
}

const emptyFilters: IFilterState = {
  searchQuery: '',
  categories: [],
  workstreams: [],
  statuses: [],
  topics: [],
  operatingCompanies: [],
  serviceTypes: [],
  stakeholders: [],
};

export default class ApplicationCatalog extends React.Component<IApplicationCatalogProps, IApplicationCatalogState> {
  private _service: IProjectService;

  constructor(props: IApplicationCatalogProps) {
    super(props);
    this._service = createProjectService();
    this.state = {
      allProjects: [],
      displayedProjects: [],
      filterOptions: { categories: [], workstreams: [], statuses: [], topics: [], operatingCompanies: [], serviceTypes: [], stakeholders: [] },
      filters: { ...emptyFilters },
      sortField: 'name',
      sortDirection: 'asc',
      selectedProject: null,
      isPanelOpen: false,
      isLoading: true,
    };
  }

  public async componentDidMount(): Promise<void> {
    const [projects, filterOptions] = await Promise.all([
      this._service.getProjects(),
      this._service.getFilterOptions(),
    ]);
    const sorted = sortProjects(projects, 'name', 'asc');
    this.setState({
      allProjects: projects,
      displayedProjects: sorted,
      filterOptions,
      isLoading: false,
    });
  }

  private _applyFilters(filters: IFilterState, sortField?: SortField, sortDirection?: 'asc' | 'desc'): void {
    const field = sortField || this.state.sortField;
    const dir = sortDirection || this.state.sortDirection;
    const filtered = filterProjects(this.state.allProjects, filters);
    const sorted = sortProjects(filtered, field, dir);
    this.setState({
      filters,
      displayedProjects: sorted,
      sortField: field,
      sortDirection: dir,
    });
  }

  private _onSearchChange = (_: unknown, newValue?: string): void => {
    const newFilters: IFilterState = { ...this.state.filters, searchQuery: newValue || '' };
    this._applyFilters(newFilters);
  };

  private _onCategoryChange = (_: unknown, option?: IDropdownOption): void => {
    if (!option) return;
    const prev = this.state.filters.categories;
    const categories = option.selected
      ? prev.concat([option.key as ProjectCategory])
      : prev.filter((c: ProjectCategory) => c !== option.key);
    this._applyFilters({ ...this.state.filters, categories });
  };

  private _onStatusChange = (_: unknown, option?: IDropdownOption): void => {
    if (!option) return;
    const prev = this.state.filters.statuses;
    const statuses = option.selected
      ? prev.concat([option.key as ProjectStatus])
      : prev.filter((s: ProjectStatus) => s !== option.key);
    this._applyFilters({ ...this.state.filters, statuses });
  };

  private _onTopicChange = (_: unknown, option?: IDropdownOption): void => {
    if (!option) return;
    const prev = this.state.filters.topics;
    const topics = option.selected
      ? prev.concat([option.key as string])
      : prev.filter((t: string) => t !== option.key);
    this._applyFilters({ ...this.state.filters, topics });
  };

  private _onOpCoChange = (_: unknown, option?: IDropdownOption): void => {
    if (!option) return;
    const prev = this.state.filters.operatingCompanies;
    const operatingCompanies = option.selected
      ? prev.concat([option.key as OperatingCompany])
      : prev.filter((o: OperatingCompany) => o !== option.key);
    this._applyFilters({ ...this.state.filters, operatingCompanies });
  };

  private _onWorkstreamChange = (_: unknown, option?: IDropdownOption): void => {
    if (!option) return;
    const prev = this.state.filters.workstreams;
    const workstreams = option.selected
      ? prev.concat([option.key as Workstream])
      : prev.filter((w: Workstream) => w !== option.key);
    this._applyFilters({ ...this.state.filters, workstreams });
  };

  private _onServiceTypeChange = (_: unknown, option?: IDropdownOption): void => {
    if (!option) return;
    const prev = this.state.filters.serviceTypes;
    const serviceTypes = option.selected
      ? prev.concat([option.key as ServiceType])
      : prev.filter((s: ServiceType) => s !== option.key);
    this._applyFilters({ ...this.state.filters, serviceTypes });
  };

  private _onStakeholderChange = (_: unknown, option?: IDropdownOption): void => {
    if (!option) return;
    const prev = this.state.filters.stakeholders;
    const stakeholders = option.selected
      ? prev.concat([option.key as string])
      : prev.filter((s: string) => s !== option.key);
    this._applyFilters({ ...this.state.filters, stakeholders });
  };

  private _onSortChange = (_: unknown, option?: IDropdownOption): void => {
    if (!option) return;
    this._applyFilters(this.state.filters, option.key as SortField);
  };

  private _clearFilters = (): void => {
    this._applyFilters({ ...emptyFilters });
  };

  private _onCardClick = (project: IProject): void => {
    this.setState({ selectedProject: project, isPanelOpen: true });
  };

  private _onPanelDismiss = (): void => {
    this.setState({ isPanelOpen: false });
  };

  private _onNavigateToProject = (project: IProject): void => {
    this.setState({ selectedProject: project });
  };

  private _removeFilter = (type: string, value: string): void => {
    const filters: IFilterState = { ...this.state.filters };
    switch (type) {
      case 'category':
        filters.categories = filters.categories.filter((c: string) => c !== value);
        break;
      case 'status':
        filters.statuses = filters.statuses.filter((s: string) => s !== value);
        break;
      case 'topic':
        filters.topics = filters.topics.filter((t: string) => t !== value);
        break;
      case 'opco':
        filters.operatingCompanies = filters.operatingCompanies.filter((o: string) => o !== value);
        break;
      case 'workstream':
        filters.workstreams = filters.workstreams.filter((w: string) => w !== value);
        break;
      case 'serviceType':
        filters.serviceTypes = filters.serviceTypes.filter((s: string) => s !== value);
        break;
      case 'stakeholder':
        filters.stakeholders = filters.stakeholders.filter((s: string) => s !== value);
        break;
    }
    this._applyFilters(filters);
  };

  private _hasActiveFilters(): boolean {
    const { filters } = this.state;
    return filters.categories.length > 0 ||
      filters.workstreams.length > 0 ||
      filters.statuses.length > 0 ||
      filters.topics.length > 0 ||
      filters.operatingCompanies.length > 0 ||
      filters.serviceTypes.length > 0 ||
      filters.stakeholders.length > 0 ||
      filters.searchQuery.length > 0;
  }

  public render(): React.ReactElement<IApplicationCatalogProps> {
    const { filterOptions, filters, sortField, selectedProject, isPanelOpen, isLoading, allProjects, displayedProjects } = this.state;

    if (isLoading) {
      return <div className={styles.applicationCatalog}><p>Loading catalog...</p></div>;
    }

    const activeCount = displayedProjects.filter((p: IProject) => p.status === 'In Development' || p.status === 'Scoping').length;
    const deployedCount = displayedProjects.filter((p: IProject) =>
      p.status === 'Done - Deployed with Maintenance' || p.status === 'Done - Deployed without Maintenance'
    ).length;

    const sortOptions: IDropdownOption[] = [
      { key: 'name', text: 'Name' },
      { key: 'workstream', text: 'Workstream' },
      { key: 'category', text: 'Category' },
      { key: 'status', text: 'Status' },
      { key: 'topic', text: 'Topic' },
    ];

    return (
      <div className={styles.applicationCatalog}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <h1 className={styles.title}>Application Catalog</h1>
            <p className={styles.subtitle}>Kruse Consulting — Solutions Built for Southern Company</p>
          </div>
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{allProjects.length}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{activeCount}</span>
              <span className={styles.statLabel}>Active</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{deployedCount}</span>
              <span className={styles.statLabel}>Deployed</span>
            </div>
          </div>

          {/* Search */}
          <div className={styles.searchRow}>
            <div className={styles.searchBox}>
              <SearchBox
                placeholder="Search projects..."
                value={filters.searchQuery}
                onChange={this._onSearchChange}
                underlined
              />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className={styles.filterBar}>
          <Dropdown
            placeholder="Workstream"
            multiSelect
            options={filterOptions.workstreams.map((w: Workstream) => ({ key: w, text: w }))}
            selectedKeys={filters.workstreams}
            onChange={this._onWorkstreamChange}
            className={styles.filterDropdown}
            styles={{ title: { borderRadius: 6 } }}
          />
          <Dropdown
            placeholder="Category"
            multiSelect
            options={filterOptions.categories.map((c: ProjectCategory) => ({ key: c, text: c }))}
            selectedKeys={filters.categories}
            onChange={this._onCategoryChange}
            className={styles.filterDropdown}
            styles={{ title: { borderRadius: 6 } }}
          />
          <Dropdown
            placeholder="Status"
            multiSelect
            options={filterOptions.statuses.map((s: ProjectStatus) => ({ key: s, text: s }))}
            selectedKeys={filters.statuses}
            onChange={this._onStatusChange}
            className={styles.filterDropdown}
            styles={{ title: { borderRadius: 6 } }}
          />
          <Dropdown
            placeholder="Topic"
            multiSelect
            options={filterOptions.topics.map((t: string) => ({ key: t, text: t }))}
            selectedKeys={filters.topics}
            onChange={this._onTopicChange}
            className={styles.filterDropdown}
            styles={{ title: { borderRadius: 6 } }}
          />
          <Dropdown
            placeholder="Operating Company"
            multiSelect
            options={filterOptions.operatingCompanies.map((o: OperatingCompany) => ({ key: o, text: o }))}
            selectedKeys={filters.operatingCompanies}
            onChange={this._onOpCoChange}
            className={styles.filterDropdown}
            styles={{ title: { borderRadius: 6 } }}
          />
          {filterOptions.stakeholders.length > 0 && (
            <Dropdown
              placeholder="Stakeholder"
              multiSelect
              options={filterOptions.stakeholders.map((s: string) => ({ key: s, text: s }))}
              selectedKeys={filters.stakeholders}
              onChange={this._onStakeholderChange}
              className={styles.filterDropdown}
              styles={{ title: { borderRadius: 6 } }}
            />
          )}
          {filterOptions.serviceTypes.length > 0 && (
            <Dropdown
              placeholder="Service Type"
              multiSelect
              options={filterOptions.serviceTypes.map((s: ServiceType) => ({ key: s, text: s }))}
              selectedKeys={filters.serviceTypes}
              onChange={this._onServiceTypeChange}
              className={styles.filterDropdown}
              styles={{ title: { borderRadius: 6 } }}
            />
          )}
        </div>

        {/* Active filter chips */}
        {this._hasActiveFilters() && (
          <div className={styles.activeFilters}>
            {filters.workstreams.map((w: Workstream) => (
              <span key={`ws-${w}`} className={styles.filterChip} onClick={() => this._removeFilter('workstream', w)}>
                {w} <span className={styles.filterChipRemove}>&times;</span>
              </span>
            ))}
            {filters.categories.map((c: ProjectCategory) => (
              <span key={`cat-${c}`} className={styles.filterChip} onClick={() => this._removeFilter('category', c)}>
                {c} <span className={styles.filterChipRemove}>&times;</span>
              </span>
            ))}
            {filters.statuses.map((s: ProjectStatus) => (
              <span key={`stat-${s}`} className={styles.filterChip} onClick={() => this._removeFilter('status', s)}>
                {s} <span className={styles.filterChipRemove}>&times;</span>
              </span>
            ))}
            {filters.topics.map((t: string) => (
              <span key={`topic-${t}`} className={styles.filterChip} onClick={() => this._removeFilter('topic', t)}>
                {t} <span className={styles.filterChipRemove}>&times;</span>
              </span>
            ))}
            {filters.operatingCompanies.map((o: OperatingCompany) => (
              <span key={`opco-${o}`} className={styles.filterChip} onClick={() => this._removeFilter('opco', o)}>
                {o} <span className={styles.filterChipRemove}>&times;</span>
              </span>
            ))}
            {filters.serviceTypes.map((s: ServiceType) => (
              <span key={`st-${s}`} className={styles.filterChip} onClick={() => this._removeFilter('serviceType', s)}>
                {s} <span className={styles.filterChipRemove}>&times;</span>
              </span>
            ))}
            {filters.stakeholders.map((s: string) => (
              <span key={`sh-${s}`} className={styles.filterChip} onClick={() => this._removeFilter('stakeholder', s)}>
                {s} <span className={styles.filterChipRemove}>&times;</span>
              </span>
            ))}
            <button className={styles.clearFilters} onClick={this._clearFilters}>
              Clear all
            </button>
          </div>
        )}

        {/* View Controls */}
        <div className={styles.viewControls}>
          <span className={styles.resultCount}>
            Showing <span className={styles.resultCountBold}>{displayedProjects.length}</span> of{' '}
            <span className={styles.resultCountBold}>{allProjects.length}</span> projects
          </span>
          <div className={styles.sortControl}>
            <span>Sort by:</span>
            <Dropdown
              options={sortOptions}
              selectedKey={sortField}
              onChange={this._onSortChange}
              styles={{ root: { minWidth: 120 }, title: { borderRadius: 6 } }}
            />
          </div>
        </div>

        {/* Project Grid */}
        <div className={styles.projectGrid}>
          {displayedProjects.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <Icon iconName="SearchIssue" style={{ fontSize: 48 }} />
              </div>
              <h3 className={styles.emptyStateTitle}>No projects found</h3>
              <p className={styles.emptyStateText}>
                Try adjusting your filters or search query.
              </p>
            </div>
          ) : (
            displayedProjects.map((project: IProject, index: number) => (
              <ProjectCard
                key={`${project.kruseId}-${index}`}
                project={project}
                onClick={this._onCardClick}
              />
            ))
          )}
        </div>

        {/* Detail Panel */}
        <ProjectDetailPanel
          project={selectedProject}
          allProjects={allProjects}
          isOpen={isPanelOpen}
          onDismiss={this._onPanelDismiss}
          onNavigateToProject={this._onNavigateToProject}
        />
      </div>
    );
  }
}
