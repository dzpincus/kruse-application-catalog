#!/usr/bin/env python3
"""
Author Phases 1-3 of the in-app edit/add-project feature into the pac .fx.yaml source.

The Kruse Deliverables canvas app has NO supported round-trip via Studio's native .pa.yaml,
but pac canvas pack/unpack IS faithful for it (validated: unmodified repack renders identically,
and Import->Save->"Replace existing" updates production in place). So we edit the .fx.yaml
source pac emits, pack it, and import.

WORKFLOW (needs pac CLI + .NET; pac canvas is preview):
  1. Export the current app from Studio (File > Save as > This computer)  ->  latest.msapp
  2. pac canvas unpack --msapp latest.msapp --sources ./src
  3. python3 build-edit-feature.py ./src
  4. pac canvas pack --msapp edit.msapp --sources ./src
  5. Studio > Apps > Import app > From file (.msapp) > edit.msapp
     -> opens in Studio unsaved; Play-test; Save -> "Replace existing" to update production.
  Same App Id/name are preserved, so import updates in place. Reversible: re-import the prior msapp.

WHAT IT DOES
  Phase 1  App.OnStart: colEditors / varCanEdit / varEditOpen / varEditMode / varEditKey
           + two Visible bug fixes (galLegend_1, dtlImagesLabel).
  Phase 2  Edit overlay (pnlEditOverlay/pnlEditCard) + form controls + BtnEditProject; edit Patch.
  Phase 3  BtnAddProject (GUID ProjectKey) + add Patch branch.

NOTES
  - The six choice columns are MULTI-SELECT (app reads them via Concat(<f>.Value, Value)).
    Dropdowns seed from First(<f>).Value and Patch writes Table({Value: ...}). Single dropdowns
    hold ONE value, so editing a multi-value project collapses that field on save (accepted MVP;
    upgrade to multi-select comboboxes in Studio if needed).
  - 'Thumbnail (field_14)' no longer drives the card image (colThumbnails does); image upload is
    Phase 4 (a Power Automate flow, Studio-only - a flow connection reference can't be packed).
  - colEditors is seeded with one email; add the real Kruse member @southernco.com accounts.

Usage:  python3 build-edit-feature.py <unpacked-sources-dir>
"""
import sys, os

B = sys.argv[1] if len(sys.argv) > 1 else "./src"
APP = os.path.join(B, "Src", "App.fx.yaml")
MS  = os.path.join(B, "Src", "MainScreen.fx.yaml")

# ---------- Phase 1a: App.OnStart gating vars ----------
app = open(APP, encoding="utf-8").read()
IND = " " * 10                                        # OnStart content is indented 10 spaces
anchor = IND + "Set(varFiltersOpen, true);"
assert app.count(anchor) == 1, f"OnStart anchor count={app.count(anchor)}"
gating = anchor + "\n" + "\n".join(IND + ln for ln in [
    'ClearCollect(colEditors, { Email: "x2dpincu@southernco.com" });',
    'Set(varCanEdit, Lower(User().Email) in colEditors.Email);',
    'Set(varEditOpen, false);',
    'Set(varEditMode, "");',
    'Set(varEditKey, "");',
])
app = app.replace(anchor, gating, 1)
open(APP, "w", encoding="utf-8").write(app)
print("Phase 1a: gating vars added to OnStart")

# ---------- Phase 1b: two Visible bug fixes ----------
ms = open(MS, encoding="utf-8").read()

old_lbl = 'Visible: =varSelectedProject.Title = "3 Phase Critical Stock Dashboard"'
new_lbl = 'Visible: =varPanelOpen && !IsBlank(LookUp(colThumbnails, ProjectKey = varSelectedProject.ProjectKey).ThumbUrl)'
assert ms.count(old_lbl) == 1, f"dtlImagesLabel visible count={ms.count(old_lbl)}"
ms = ms.replace(old_lbl, new_lbl, 1)

# galLegend_1 Visible: the varFiltersOpen occurrence AFTER "galLegend_1 As"
gi = ms.index("galLegend_1 As gallery")
before, after = ms[:gi], ms[gi:]
after_fixed = after.replace("Visible: =varFiltersOpen", "Visible: =varPanelOpen", 1)
assert after_fixed != after, "galLegend_1 visible not found"
ms = before + after_fixed
print("Phase 1b: galLegend_1 + dtlImagesLabel Visible fixed")

# ---------- Phases 2-3: edit/add controls ----------
X0 = "(Parent.Width - 760) / 2"                      # card left edge (centered)
def x(off): return f"={X0} + {off}"

RESET = ("Reset(txtTitle); Reset(txtTeamManager); Reset(txtTeamName); Reset(txtStakeholder); "
         "Reset(txtLink); Reset(txtDescription); Reset(txtNotes); Reset(ddEditCategory); "
         "Reset(ddEditFunction); Reset(ddEditStatus); Reset(ddEditOpCo); Reset(ddEditDepartment); "
         "Reset(ddEditValueCategory); Reset(ddEditShow)")

