import { ProjectCategory, ProjectStatus, Workstream, ServiceType } from '../models/IProject';

// =============================================================================
// Brand Configuration
// Update these values when Kruse/Southern Company brand assets are available
// =============================================================================

export const brand = {
  primary: '#1a3a5c',       // Deep navy blue
  primaryLight: '#2d5f8a',
  primaryDark: '#0f2440',
  secondary: '#3a8fb7',     // Teal blue
  secondaryLight: '#5cb3d9',
  accent: '#e8913a',        // Warm amber accent
  background: '#f4f6f8',
  surface: '#ffffff',
  textPrimary: '#1a1a2e',
  textSecondary: '#4a5568',
  textMuted: '#8896a6',
  border: '#e2e8f0',
  borderLight: '#edf2f7',
};

export const typography = {
  fontFamily: "'Montserrat', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
  fontFamilyBody: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
  headingWeight: '600',
  bodyWeight: '400',
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
};

export const shadows = {
  card: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
  cardHover: '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05)',
  dropdown: '0 4px 12px rgba(0, 0, 0, 0.15)',
};

// =============================================================================
// Category Colors & Icons
// =============================================================================

export interface ICategoryConfig {
  color: string;
  icon: string;  // Fluent UI icon name
}

export const categoryConfig: Record<ProjectCategory, ICategoryConfig> = {
  'Transmission Analytics':               { color: '#2563eb', icon: 'LightningBolt' },
  'PD Grid Transformation Analytics':     { color: '#7c3aed', icon: 'GridViewMedium' },
  'PD Operations Analytics':              { color: '#0891b2', icon: 'Settings' },
  'EPRI':                                 { color: '#059669', icon: 'TestBeaker' },
  'AMI':                                  { color: '#d97706', icon: 'SpeedHigh' },
  'AMI Contract':                         { color: '#b45309', icon: 'Contract' },
  'PD Technology':                        { color: '#4f46e5', icon: 'Code' },
  'Enterprise Data Customer Analytics':   { color: '#dc2626', icon: 'BarChart4' },
  'Reliability':                          { color: '#0d9488', icon: 'Shield' },
  'PD Engineering Services':              { color: '#6366f1', icon: 'EngineeringGroup' },
  'Economic and Community Development':   { color: '#16a34a', icon: 'CityNext' },
  'Generation Analytics':                 { color: '#ea580c', icon: 'PowerButton' },
  'GPC Finance':                          { color: '#0284c7', icon: 'Money' },
  'Other':                                { color: '#64748b', icon: 'More' },
  "PD APIs, Mktg Collateral, and Other":  { color: '#8b5cf6', icon: 'PlugConnected' },
  "Shane's Request":                      { color: '#78716c', icon: 'Taskboard' },
  'Southern Company Research and Development': { color: '#10b981', icon: 'Rocket' },
};

// =============================================================================
// Status Colors
// =============================================================================

export interface IStatusConfig {
  color: string;
  backgroundColor: string;
  label: string;
}

export const statusConfig: Record<ProjectStatus, IStatusConfig> = {
  'Done - Deployed with Maintenance':    { color: '#166534', backgroundColor: '#dcfce7', label: 'Deployed (Maintained)' },
  'Done - Deployed without Maintenance': { color: '#115e59', backgroundColor: '#ccfbf1', label: 'Deployed' },
  'In Development':                      { color: '#1e40af', backgroundColor: '#dbeafe', label: 'In Development' },
  'Scoping':                             { color: '#92400e', backgroundColor: '#fef3c7', label: 'Scoping' },
  'Request Received':                    { color: '#475569', backgroundColor: '#f1f5f9', label: 'Request Received' },
  'Paused':                              { color: '#9a3412', backgroundColor: '#ffedd5', label: 'Paused' },
  'Removed':                             { color: '#991b1b', backgroundColor: '#fee2e2', label: 'Removed' },
};

// =============================================================================
// Workstream Colors & Icons
// =============================================================================

export interface IWorkstreamConfig {
  color: string;
  icon: string;
}

export const workstreamConfig: Record<Workstream, IWorkstreamConfig> = {
  'Grid Transformation':              { color: '#7c3aed', icon: 'GridViewMedium' },
  'Transmission':                     { color: '#2563eb', icon: 'LightningBolt' },
  'AMI':                              { color: '#d97706', icon: 'SpeedHigh' },
  'Distribution':                     { color: '#0891b2', icon: 'BranchFork2' },
  'Operations':                       { color: '#059669', icon: 'Settings' },
  'Reliability':                      { color: '#0d9488', icon: 'Shield' },
  'Corporate & Engineering Services': { color: '#6366f1', icon: 'EngineeringGroup' },
  'Finance':                          { color: '#0284c7', icon: 'Money' },
  'EPRI':                             { color: '#10b981', icon: 'TestBeaker' },
  'Other':                            { color: '#64748b', icon: 'More' },
};

// =============================================================================
// Service Type Icons
// =============================================================================

export interface IServiceTypeConfig {
  icon: string;
  color: string;
}

export const serviceTypeConfig: Record<ServiceType, IServiceTypeConfig> = {
  'Data Architecture':              { icon: 'Database', color: '#1e40af' },
  'Data Engineering':               { icon: 'DataManagementSettings', color: '#1d4ed8' },
  'Data Automation':                { icon: 'Processing', color: '#2563eb' },
  'Analytics & Modeling':           { icon: 'BarChart4', color: '#7c3aed' },
  'ETL & Data Visualization':      { icon: 'PieDouble', color: '#6366f1' },
  'Application Development':       { icon: 'AppIconDefaultList', color: '#0891b2' },
  'ML & Data Science':             { icon: 'BranchFork2', color: '#059669' },
  'GenAI Development':             { icon: 'ChatBot', color: '#10b981' },
  'UX/UI Development':             { icon: 'Design', color: '#d97706' },
  'Product Strategy':              { icon: 'Lightbulb', color: '#ea580c' },
  'Strategic Communications':      { icon: 'Megaphone', color: '#dc2626' },
  'Upskilling & Project Management': { icon: 'Education', color: '#0284c7' },
  'Analytics Roadmapping':         { icon: 'MapLayers', color: '#8b5cf6' },
  'Low Code App Development':      { icon: 'WebComponents', color: '#0d9488' },
  'Back-End Software Development': { icon: 'Code', color: '#4f46e5' },
  'Front-End Software Development': { icon: 'Globe', color: '#16a34a' },
};

// =============================================================================
// Category → Workstream Mapping
// =============================================================================

export const categoryToWorkstream: Record<ProjectCategory, Workstream> = {
  'AMI':                                       'AMI',
  'AMI Contract':                              'AMI',
  'Transmission Analytics':                    'Transmission',
  'PD Grid Transformation Analytics':          'Grid Transformation',
  'PD Operations Analytics':                   'Operations',
  'Reliability':                               'Reliability',
  'PD Engineering Services':                   'Distribution',
  'PD Technology':                             'Grid Transformation',
  'Enterprise Data Customer Analytics':        'Corporate & Engineering Services',
  'Economic and Community Development':        'Corporate & Engineering Services',
  'GPC Finance':                               'Finance',
  'PD APIs, Mktg Collateral, and Other':       'Corporate & Engineering Services',
  'Generation Analytics':                      'Operations',
  "Shane's Request":                           'Corporate & Engineering Services',
  'Southern Company Research and Development': 'Corporate & Engineering Services',
  'EPRI':                                      'EPRI',
  'Other':                                     'Other',
};
