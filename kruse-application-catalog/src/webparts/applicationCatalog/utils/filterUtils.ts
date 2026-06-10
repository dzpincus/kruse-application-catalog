import { IProject, IFilterState } from '../models/IProject';

function arrayIncludes<T>(arr: T[], val: T): boolean {
  return arr.indexOf(val) !== -1;
}

export function filterProjects(projects: IProject[], filters: IFilterState): IProject[] {
  return projects.filter((project: IProject) => {
    // Text search
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchable = [
        project.simplifiedName,
        project.parentProjectName,
        project.description,
        project.topic,
        project.kruseId,
        project.workstream,
        project.projectManager || '',
        project.valueStatement || '',
        project.stakeholderRepresentative.join(' '),
      ].join(' ').toLowerCase();
      if (searchable.indexOf(query) === -1) return false;
    }

    // Category filter (OR within)
    if (filters.categories.length > 0) {
      if (!arrayIncludes(filters.categories, project.category)) return false;
    }

    // Workstream filter (OR within)
    if (filters.workstreams.length > 0) {
      if (!arrayIncludes(filters.workstreams, project.workstream)) return false;
    }

    // Status filter (OR within)
    if (filters.statuses.length > 0) {
      if (!arrayIncludes(filters.statuses, project.status)) return false;
    }

    // Topic filter (OR within)
    if (filters.topics.length > 0) {
      if (!arrayIncludes(filters.topics, project.topic)) return false;
    }

    // Operating company filter (OR within — match if any of project's OpCos is selected)
    if (filters.operatingCompanies.length > 0) {
      let hasMatch = false;
      for (let i = 0; i < project.deployedTo.length; i++) {
        if (arrayIncludes(filters.operatingCompanies, project.deployedTo[i])) {
          hasMatch = true;
          break;
        }
      }
      if (!hasMatch) return false;
    }

    // Service type filter (OR within — match if project has ANY selected type)
    if (filters.serviceTypes.length > 0) {
      let hasMatch = false;
      for (let i = 0; i < project.serviceTypes.length; i++) {
        if (arrayIncludes(filters.serviceTypes, project.serviceTypes[i])) {
          hasMatch = true;
          break;
        }
      }
      if (!hasMatch) return false;
    }

    // Stakeholder filter (OR within — match if any of project's stakeholders is selected)
    if (filters.stakeholders.length > 0) {
      let hasMatch = false;
      for (let i = 0; i < project.stakeholderRepresentative.length; i++) {
        if (arrayIncludes(filters.stakeholders, project.stakeholderRepresentative[i])) {
          hasMatch = true;
          break;
        }
      }
      if (!hasMatch) return false;
    }

    return true;
  });
}

export function sortProjects(
  projects: IProject[],
  field: string,
  direction: 'asc' | 'desc'
): IProject[] {
  const sorted = projects.slice().sort((a: IProject, b: IProject) => {
    let valA: string;
    let valB: string;

    switch (field) {
      case 'name':
        valA = a.simplifiedName.toLowerCase();
        valB = b.simplifiedName.toLowerCase();
        break;
      case 'category':
        valA = a.category.toLowerCase();
        valB = b.category.toLowerCase();
        break;
      case 'status':
        valA = a.status.toLowerCase();
        valB = b.status.toLowerCase();
        break;
      case 'topic':
        valA = (a.topic || '').toLowerCase();
        valB = (b.topic || '').toLowerCase();
        break;
      case 'workstream':
        valA = a.workstream.toLowerCase();
        valB = b.workstream.toLowerCase();
        break;
      default:
        valA = a.simplifiedName.toLowerCase();
        valB = b.simplifiedName.toLowerCase();
    }

    if (valA < valB) return -1;
    if (valA > valB) return 1;
    return 0;
  });

  return direction === 'desc' ? sorted.reverse() : sorted;
}
