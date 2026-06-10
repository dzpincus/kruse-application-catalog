/**
 * One-time script to convert the Excel master sheet into a typed TypeScript data file.
 * Run: node scripts/convert-excel.js
 */
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const VALID_OPCOS = ['APC', 'GPC', 'MPC', 'SCS', 'EPRI'];

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

const VALID_SERVICE_TYPES = [
  'Data Architecture', 'Data Engineering', 'Data Automation',
  'Analytics & Modeling', 'ETL & Data Visualization', 'Application Development',
  'ML & Data Science', 'GenAI Development', 'UX/UI Development',
  'Product Strategy', 'Strategic Communications', 'Upskilling & Project Management',
  'Analytics Roadmapping', 'Low Code App Development',
  'Back-End Software Development', 'Front-End Software Development',
];

function parseServiceTypes(raw) {
  if (!raw) return [];
  const types = String(raw).split(',').map(s => s.trim()).filter(Boolean);
  return types.filter(t => VALID_SERVICE_TYPES.indexOf(t) !== -1);
}

function parseStakeholders(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,\/&\n]|\band\b/i)
    .map(s => s.trim())
    .filter(Boolean);
}

const STATUS_MAP = {
  'done - deployed without maintenance': 'Done - Deployed without Maintenance',
  'done - deployed with maintenance': 'Done - Deployed with Maintenance',
  'in development': 'In Development',
  'scoping': 'Scoping',
  'request received': 'Request Received',
  'paused': 'Paused',
  'removed': 'Removed',
};

function normalizeStatus(raw) {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return STATUS_MAP[key] || null;
}

function parseDeployedTo(raw) {
  if (!raw) return [];
  const tokens = raw.toUpperCase().replace(/[+,&\/]/g, ' ').split(/\s+/).filter(Boolean);
  return [...new Set(tokens.filter(t => VALID_OPCOS.includes(t)))];
}

function normalizeOpCo(raw) {
  if (!raw) return null;
  const val = raw.trim().toUpperCase();
  return VALID_OPCOS.includes(val) ? val : null;
}

function extractCellText(cell) {
  const val = cell.value;
  if (!val) return null;
  if (typeof val === 'string') return val;
  // ExcelJS hyperlink objects have { text, hyperlink }
  if (typeof val === 'object') {
    if (val.hyperlink) return String(val.hyperlink);
    if (typeof val.text === 'string') return val.text;
    // Rich text objects
    if (val.text && val.text.richText) {
      return val.text.richText.map(r => r.text).join('');
    }
    if (val.richText) {
      return val.richText.map(r => r.text).join('');
    }
  }
  return String(val);
}

function normalizeLink(cell) {
  const text = extractCellText(cell);
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed || trimmed === '#N/A') return null;
  return trimmed;
}

function normalizeDate(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    if (raw.trim() === '#N/A' || raw.trim() === '') return null;
    const d = new Date(raw.trim());
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw.toISOString().split('T')[0];
  }
  return null;
}

// Detect Excel format by checking header row
function detectFormat(sheet) {
  const h3 = sheet.getRow(1).getCell(3).value;
  if (h3 && String(h3).trim() === 'Workstream') return 'full';
  return 'original';
}

function cellStr(cell) {
  const v = cell.value;
  if (!v) return null;
  if (typeof v === 'object') {
    if (typeof v.text === 'string') return v.text.trim() || null;
    if (v.richText) return v.richText.map(function(r) { return r.text; }).join('').trim() || null;
  }
  return String(v).trim() || null;
}

function parseRowOriginal(row, rowNumber, idCounts) {
  const kruseId = row.getCell(1).value;
  const category = row.getCell(3).value;
  const parentProjectName = row.getCell(4).value;
  const childProject = row.getCell(7).value;
  const simplifiedName = row.getCell(9).value;

  if (!kruseId && !category && !parentProjectName) return null;
  if (!kruseId && !category) return null;

  const status = normalizeStatus(row.getCell(12).value);
  if (!status) return null;

  const descStr = cellStr(row.getCell(14)) || '';
  const categoryStr = cellStr(row.getCell(3)) || 'Other';

  return {
    kruseId: (() => {
      let id = kruseId ? String(kruseId).trim() : `AUTO-${rowNumber}`;
      const count = idCounts.get(id) || 0;
      idCounts.set(id, count + 1);
      if (count > 0) id = `${id}-${count}`;
      return id;
    })(),
    category: categoryStr,
    workstream: CATEGORY_TO_WORKSTREAM[categoryStr] || 'Other',
    parentProjectName: cellStr(row.getCell(4)) || '',
    simplifiedName: cellStr(row.getCell(9)) || cellStr(row.getCell(4)) || '',
    topic: cellStr(row.getCell(10)) || '',
    status: status,
    description: descStr || 'No description available.',
    links: {
      parent: normalizeLink(row.getCell(15)),
      child: normalizeLink(row.getCell(16)),
      simplified: normalizeLink(row.getCell(17)),
    },
    deployedTo: parseDeployedTo(cellStr(row.getCell(18))),
    stakeholderDept: cellStr(row.getCell(19)) || '',
    stakeholderRepresentative: parseStakeholders(cellStr(row.getCell(20))),
    startDate: normalizeDate(row.getCell(21).value),
    endDate: normalizeDate(row.getCell(22).value),
    originatingOpCo: normalizeOpCo(cellStr(row.getCell(23))),
    childProjectIds: [],
    parentProjectId: null,
    serviceTypes: [],
    projectManager: cellStr(row.getCell(11)),
    valueStatement: null,
    audience: null,
    productOverview: null,
    thumbnail: null,
    socoSponsor: null,
    completionPercentage: null,
    removalReason: cellStr(row.getCell(13)),
    teamSize: null,
    _hasChildProject: !!childProject,
    _rawKruseId: kruseId,
  };
}

