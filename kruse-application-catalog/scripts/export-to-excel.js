/**
 * Export projects.ts data to a comprehensive Excel workbook.
 * Generates a team-editable file with all fields, data validation, and lookup sheets.
 * Run: node scripts/export-to-excel.js
 */
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const WORKSTREAMS = [
  'Grid Transformation', 'Transmission', 'AMI', 'Distribution',
  'Operations', 'Reliability', 'Corporate & Engineering Services',
  'Finance', 'EPRI', 'Other',
];

const SERVICE_TYPES = [
  'Data Architecture', 'Data Engineering', 'Data Automation',
  'Analytics & Modeling', 'ETL & Data Visualization', 'Application Development',
  'ML & Data Science', 'GenAI Development', 'UX/UI Development',
  'Product Strategy', 'Strategic Communications', 'Upskilling & Project Management',
  'Analytics Roadmapping', 'Low Code App Development',
  'Back-End Software Development', 'Front-End Software Development',
];

const STATUSES = [
  'In Development', 'Scoping', 'Done - Deployed without Maintenance',
  'Done - Deployed with Maintenance', 'Request Received', 'Paused', 'Removed',
];

const OPCOS = ['APC', 'GPC', 'MPC', 'SCS', 'EPRI'];

const CATEGORY_TO_WORKSTREAM = {
  'AMI': 'AMI',
  'AMI Contract': 'AMI',
  'Transmission Analytics': 'Transmission',
  'PD Grid Transformation Analytics': 'Grid Transformation',
  'PD Operations Analytics': 'Operations',
  'Reliability': 'Reliability',
  'PD Engineering Services': 'Distribution',
  'PD Technology': 'Grid Transformation',
  'Enterprise Data Customer Analytics': 'Corporate & Engineering Services',
  'Economic and Community Development': 'Corporate & Engineering Services',
  'GPC Finance': 'Finance',
  'PD APIs, Mktg Collateral, and Other': 'Corporate & Engineering Services',
  'Generation Analytics': 'Operations',
  "Shane's Request": 'Corporate & Engineering Services',
  'Southern Company Research and Development': 'Corporate & Engineering Services',
  'EPRI': 'EPRI',
  'Other': 'Other',
};

function loadProjects() {
  const tsPath = path.resolve(__dirname, '../src/webparts/applicationCatalog/data/projects.ts');
  const content = fs.readFileSync(tsPath, 'utf-8');
  // Find the JSON array between "= [" and the final "]"
  const startIdx = content.indexOf('= [');
  if (startIdx === -1) throw new Error('Could not find projects array in projects.ts');
  const jsonStr = content.substring(startIdx + 2).replace(/\]\s*as\s+any[\s\S]*$/, ']');
  return JSON.parse(jsonStr);
}

