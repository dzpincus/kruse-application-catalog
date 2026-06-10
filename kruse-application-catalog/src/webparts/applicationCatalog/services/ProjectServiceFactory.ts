import { IProjectService } from './IProjectService';
import { StaticProjectService } from './StaticProjectService';

export function createProjectService(): IProjectService {
  // MVP: always return static service
  // Future: check config and return ApiProjectService when SQL backend is ready
  return new StaticProjectService();
}
