/**
 * Generates an Excel (.xlsx) file for importing into the SharePoint "ApplicationCatalog" list.
 *
 * Usage:
 *   node scripts/export-to-sharepoint.js
 *   node scripts/export-to-sharepoint.js [path/to/projects.ts]
 *
 * Output: sharepoint-import.xlsx in the repo root
 *
 * Import method:
 *   SharePoint → New → From Excel (upload this file, map columns)
 *   OR open in Excel → copy all data rows → paste into list Grid View (Quick Edit)
 *
 * Multi-value fields (DeployedTo, ServiceTypes) use "; " separator, which SharePoint
 * Quick Edit interprets as multiple choice values.
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const defaultInput = path.resolve(__dirname, '../src/webparts/applicationCatalog/data/projects.ts');
const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultInput;
const outputPath = path.resolve(__dirname, '../sharepoint-import.xlsx');

// ---------------------------------------------------------------------------
// Parse projects.ts — extract JSON array by bracket position
// ---------------------------------------------------------------------------
function loadProjects(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const eqIdx = raw.indexOf('= [');
  const start = eqIdx !== -1 ? raw.indexOf('[', eqIdx) : raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('Could not find JSON array in ' + filePath);
  return JSON.parse(raw.slice(start, end + 1));
}

// ---------------------------------------------------------------------------
// Column definitions — maps project fields → SharePoint column names
// ---------------------------------------------------------------------------
const COLUMNS = [
  { header: 'Title',             get: p => p.simplifiedName || '' },
  { header: 'KruseID',           get: p => p.kruseId || '' },
  { header: 'Category',          get: p => p.category || '' },
  { header: 'Workstream',        get: p => p.workstream || '' },
  { header: 'ParentProjectName', get: p => p.parentProjectName || '' },
  { header: 'Topic',             get: p => p.topic || '' },
  { header: 'Status',            get: p => p.status || '' },
  { header: 'Description',       get: p => p.description || '' },
  { header: 'ValueStatement',    get: p => p.valueStatement || '' },
  { header: 'Audience',          get: p => p.audience || '' },
  { header: 'ProductOverview',   get: p => p.productOverview || '' },
  // Multi-value choice: "; " separator for SharePoint Quick Edit
  { header: 'ServiceTypes',      get: p => (p.serviceTypes || []).join('; ') },
  { header: 'ProjectManager',    get: p => p.projectManager || '' },
  { header: 'SOCOSponsor',       get: p => p.socoSponsor || '' },
  { header: 'DeployedTo',        get: p => (p.deployedTo || []).join('; ') },
  { header: 'StakeholderDept',   get: p => p.stakeholderDept || '' },
  { header: 'StakeholderRep',    get: p => (p.stakeholderRepresentative || []).join(', ') },
  { header: 'OriginatingOpCo',   get: p => p.originatingOpCo || '' },
  { header: 'StartDate',         get: p => p.startDate || '' },
  { header: 'EndDate',           get: p => p.endDate || '' },
  { header: 'CompletionPct',     get: p => p.completionPercentage != null ? p.completionPercentage : '' },
  { header: 'TeamSize',          get: p => p.teamSize != null ? p.teamSize : '' },
  { header: 'MainLink',          get: p => (p.links && p.links.simplified) || '' },
  { header: 'ParentLink',        get: p => (p.links && p.links.parent) || '' },
  { header: 'ChildLink',         get: p => (p.links && p.links.child) || '' },
  { header: 'ParentProjectId',   get: p => p.parentProjectId || '' },
  { header: 'ChildProjectIds',   get: p => (p.childProjectIds || []).join(', ') },
  { header: 'RemovalReason',     get: p => p.removalReason || '' },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Reading:', inputPath);
  const projects = loadProjects(inputPath);
  console.log('Loaded', projects.length, 'projects');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Projects');

  // Header row — bold
  sheet.columns = COLUMNS.map(col => ({
    header: col.header,
    key: col.header,
    width: Math.min(Math.max(col.header.length + 4, 16), 40),
  }));
  sheet.getRow(1).font = { bold: true };

  // Data rows
  for (const project of projects) {
    const row = {};
    for (const col of COLUMNS) {
      row[col.header] = col.get(project);
    }
    sheet.addRow(row);
  }

  await workbook.xlsx.writeFile(outputPath);
  console.log('Generated', projects.length, 'rows ->', outputPath);
  console.log('');
  console.log('Import options:');
  console.log('  A) SharePoint list → Grid view (Quick Edit) → open file in Excel → copy rows 2-241 → paste');
  console.log('  B) SharePoint → New → "From Excel" → upload this file → map columns → create list');
  console.log('');
  console.log('  Multi-value columns (DeployedTo, ServiceTypes) use "; " separator.');
  console.log('  In Quick Edit, SharePoint reads "; "-separated values as multiple choice selections.');
}

main().catch(console.error);
