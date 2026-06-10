import { IProject, IFilterOptions } from '../models/IProject';

export interface IProjectService {
  getProjects(): Promise<IProject[]>;
  getProjectById(kruseId: string): Promise<IProject | null>;
  getFilterOptions(): Promise<IFilterOptions>;
}
