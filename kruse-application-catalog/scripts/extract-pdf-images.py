#!/usr/bin/env python3
"""
extract-pdf-images.py

Extracts dashboard/app screenshots from Kruse quarterly-review PDFs and
matches them to projects in projects.ts by fuzzy name matching.

Usage:
    python3 scripts/extract-pdf-images.py

Output:
    project-data/images/{kruseId}.png   — one image per matched project
    project-data/image-map.json         — match report for review/upload
"""

import json
import os
import re
import shutil
import struct
import subprocess
import tempfile
from difflib import SequenceMatcher
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR   = Path(__file__).parent
REPO_ROOT    = SCRIPT_DIR.parent
PROJECT_DATA = REPO_ROOT.parent / 'project-data'
PROJECTS_TS  = REPO_ROOT / 'src/webparts/applicationCatalog/data/projects.ts'
IMAGES_OUT   = PROJECT_DATA / 'images'
MAP_OUT      = PROJECT_DATA / 'image-map.json'

PDFTOTEXT  = '/opt/homebrew/bin/pdftotext'
PDFIMAGES  = '/opt/homebrew/bin/pdfimages'

# PDFs ordered newest → oldest (newest image wins for a given project)
PDF_ORDER = [
    "Q1 '26 - Kruse Consulting Quarterly Review_FINAL.pdf",
    "Q4 '24 - Q1 '25 - Kruse Consulting Semi-Annual Review FINAL 4-29-25.pdf",
    "Q2 '25 - Q3.5 '25 - Kruse Consulting Semi-Annual Review 12-8-25.pdf",
    "Q3 - 2024 - Kruse Consulting Lookback - Final Draft.pdf",
    "Q2 Lookback 2024.pdf",
]

# Template image dimensions to skip (appear on every page)
TEMPLATE_DIMS = {(2497, 227), (306, 276)}

# Keywords that mark non-project pages
SKIP_KEYWORDS = [
    'following impacts', 'program overview', 'lookback', 'appendix',
    'agenda', 'team overview', 'roadmapping', 'upcoming projects',
    'data exploration', 'quarterly review', 'semi-annual', 'kruse consulting',
    'relative project', 'kruse control', 'project lifecycle',
    'sample ', 'our team', 'our services', 'who we are', 'force multiplier',
    'mentorship', 'dear ', 'capabilities chart', 'blocker',
]

# ---------------------------------------------------------------------------
# Load projects
# ---------------------------------------------------------------------------
def load_projects():
    raw = PROJECTS_TS.read_text(encoding='utf-8')
    eq_idx = raw.index('= [')
    start  = raw.index('[', eq_idx)
    end    = raw.rindex(']') + 1
    return json.loads(raw[start:end])

# ---------------------------------------------------------------------------
# Fuzzy match
# ---------------------------------------------------------------------------
def similarity(a, b):
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()

def best_match(candidate, projects):
    best_proj, best_score = None, 0.0
    for p in projects:
        names_to_try = [p.get('simplifiedName', ''), p.get('parentProjectName', '')]
        for name in names_to_try:
            if not name:
                continue
            score = similarity(candidate, name)
            if score > best_score:
                best_score = score
                best_proj = p
    return best_proj, best_score

# ---------------------------------------------------------------------------
# PNG dimension reader (no Pillow needed)
# ---------------------------------------------------------------------------
def png_dimensions(path):
    try:
        with open(path, 'rb') as f:
            header = f.read(24)
        if header[:8] != b'\x89PNG\r\n\x1a\n':
            return (0, 0)
        w, h = struct.unpack('>II', header[16:24])
        return (w, h)
    except Exception:
        return (0, 0)

# ---------------------------------------------------------------------------
# Extract text per page from a PDF
# ---------------------------------------------------------------------------
def extract_pages(pdf_path):
    result = subprocess.run(
        [PDFTOTEXT, str(pdf_path), '-'],
        capture_output=True, text=True, encoding='utf-8', errors='replace'
    )
    return result.stdout.split('\f')

# ---------------------------------------------------------------------------
# Parse page title — expects "Workstream | ProjectName" on first non-empty line
# ---------------------------------------------------------------------------
def parse_project_title(page_text):
    lines = [l.strip() for l in page_text.split('\n') if l.strip()]
    if not lines:
        return None
    title = lines[0]
    # Must contain a pipe character
    if '|' not in title:
        return None
    # Check skip keywords against full title
    title_lower = title.lower()
    for kw in SKIP_KEYWORDS:
        if kw in title_lower:
            return None
    # Extract project name (part after last |)
    parts = title.split('|')
    project_name = parts[-1].strip()
    # Remove parenthetical suffixes like "(VM)" or "(Preview)"
    project_name = re.sub(r'\s*\(.*?\)\s*$', '', project_name).strip()
    if len(project_name) < 3:
        return None
    return project_name