def label(name, text, xoff, y, w=336, z=42):
    return f"""    {name} As label:
        Color: =RGBA(100,116,139,1)
        Font: =Font.'Segoe UI'
        FontWeight: =FontWeight.Semibold
        Size: =9
        Text: ="{text}"
        Visible: =varEditOpen
        Width: ={w}
        X: {x(xoff)}
        Y: ={y}
        ZIndex: ={z}
"""

def textinput(name, seed, xoff, y, w=336, h=32, multiline=False, z=42):
    mode = "\n        Mode: =TextMode.MultiLine" if multiline else ""
    default = f'=If(varEditMode = "edit", {seed}, "")' if seed else '=""'
    return f"""    {name} As text:
        BorderColor: =RGBA(203,213,225,1)
        Color: =RGBA(50, 49, 48, 1)
        Default: |-
            {default}
        Fill: =RGBA(255,255,255,1)
        Font: =Font.'Segoe UI'
        Height: ={h}{mode}
        Size: =10
        Visible: =varEditOpen
        Width: ={w}
        X: {x(xoff)}
        Y: ={y}
        ZIndex: ={z}
"""

def dropdown(name, items, seed_default, xoff, y, w=336, z=42):
    return f"""    {name} As dropdown:
        BorderColor: =RGBA(203,213,225,1)
        BorderThickness: =1
        Color: =RGBA(15,23,42,1)
        Default: |-
            {seed_default}
        Fill: =RGBA(255,255,255,1)
        Font: =Font.'Segoe UI'
        Height: =32
        Items: |-
            ={items}
        Size: =10
        Visible: =varEditOpen
        Width: ={w}
        X: {x(xoff)}
        Y: ={y}
        ZIndex: ={z}
"""

def button(name, text, onselect, xoff, y, w, fill, visible="=varEditOpen", z=42):
    return f"""    {name} As button:
        BorderStyle: =BorderStyle.None
        Color: =RGBA(255,255,255,1)
        Fill: {fill}
        Font: =Font.'Segoe UI'
        FontWeight: =FontWeight.Semibold
        Height: =34
        HoverFill: =RGBA(16, 110, 190, 1)
        OnSelect: |-
            {onselect}
        RadiusBottomLeft: =6
        RadiusBottomRight: =6
        RadiusTopLeft: =6
        RadiusTopRight: =6
        Size: =11
        Text: ="{text}"
        Visible: {visible}
        Width: ={w}
        X: {x(xoff)}
        Y: ={y}
        ZIndex: ={z}
"""

parts = []

parts.append(f"""    pnlEditOverlay As rectangle:
        BorderStyle: =BorderStyle.None
        Fill: =RGBA(0,0,0,0.45)
        Height: =Parent.Height
        OnSelect: =Set(varEditOpen, false)
        Visible: =varEditOpen
        Width: =Parent.Width
        ZIndex: =40
""")
parts.append(f"""    pnlEditCard As rectangle:
        BorderColor: =RGBA(203,213,225,1)
        BorderThickness: =1
        Fill: =RGBA(255,255,255,1)
        Height: =708
        Visible: =varEditOpen
        Width: =760
        X: ={X0}
        Y: =36
        ZIndex: =41
""")
parts.append(f"""    lblEditHeader As label:
        Color: =RGBA(15,23,42,1)
        Font: =Font.'Segoe UI'
        FontWeight: =FontWeight.Bold
        Size: =15
        Text: =If(varEditMode = "add", "Add Project", "Edit Project")
        Visible: =varEditOpen
        Width: =500
        X: {x(24)}
        Y: =52
        ZIndex: =42
""")

# Title (full width)
parts.append(label("lblEditTitle", "Title *", 24, 88, w=712))
parts.append(textinput("txtTitle", "varSelectedProject.Title", 24, 106, w=712))

# left column: choice dropdowns (MULTI-SELECT -> seed First(<field>).Value)
left = [
    ("lblEdCategory","Category *","ddEditCategory","Choices(ApplicationCatalog.Category)","First(varSelectedProject.Category).Value"),
    ("lblEdFunction","Function","ddEditFunction","Choices(ApplicationCatalog.Function)","First(varSelectedProject.Function).Value"),
    ("lblEdStatus","Status *","ddEditStatus","Choices(ApplicationCatalog.Status)","First(varSelectedProject.Status).Value"),
    ("lblEdOpCo","Operating Company","ddEditOpCo","Choices(ApplicationCatalog.OpCo)","First(varSelectedProject.OpCo).Value"),
    ("lblEdDept","Department","ddEditDepartment","Choices(ApplicationCatalog.Department)","First(varSelectedProject.Department).Value"),
    ("lblEdValCat","Value Category","ddEditValueCategory","Choices(ApplicationCatalog.ValueCategory)","First(varSelectedProject.ValueCategory).Value"),
]
ys = [156, 212, 268, 324, 380, 436]
for (lname, ltext, dname, items, seed), yy in zip(left, ys):
    parts.append(label(lname, ltext, 24, yy))
    default = f'=If(varEditMode = "edit", {seed}, "")'
    parts.append(dropdown(dname, items, default, 24, yy+18))

