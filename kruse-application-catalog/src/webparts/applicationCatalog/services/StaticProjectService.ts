import { IProjectService } from './IProjectService';
import { IProject, IFilterOptions, ProjectCategory, ProjectStatus, OperatingCompany, Workstream, ServiceType } from '../models/IProject';
import { projects } from '../data/projects';

export class StaticProjectService implements IProjectService {
  private _projects: IProject[] | null = null;

  private getAll(): IProject[] {
    if (!this._projects) {
      this._projects = projects;
    }
    return this._projects;
  }

  public async getProjects(): Promise<IProject[]> {
    return this.getAll();
  }

  public async getProjectById(kruseId: string): Promise<IProject | null> {
    const all = this.getAll();
    for (let i = 0; i < all.length; i++) {
      if (all[i].kruseId === kruseId) return all[i];
    }
    return null;
  }

  public async getFilterOptions(): Promise<IFilterOptions> {
    const all = this.getAll();
    const catSet = new Set<string>();
    const wsSet = new Set<string>();
    const statusSet = new Set<string>();
    const topicSet = new Set<string>();
    const opcoSet = new Set<string>();
    const stSet = new Set<string>();
    const stakeholderSet = new Set<string>();

    all.forEach((p: IProject) => {
      catSet.add(p.category);
      wsSet.add(p.workstream);
      statusSet.add(p.status);
      if (p.topic) topicSet.add(p.topic);
      p.deployedTo.forEach((o: OperatingCompany) => opcoSet.add(o));
      p.serviceTypes.forEach((s: ServiceType) => stSet.add(s));
      p.stakeholderRepresentative.forEach((s: string) => stakeholderSet.add(s));
    });

    const categories = Array.from(catSet).sort() as ProjectCategory[];
    const workstreams = Array.from(wsSet).sort() as Workstream[];
    const statuses = Array.from(statusSet).sort() as ProjectStatus[];
    const topics = Array.from(topicSet).sort();
    const operatingCompanies = Array.from(opcoSet).sort() as OperatingCompany[];
    const serviceTypes = Array.from(stSet).sort() as ServiceType[];
    const stakeholders = Array.from(stakeholderSet).sort();

    return { categories, workstreams, statuses, topics, operatingCompanies, serviceTypes, stakeholders };
  }
}