# ---------------------------------------------------------------------------
# Extract images for a given page number, return list of (path, size, dims)
# ---------------------------------------------------------------------------
def extract_page_images(pdf_path, page_num, tmpdir):
    prefix = str(Path(tmpdir) / f'p{page_num:03d}')
    subprocess.run(
        [PDFIMAGES, '-png', '-f', str(page_num), '-l', str(page_num),
         str(pdf_path), prefix],
        capture_output=True
    )
    results = []
    for fname in sorted(Path(tmpdir).glob(f'p{page_num:03d}-*.png')):
        size = fname.stat().st_size
        dims = png_dimensions(fname)
        results.append((fname, size, dims))
    return results

# ---------------------------------------------------------------------------
# Pick best content image from a page's image list
# ---------------------------------------------------------------------------
def pick_content_image(images):
    candidates = []
    for (path, size, dims) in images:
        # Skip template images
        if dims in TEMPLATE_DIMS:
            continue
        # Skip tiny decorative elements
        if size < 5000:
            continue
        w, h = dims
        # Skip very small images
        if h < 200 or w < 400:
            continue
        # Skip near-square small images (icons, badges, headshots)
        ratio = w / h if h else 0
        is_square_ish = (0.7 <= ratio <= 1.3)
        if is_square_ish and size < 50_000:
            continue
        candidates.append((path, size, dims))

    if not candidates:
        return None
    # Return the largest by file size
    candidates.sort(key=lambda x: x[1], reverse=True)
    return candidates[0][0]

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    IMAGES_OUT.mkdir(parents=True, exist_ok=True)
    projects = load_projects()
    print(f'Loaded {len(projects)} projects from projects.ts\n')

    image_map = {}      # kruseId → match info
    already_matched = set()  # kruseIds already assigned from newer PDFs

    unmatched_pages  = []  # (pdf, page_num, candidate_name, best_score)
    skipped_pages    = []  # pages with no pipe title
    low_conf_matches = []  # matches with score 0.6–0.75

    with tempfile.TemporaryDirectory() as tmpdir:
        for pdf_name in PDF_ORDER:
            pdf_path = PROJECT_DATA / pdf_name
            if not pdf_path.exists():
                print(f'  [SKIP] {pdf_name} not found')
                continue

            print(f'Processing: {pdf_name}')
            pages = extract_pages(pdf_path)

            matched_this_pdf = 0
            for page_idx, page_text in enumerate(pages):
                page_num = page_idx + 1  # 1-based
                candidate = parse_project_title(page_text)

                if candidate is None:
                    skipped_pages.append((pdf_name, page_num))
                    continue

                proj, score = best_match(candidate, projects)
                if score < 0.60:
                    unmatched_pages.append((pdf_name, page_num, candidate, round(score, 2)))
                    continue

                kruseid = proj['kruseId']

                # Newer PDF already has this project — skip
                if kruseid in already_matched:
                    continue

                # Extract images for this page
                page_images = extract_page_images(pdf_path, page_num, tmpdir)
                best_img = pick_content_image(page_images)

                if best_img is None:
                    unmatched_pages.append((pdf_name, page_num, candidate, round(score, 2)))
                    continue

                # Save image
                dest = IMAGES_OUT / f'{kruseid}.png'
                shutil.copy2(best_img, dest)
                already_matched.add(kruseid)
                matched_this_pdf += 1

                entry = {
                    'file': str(dest.relative_to(REPO_ROOT.parent)),
                    'source_pdf': pdf_name,
                    'page': page_num,
                    'confidence': round(score, 2),
                    'pdf_title': candidate,
                    'matched_name': proj.get('simplifiedName', ''),
                }
                image_map[kruseid] = entry

                if score < 0.75:
                    low_conf_matches.append((kruseid, candidate, proj.get('simplifiedName', ''), round(score, 2)))

                flag = ' ⚠ LOW CONF' if score < 0.75 else ''
                print(f'  p{page_num:03d} [{score:.2f}] "{candidate}" → {kruseid} ({proj.get("simplifiedName","")}){flag}')

            # Clean up temp images after each PDF
            for f in Path(tmpdir).glob('*.png'):
                f.unlink()

            print(f'  → {matched_this_pdf} matches\n')

    # Write map
    MAP_OUT.write_text(json.dumps(image_map, indent=2), encoding='utf-8')

    # Summary report
    print('=' * 60)
    print(f'RESULTS')
    print(f'  Matched projects:     {len(image_map)}')
    print(f'  Unmatched pages:      {len(unmatched_pages)}')
    print(f'  Low-confidence (⚠):   {len(low_conf_matches)}')
    print(f'  Images saved to:      {IMAGES_OUT}')
    print(f'  Map written to:       {MAP_OUT}')

    if low_conf_matches:
        print('\n⚠  LOW CONFIDENCE MATCHES — review manually:')
        for kruseid, pdf_name, proj_name, score in low_conf_matches:
            print(f'  {kruseid}: "{pdf_name}" → "{proj_name}" (score={score})')

    if unmatched_pages:
        print('\nUNMATCHED PAGES (no project found):')
        for pdf, page, name, score in unmatched_pages[:20]:
            print(f'  {pdf} p{page}: "{name}" (best score={score})')
        if len(unmatched_pages) > 20:
            print(f'  ... and {len(unmatched_pages)-20} more')

    print('\nDone.')

if __name__ == '__main__':
    main()
