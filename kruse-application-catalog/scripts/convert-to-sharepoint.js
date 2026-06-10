/**
 * Reads the new design-session xlsx and emits SharePoint List + Power Apps artifacts:
 *   out/projects.csv                  — paste into SP list Quick Edit
 *   out/schema.json                   — column types + seeded choice values
 *   out/distinct-values.md            — stakeholder review of choice lists
 *   out/manager-palette.csv           — deterministic hex per Team Manager
 *   out/manager-palette.powerfx.txt   — paste-ready App.OnStart ClearCollect
 *
 * Usage:
 *   node scripts/convert-to-sharepoint.js
 *   node scripts/convert-to-sharepoint.js path/to/landing-page-data.xlsx
 *
 * Source of truth: ~/Downloads/landing-page-data.xlsx (14 cols × ~210 rows).
 * Relics from prior SPFx IProject model are intentionally ignored.
 */

const ExcelJS = require('exceljs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');

const DEFAULT_SRC = path.join(os.homedir(), 'Downloads', 'landing-page-data.xlsx');
const SRC = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SRC;
const OUT = path.resolve(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const PALETTE = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2',
  '#7f7f7f', '#bcbd22', '#17becf', '#393b79', '#637939', '#8c6d31',
];

const normalizeOpCo = (v) => {
  const t = (v ?? '').toString().trim();
  if (t === 'GEN') return 'Generation';
  return t;
};

// Stakeholder-directed Value Category cleanup:
//   "Business Process Improvemen" / "Business Process Improvements" → "Business Process Improvement"
//   "Emerging Initiatives" → "Emergent Initiatives"
//   "Dan" → null (data entry error)
const VALUE_CATEGORY_REMAP = {
  'business process improvemen':  'Business Process Improvement',
  'business process improvement': 'Business Process Improvement',
  'business process improvements':'Business Process Improvement',
  'emergent initiatives':         'Emergent Initiatives',
  'emerging initiatives':         'Emergent Initiatives',
  'dan': '',
};
const normalizeValueCategory = (v) => {
  const t = (v ?? '').toString().trim();
  if (!t) return '';
  const key = t.toLowerCase();
  return key in VALUE_CATEGORY_REMAP ? VALUE_CATEGORY_REMAP[key] : t;
};

// Stable 12-char hex key derived from narrow tuple (per user directive).
// Edits to Title/Manager/OpCo/Stakeholder mint a new key; other column edits preserve it.
// Collisions are possible when two source rows share all four — logged as warnings.
const projectKey = (title, manager, opCo, stakeholder) =>
  crypto
    .createHash('sha1')
    .update([title, manager, opCo, stakeholder].map((s) => (s ?? '').trim().toLowerCase()).join('|'))
    .digest('hex')
    .slice(0, 12);

