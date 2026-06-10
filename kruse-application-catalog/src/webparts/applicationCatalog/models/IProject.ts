export type ProjectCategory =
  | 'AMI'
  | 'AMI Contract'
  | 'EPRI'
  | 'Economic and Community Development'
  | 'Enterprise Data Customer Analytics'
  | 'GPC Finance'
  | 'Generation Analytics'
  | 'Other'
  | 'PD APIs, Mktg Collateral, and Other'
  | 'PD Engineering Services'
  | 'PD Grid Transformation Analytics'
  | 'PD Operations Analytics'
  | 'PD Technology'
  | 'Reliability'
  | "Shane's Request"
  | 'Southern Company Research and Development'
  | 'Transmission Analytics';

export type Workstream =
  | 'Grid Transformation'
  | 'Transmission'
  | 'AMI'
  | 'Distribution'
  | 'Operations'
  | 'Reliability'
  | 'Corporate & Engineering Services'
  | 'Finance'
  | 'EPRI'
  | 'Other';

export type ServiceType =
  | 'Data Architecture'
  | 'Data Engineering'
  | 'Data Automation'
  | 'Analytics & Modeling'
  | 'ETL & Data Visualization'
  | 'Application Development'
  | 'ML & Data Science'
  | 'GenAI Development'
  | 'UX/UI Development'
  | 'Product Strategy'
  | 'Strategic Communications'
  | 'Upskilling & Project Management'
  | 'Analytics Roadmapping'
  | 'Low Code App Development'
  | 'Back-End Software Development'
  | 'Front-End Software Development';

export type ProjectStatus =
  | 'In Development'
  | 'Scoping'
  | 'Done - Deployed without Maintenance'
  | 'Done - Deployed with Maintenance'
  | 'Request Received'
  | 'Paused'
  | 'Removed';

export type OperatingCompany = 'APC' | 'GPC' | 'MPC' | 'SCS' | 'EPRI';

export interface IProjectLinks {
  parent: string | null;
  child: string | null;
  simplified: string | null;
}

export interface IProject {
  kruseId: string;
  category: ProjectCategory;
  workstream: Workstream;
  parentProjectName: string;
  simplifiedName: string;
  topic: string;
  status: ProjectStatus;
  description: string;
  links: IProjectLinks;
  deployedTo: OperatingCompany[];
  stakeholderDept: string;
  stakeholderRepresentative: string[];
  startDate: string | null;
  endDate: string | null;
  originatingOpCo: OperatingCompany | null;
  childProjectIds: string[];
  parentProjectId: string | null;
  serviceTypes: ServiceType[];
  projectManager: string | null;
  valueStatement: string | null;
  audience: string | null;
  productOverview: string | null;
  thumbnail: string | null;
  socoSponsor: string | null;
  completionPercentage: number | null;
  removalReason: string | null;
  teamSize: number | null;
}

export interface IFilterState {
  searchQuery: string;
  categories: ProjectCategory[];
  workstreams: Workstream[];
  statuses: ProjectStatus[];
  topics: string[];
  operatingCompanies: OperatingCompany[];
  serviceTypes: ServiceType[];
  stakeholders: string[];
}

export interface IFilterOptions {
  categories: ProjectCategory[];
  workstreams: Workstream[];
  statuses: ProjectStatus[];
  topics: string[];
  operatingCompanies: OperatingCompany[];
  serviceTypes: ServiceType[];
  stakeholders: string[];
}

export type SortField = 'name' | 'category' | 'workstream' | 'status' | 'topic';
export type SortDirection = 'asc' | 'desc';