# right column: text inputs + show dropdown
right_txt = [
    ("lblEdTM","Team Manager","txtTeamManager","varSelectedProject.TeamManager"),
    ("lblEdTN","Team Name","txtTeamName","varSelectedProject.TeamName"),
    ("lblEdStk","Stakeholder","txtStakeholder","varSelectedProject.Stakeholder"),
    ("lblEdLink","Link (URL)","txtLink","varSelectedProject.Link"),
]
ys_r = [156, 212, 268, 324]
for (lname, ltext, tname, seed), yy in zip(right_txt, ys_r):
    parts.append(label(lname, ltext, 400, yy))
    parts.append(textinput(tname, seed, 400, yy+18))
parts.append(label("lblEdShow", "Show in catalog", 400, 380))
show_default = '=If(varEditMode = "edit", If(varSelectedProject.ShowInCatalog, "Yes", "No"), "Yes")'
parts.append(dropdown("ddEditShow", '["Yes","No"]', show_default, 400, 398))

# Description + Notes (full width, multiline)
parts.append(label("lblEdDesc", "Description", 24, 494, w=712))
parts.append(textinput("txtDescription", "varSelectedProject.Description", 24, 512, w=712, h=56, multiline=True))
parts.append(label("lblEdNotes", "Notes", 24, 578, w=712))
parts.append(textinput("txtNotes", "varSelectedProject.Notes", 24, 596, w=712, h=56, multiline=True))

# Save / Cancel
SAVE = ('=If(IsBlank(txtTitle.Text) || IsBlank(ddEditCategory.Selected.Value) || IsBlank(ddEditStatus.Selected.Value), '
        'Notify("Title, Category, and Status are required.", NotificationType.Error), '
        'Set(varEditResult, Patch(ApplicationCatalog, '
        'If(varEditMode = "add", Defaults(ApplicationCatalog), LookUp(ApplicationCatalog, ProjectKey = varEditKey)), '
        '{Title: txtTitle.Text, ProjectKey: varEditKey, '
        'Category: Table({Value: ddEditCategory.Selected.Value}), '
        'Status: Table({Value: ddEditStatus.Selected.Value}), '
        'Function: If(IsBlank(ddEditFunction.Selected.Value), Blank(), Table({Value: ddEditFunction.Selected.Value})), '
        'OpCo: If(IsBlank(ddEditOpCo.Selected.Value), Blank(), Table({Value: ddEditOpCo.Selected.Value})), '
        'Department: If(IsBlank(ddEditDepartment.Selected.Value), Blank(), Table({Value: ddEditDepartment.Selected.Value})), '
        'ValueCategory: If(IsBlank(ddEditValueCategory.Selected.Value), Blank(), Table({Value: ddEditValueCategory.Selected.Value})), '
        'TeamManager: txtTeamManager.Text, TeamName: txtTeamName.Text, Stakeholder: txtStakeholder.Text, '
        'Link: txtLink.Text, Description: txtDescription.Text, Notes: txtNotes.Text, '
        'ShowInCatalog: (ddEditShow.Selected.Value = "Yes")})); '
        'Set(varSelectedProject, varEditResult); Set(varEditOpen, false); '
        'Notify(If(varEditMode = "add", "Project added.", "Project updated."), NotificationType.Success))')
parts.append(button("BtnSaveProject", "Save", SAVE, 24, 668, 140, "=RGBA(22,101,52,1)"))
parts.append(button("BtnCancelEdit", "Cancel", "=Set(varEditOpen, false)", 176, 668, 120, "=RGBA(71,85,105,1)"))

# header Add button + detail Edit button (screen-level, own visibility)
ADD_ONSELECT = ('=Set(varEditMode, "add"); Set(varEditKey, "PRJ-" & Upper(Mid(Text(GUID()), 1, 8))); '
                + RESET + '; Set(varEditOpen, true)')
parts.append(button("BtnAddProject", "+ Add Project", ADD_ONSELECT,
                    0, 22, 130, "=RGBA(22,101,52,1)",
                    visible="=varCanEdit && Not(varPanelOpen)", z=40).replace(x(0), "=BtnFiltersToggle.X + 130"))

EDIT_ONSELECT = ('=Set(varEditMode, "edit"); Set(varEditKey, varSelectedProject.ProjectKey); '
                 + RESET + '; Set(varEditOpen, true)')
parts.append(button("BtnEditProject", "Edit", EDIT_ONSELECT,
                    0, 16, 100, "=RGBA(16,110,190,1)",
                    visible="=varCanEdit && varPanelOpen", z=40).replace(x(0), "=Parent.Width - 540"))

ms = ms.rstrip("\n") + "\n\n" + "\n".join(parts)
open(MS, "w", encoding="utf-8").write(ms)
print(f"Phases 2-3: appended {len(parts)} control blocks")