function parseRowFull(row, rowNumber, idCounts) {
  // FULL format columns: 1=KruseID, 2=Category, 3=Workstream, 4=ParentProject, 5=SimplifiedName,
  // 6=Topic, 7=Status, 8=Description, 9=ValueStatement, 10=Audience, 11=ProductOverview,
  // 12=ServiceTypes, 13=PM, 14=SOCOSponsor, 15=DeployedTo, 16=StakeholderDept, 17=StakeholderRep,
  // 18=OriginatingOpCo, 19=StartDate, 20=EndDate, 21=Completion%, 22=TeamSize, 23=RemovalReason,
  // 24=ParentLink, 25=ChildLink, 26=SimplifiedLink, 27=ParentProjectID, 28=ChildProjectIDs
  const kruseId = row.getCell(1).value;
  const category = cellStr(row.getCell(2));
  if (!kruseId && !category) return null;

  const status = normalizeStatus(row.getCell(7).value);
  if (!status) return null;

  const categoryStr = category || 'Other';
  const completionRaw = row.getCell(21).value;
  const teamSizeRaw = row.getCell(22).value;

  return {
    kruseId: (() => {
      let id = kruseId ? String(kruseId).trim() : `AUTO-${rowNumber}`;
      const count = idCounts.get(id) || 0;
      idCounts.set(id, count + 1);
      if (count > 0) id = `${id}-${count}`;
      return id;
    })(),
    category: categoryStr,
    workstream: cellStr(row.getCell(3)) || CATEGORY_TO_WORKSTREAM[categoryStr] || 'Other',
    parentProjectName: cellStr(row.getCell(4)) || '',
    simplifiedName: cellStr(row.getCell(5)) || cellStr(row.getCell(4)) || '',
    topic: cellStr(row.getCell(6)) || '',
    status: status,
    description: cellStr(row.getCell(8)) || 'No description available.',
    links: {
      parent: normalizeLink(row.getCell(24)),
      child: normalizeLink(row.getCell(25)),
      simplified: normalizeLink(row.getCell(26)),
    },
    deployedTo: parseDeployedTo(cellStr(row.getCell(15))),
    stakeholderDept: cellStr(row.getCell(16)) || '',
    stakeholderRepresentative: parseStakeholders(cellStr(row.getCell(17))),
    startDate: normalizeDate(row.getCell(19).value),
    endDate: normalizeDate(row.getCell(20).value),
    originatingOpCo: normalizeOpCo(cellStr(row.getCell(18))),
    childProjectIds: cellStr(row.getCell(28)) ? String(row.getCell(28).value).split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [],
    parentProjectId: cellStr(row.getCell(27)),
    serviceTypes: parseServiceTypes(row.getCell(12).value),
    projectManager: cellStr(row.getCell(13)),
    valueStatement: cellStr(row.getCell(9)),
    audience: cellStr(row.getCell(10)),
    productOverview: cellStr(row.getCell(11)),
    thumbnail: null,
    socoSponsor: cellStr(row.getCell(14)),
    completionPercentage: completionRaw ? Number(completionRaw) : null,
    removalReason: cellStr(row.getCell(23)),
    teamSize: teamSizeRaw ? Number(teamSizeRaw) : null,
    _hasChildProject: false,
    _rawKruseId: kruseId,
  };
}

async function main() {
  // Support: node scripts/convert-excel.js [path-to-xlsx]
  const defaultPath = path.resolve(__dirname, '../../project-data/Copy of master sheet.xlsx');
  const xlsxPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultPath;
  const outputPath = path.resolve(__dirname, '../src/webparts/applicationCatalog/data/projects.ts');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const sheet = workbook.worksheets[0];

  const format = detectFormat(sheet);
  console.log('Detected format:', format, '(' + path.basename(xlsxPath) + ')');

  const projects = [];
  const parentMap = new Map();
  const idCounts = new Map();
  const parseRow = format === 'full' ? parseRowFull : parseRowOriginal;

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const project = parseRow(row, rowNumber, idCounts);
    if (!project) return;

    projects.push(project);
    if (project._rawKruseId) {
      parentMap.set(String(project._rawKruseId).trim(), project);
    }
  });

  // Second pass: link children to parents (original format only — FULL format has IDs inline)
  if (format === 'original') {
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const childProjectId = row.getCell(8).value;
      const parentProjectId = row.getCell(6).value;
      if (childProjectId && parentProjectId) {
        const childId = String(childProjectId).trim();
        const parentId = String(parentProjectId).trim();
        const child = parentMap.get(childId);
        const parent = parentMap.get(parentId);
        if (child) child.parentProjectId = parentId;
        if (parent && parent.childProjectIds.indexOf(childId) === -1) {
          parent.childProjectIds.push(childId);
        }
      }
    });
  }

  // Clean internal properties
  projects.forEach(function(p) {
    delete p._hasChildProject;
    delete p._rawKruseId;
  });

  // Generate TypeScript output
  const tsContent = `// Auto-generated from Excel master sheet. Do not edit manually.
// Generated: ${new Date().toISOString().split('T')[0]}
import { IProject } from '../models/IProject';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const projects: IProject[] = ${JSON.stringify(projects, null, 2)} as any;
`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, tsContent, 'utf-8');
  console.log(`Generated ${projects.length} projects -> ${outputPath}`);
}

main().catch(console.error);
