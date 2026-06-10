/**
 * Merge showcase enrichment data into projects.ts.
 * Run AFTER convert-excel.js and BEFORE export-to-excel.js.
 * Usage: node scripts/enrich-showcase.js
 */
const fs = require('fs');
const path = require('path');

const projectsPath = path.resolve(__dirname, '../src/webparts/applicationCatalog/data/projects.ts');
const enrichmentPath = path.resolve(__dirname, '../src/webparts/applicationCatalog/data/showcase-enrichment.json');

function loadProjects() {
  const content = fs.readFileSync(projectsPath, 'utf-8');
  const startIdx = content.indexOf('= [');
  if (startIdx === -1) throw new Error('Could not find projects array');
  const jsonStr = content.substring(startIdx + 2).replace(/\]\s*as\s+any[\s\S]*$/, ']');
  return JSON.parse(jsonStr);
}

function main() {
  const projects = loadProjects();
  const enrichment = JSON.parse(fs.readFileSync(enrichmentPath, 'utf-8'));

  var enrichedCount = 0;
  var enrichedIds = [];

  projects.forEach(function(p) {
    var data = enrichment[p.kruseId];
    if (!data) return;

    if (data.valueStatement) p.valueStatement = data.valueStatement;
    if (data.audience) p.audience = data.audience;
    if (data.productOverview) p.productOverview = data.productOverview;
    if (data.socoSponsor) p.socoSponsor = data.socoSponsor;
    if (data.serviceTypes && data.serviceTypes.length > 0) p.serviceTypes = data.serviceTypes;
    if (data.completionPercentage != null) p.completionPercentage = data.completionPercentage;
    if (data.teamSize != null) p.teamSize = data.teamSize;

    enrichedCount++;
    enrichedIds.push(p.kruseId);
  });

  // Write back
  var tsContent = "// Auto-generated from Excel master sheet. Do not edit manually.\n";
  tsContent += "// Generated: " + new Date().toISOString().split('T')[0] + "\n";
  tsContent += "import { IProject } from '../models/IProject';\n\n";
  tsContent += "// eslint-disable-next-line @typescript-eslint/no-explicit-any\n";
  tsContent += "export const projects: IProject[] = " + JSON.stringify(projects, null, 2) + " as any;\n";

  fs.writeFileSync(projectsPath, tsContent, 'utf-8');
  console.log('Enriched ' + enrichedCount + ' projects: ' + enrichedIds.join(', '));
  console.log('Total projects: ' + projects.length);
}

main();