async function main() {
  const projects = loadProjects();
  const outputPath = path.resolve(__dirname, '../../project-data/application-catalog-FULL.xlsx');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Kruse Application Catalog';
  workbook.created = new Date();

  // =========================================================================
  // Sheet 1: Projects
  // =========================================================================
  const sheet = workbook.addWorksheet('Projects', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  const columns = [
    { header: 'Kruse ID', key: 'kruseId', width: 14 },
    { header: 'Category', key: 'category', width: 30 },
    { header: 'Workstream', key: 'workstream', width: 28 },
    { header: 'Parent Project', key: 'parentProjectName', width: 35 },
    { header: 'Simplified Name', key: 'simplifiedName', width: 35 },
    { header: 'Topic', key: 'topic', width: 20 },
    { header: 'Status', key: 'status', width: 32 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Value Statement', key: 'valueStatement', width: 50 },
    { header: 'Audience', key: 'audience', width: 35 },
    { header: 'Product Overview', key: 'productOverview', width: 50 },
    { header: 'Service Types', key: 'serviceTypes', width: 40 },
    { header: 'Project Manager', key: 'projectManager', width: 20 },
    { header: 'SOCO Sponsor', key: 'socoSponsor', width: 20 },
    { header: 'Deployed To', key: 'deployedTo', width: 18 },
    { header: 'Stakeholder Dept', key: 'stakeholderDept', width: 25 },
    { header: 'Stakeholder Rep', key: 'stakeholderRepresentative', width: 22 },
    { header: 'Originating OpCo', key: 'originatingOpCo', width: 16 },
    { header: 'Start Date', key: 'startDate', width: 14 },
    { header: 'End Date', key: 'endDate', width: 14 },
    { header: 'Completion %', key: 'completionPercentage', width: 14 },
    { header: 'Team Size', key: 'teamSize', width: 12 },
    { header: 'Removal Reason', key: 'removalReason', width: 30 },
    { header: 'Parent Link', key: 'parentLink', width: 35 },
    { header: 'Child Link', key: 'childLink', width: 35 },
    { header: 'Simplified Link', key: 'simplifiedLink', width: 35 },
    { header: 'Parent Project ID', key: 'parentProjectId', width: 16 },
    { header: 'Child Project IDs', key: 'childProjectIds', width: 20 },
  ];

  sheet.columns = columns;

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A5C' } };
  headerRow.alignment = { vertical: 'middle', wrapText: true };
  headerRow.height = 30;

  // Add data rows
  projects.forEach(function(p) {
    sheet.addRow({
      kruseId: p.kruseId,
      category: p.category,
      workstream: p.workstream,
      parentProjectName: p.parentProjectName,
      simplifiedName: p.simplifiedName,
      topic: p.topic,
      status: p.status,
      description: p.description,
      valueStatement: p.valueStatement || '',
      audience: p.audience || '',
      productOverview: p.productOverview || '',
      serviceTypes: (p.serviceTypes || []).join(', '),
      projectManager: p.projectManager || '',
      socoSponsor: p.socoSponsor || '',
      deployedTo: (p.deployedTo || []).join(', '),
      stakeholderDept: p.stakeholderDept,
      stakeholderRepresentative: (p.stakeholderRepresentative || []).join(', '),
      originatingOpCo: p.originatingOpCo || '',
      startDate: p.startDate || '',
      endDate: p.endDate || '',
      completionPercentage: p.completionPercentage,
      teamSize: p.teamSize,
      removalReason: p.removalReason || '',
      parentLink: p.links ? p.links.parent || '' : '',
      childLink: p.links ? p.links.child || '' : '',
      simplifiedLink: p.links ? p.links.simplified || '' : '',
      parentProjectId: p.parentProjectId || '',
      childProjectIds: (p.childProjectIds || []).join(', '),
    });
  });

  // Add data validation dropdowns
  const dataRowCount = projects.length + 1; // +1 for header
  const statusFormula = '"' + STATUSES.join(',') + '"';
  const workstreamFormula = '"' + WORKSTREAMS.join(',') + '"';
  const opcoFormula = '"' + OPCOS.join(',') + '"';

  // Status column (G)
  for (var r = 2; r <= dataRowCount; r++) {
    sheet.getCell('G' + r).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [statusFormula],
      showErrorMessage: true,
      errorTitle: 'Invalid Status',
      error: 'Select a valid status from the dropdown.',
    };
  }

  // Workstream column (C)
  for (var r2 = 2; r2 <= dataRowCount; r2++) {
    sheet.getCell('C' + r2).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [workstreamFormula],
      showErrorMessage: true,
      errorTitle: 'Invalid Workstream',
      error: 'Select a valid workstream from the dropdown.',
    };
  }

  // Originating OpCo column (R)
  for (var r3 = 2; r3 <= dataRowCount; r3++) {
    sheet.getCell('R' + r3).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [opcoFormula],
    };
  }

  // Alternate row coloring for readability
  for (var r4 = 2; r4 <= dataRowCount; r4++) {
    if (r4 % 2 === 0) {
      var row = sheet.getRow(r4);
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFC' } };
    }
  }

  // =========================================================================
  // Sheet 2: Lookups
  // =========================================================================
  var lookups = workbook.addWorksheet('Lookups');
  lookups.columns = [
    { header: 'Workstreams', key: 'workstream', width: 35 },
    { header: 'Service Types', key: 'serviceType', width: 35 },
    { header: 'Statuses', key: 'status', width: 38 },
    { header: 'Operating Companies', key: 'opco', width: 20 },
  ];

  var headerRow2 = lookups.getRow(1);
  headerRow2.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A5C' } };

  var maxLen = Math.max(WORKSTREAMS.length, SERVICE_TYPES.length, STATUSES.length, OPCOS.length);
  for (var i = 0; i < maxLen; i++) {
    lookups.addRow({
      workstream: WORKSTREAMS[i] || '',
      serviceType: SERVICE_TYPES[i] || '',
      status: STATUSES[i] || '',
      opco: OPCOS[i] || '',
    });
  }

  // =========================================================================
  // Sheet 3: Category → Workstream Map
  // =========================================================================
  var mapSheet = workbook.addWorksheet('Category-Workstream Map');
  mapSheet.columns = [
    { header: 'Category (from Excel)', key: 'category', width: 42 },
    { header: 'Mapped Workstream', key: 'workstream', width: 35 },
    { header: 'Notes / Override', key: 'notes', width: 40 },
  ];

  var headerRow3 = mapSheet.getRow(1);
  headerRow3.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A5C' } };

  Object.keys(CATEGORY_TO_WORKSTREAM).forEach(function(cat) {
    mapSheet.addRow({
      category: cat,
      workstream: CATEGORY_TO_WORKSTREAM[cat],
      notes: '',
    });
  });

  // Add workstream dropdown validation to map sheet
  for (var r5 = 2; r5 <= Object.keys(CATEGORY_TO_WORKSTREAM).length + 1; r5++) {
    mapSheet.getCell('B' + r5).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [workstreamFormula],
    };
  }

  // Write file
  await workbook.xlsx.writeFile(outputPath);
  console.log('Exported ' + projects.length + ' projects -> ' + outputPath);
  console.log('Sheets: Projects, Lookups, Category-Workstream Map');
}

main().catch(console.error);