// Human-readable, filesystem-safe folder name per project. Used as the subfolder
// collectors drop images into; the upload script resolves slug -> ProjectKey via
// out/image-manifest.csv. Collisions are de-duped with a ProjectKey suffix below.
const slugify = (s) =>
  (s ?? '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled';

const splitNames = (s) =>
  (s ?? '')
    .toString()
    .split(/[\/&,\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);

const cellText = (cell) => {
  const v = cell?.value;
  if (v == null) return '';
  if (typeof v === 'object') {
    if ('text' in v) return v.text ?? '';
    if ('hyperlink' in v) return v.hyperlink ?? '';
    if ('result' in v) return v.result ?? '';
    if ('richText' in v && Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('');
  }
  return v.toString();
};

const cellLink = (cell) => {
  const v = cell?.value;
  if (v && typeof v === 'object' && 'hyperlink' in v) return v.hyperlink || '';
  return cellText(cell);
};

async function main() {
  console.log(`Reading ${SRC}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(SRC);
  const ws = wb.worksheets[0];

  const headerRow = ws.getRow(1);
  const headers = headerRow.values.slice(1).map((h) => (h ?? '').toString().trim());
  const idx = (name) => headers.indexOf(name);

  const COLS = {
    projectName:   idx('Project Name'),
    category:      idx('Category'),
    manager:       idx('Manager'),
    fn:            idx('Function'),
    stakeholder:   idx('Stakeholder'),
    department:    idx('Department'),
    notes:         idx('Notes'),
    description:   idx('Description'),
    status:        idx('Status'),
    opCo:          idx('OpCo'),
    teamName:      idx('Team Name'),
    link:          idx('Link'),
    valueCategory: idx('Value Category'),
  };

  for (const [k, v] of Object.entries(COLS)) {
    if (v === -1) throw new Error(`Missing expected column: ${k}`);
  }

  const cleaned = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum === 1) return;
    const cells = row.values.slice(1);
    const get = (k) => cellText({ value: cells[COLS[k]] });
    const title       = get('projectName');
    const manager     = get('manager');
    const opCo        = normalizeOpCo(get('opCo'));
    const stakeholder = splitNames(get('stakeholder')).join('; ');
    cleaned.push({
      ProjectKey:    projectKey(title, manager, opCo, stakeholder),
      Title:         title,
      Category:      get('category'),
      TeamManager:   manager,
      Function:      get('fn'),
      Stakeholder:   stakeholder,
      Department:    get('department'),
      Notes:         get('notes'),
      Description:   get('description'),
      Status:        get('status').trim(),
      OpCo:          opCo,
      TeamName:      get('teamName'),
      Link:          cellLink({ value: cells[COLS.link] }),
      ValueCategory: normalizeValueCategory(get('valueCategory')),
      Thumbnail:     '',
      HasLogo:       'No',
      ShowInCatalog: 'Yes',
    });
  });

  // ---- projects.csv ----
  const csvHeaders = Object.keys(cleaned[0]);
  const escape = (v) => {
    const s = (v ?? '').toString();
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv =
    csvHeaders.join(',') +
    '\n' +
    cleaned.map((r) => csvHeaders.map((h) => escape(r[h])).join(',')).join('\n') +
    '\n';
  fs.writeFileSync(path.join(OUT, 'projects.csv'), csv);

  // ---- schema.json ----
  const distinct = (key) => [...new Set(cleaned.map((r) => r[key]).filter(Boolean))].sort();
  const schema = {
    Category:      { type: 'Choice', fillInAllowed: true,  choices: distinct('Category') },
    Function:      { type: 'Choice', fillInAllowed: true,  choices: distinct('Function') },
    ValueCategory: { type: 'Choice', fillInAllowed: true,  choices: distinct('ValueCategory') },
    Status:        { type: 'Choice', fillInAllowed: true,  choices: ['Done', 'In Development', 'Scoping'] },
    OpCo:          { type: 'Choice', fillInAllowed: false, choices: ['APC', 'MPC', 'GPC', 'SCS', 'Generation'] },
  };
  fs.writeFileSync(path.join(OUT, 'schema.json'), JSON.stringify(schema, null, 2));

  // ---- distinct-values.md ----
  const md =
    ['# Distinct Choice Values (Seeded)', '']
      .concat(
        Object.entries(schema).flatMap(([col, { choices }]) => [
          `## ${col}`,
          '',
          ...choices.map((c) => `- ${c}`),
          '',
        ]),
      )
      .join('\n');
  fs.writeFileSync(path.join(OUT, 'distinct-values.md'), md);

  // ---- manager-palette.csv + .powerfx.txt ----
  const managers = [...new Set(cleaned.map((r) => r.TeamManager).filter(Boolean))].sort();
  const palette = managers.map((m, i) => ({ Manager: m, Color: PALETTE[i % PALETTE.length] }));
  const paletteCsv =
    'Manager,Color\n' + palette.map((r) => `"${r.Manager}",${r.Color}`).join('\n') + '\n';
  fs.writeFileSync(path.join(OUT, 'manager-palette.csv'), paletteCsv);

  const fx =
    `ClearCollect(ManagerPalette,\n` +
    palette
      .map((r) => `  { Manager: "${r.Manager}", Color: ColorValue("${r.Color}") }`)
      .join(',\n') +
    `,\n  { Manager: "_default", Color: ColorValue("#6b7280") }\n);\n`;
  fs.writeFileSync(path.join(OUT, 'manager-palette.powerfx.txt'), fx);

  // ---- collision detection ----
  const keyGroups = cleaned.reduce((acc, r) => {
    (acc[r.ProjectKey] ??= []).push(r);
    return acc;
  }, {});
  const collisions = Object.entries(keyGroups).filter(([, rs]) => rs.length > 1);
  if (collisions.length) {
    const lines = ['# ProjectKey Collisions', '', 'Rows sharing identical Title|Manager|OpCo|Stakeholder. SP list ingests both; lookups by key return ambiguous results until rows are merged or differentiated upstream.', ''];
    collisions.forEach(([key, rs]) => {
      lines.push(`## ${key}`);
      rs.forEach((r) => lines.push(`- "${r.Title}" — ${r.TeamManager} — ${r.OpCo} — ${r.Stakeholder}`));
      lines.push('');
    });
    fs.writeFileSync(path.join(OUT, 'collisions.md'), lines.join('\n'));
  }

  // ---- image-manifest.csv ----
  // Maps each project to a collector-friendly slug folder. The upload script
  // resolves Slug -> ProjectKey from this file, so slugs MUST be unique. On a
  // base-slug collision, append a short ProjectKey to disambiguate.
  const slugCounts = {};
  cleaned.forEach((r) => {
    const base = slugify(r.Title);
    slugCounts[base] = (slugCounts[base] || 0) + 1;
  });
  const manifest = cleaned.map((r) => {
    const base = slugify(r.Title);
    const slug = slugCounts[base] > 1 ? `${base}-${r.ProjectKey.slice(0, 6)}` : base;
    return { ProjectKey: r.ProjectKey, Title: r.Title, Slug: slug };
  });
  const manifestCsv =
    'ProjectKey,Title,Slug\n' +
    manifest.map((m) => [m.ProjectKey, escape(m.Title), m.Slug].join(',')).join('\n') +
    '\n';
  fs.writeFileSync(path.join(OUT, 'image-manifest.csv'), manifestCsv);

  // Sanity: slugs must be unique (upload script keys on them).
  const dupeSlugs = Object.entries(
    manifest.reduce((acc, m) => ((acc[m.Slug] = (acc[m.Slug] || 0) + 1), acc), {}),
  ).filter(([, n]) => n > 1);

  // ---- summary ----
  const statusCounts = cleaned.reduce((acc, r) => {
    const k = r.Status || '(blank)';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const opCoCounts = cleaned.reduce((acc, r) => {
    const k = r.OpCo || '(blank)';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  console.log(`Wrote ${cleaned.length} rows → ${OUT}/`);
  console.log('  - projects.csv');
  console.log('  - schema.json');
  console.log('  - distinct-values.md');
  console.log('  - manager-palette.csv');
  console.log('  - manager-palette.powerfx.txt');
  console.log('  - image-manifest.csv');
  console.log('');
  console.log('Status distribution:');
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(20)} ${v}`));
  console.log('');
  console.log('OpCo distribution (normalized):');
  Object.entries(opCoCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(20)} ${v}`));
  console.log('');
  console.log(`Managers: ${managers.length} distinct`);
  if (collisions.length) {
    console.log('');
    console.log(`⚠️  ${collisions.length} ProjectKey collision(s) → see out/collisions.md`);
  }
  if (dupeSlugs.length) {
    console.log('');
    console.log(`⚠️  ${dupeSlugs.length} duplicate image slug(s) after de-dup: ${dupeSlugs.map(([s]) => s).join(', ')}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
