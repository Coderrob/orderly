# Orderly Examples

This document provides real-world examples of using Orderly to organize files.

## Example 1: Basic File Organization

### Before
```
my-folder/
├── Background Music.mp3
├── Budget 2024.xlsx
├── Holiday Video.mp4
├── Meeting Notes.docx
├── Photo_Vacation.JPG
├── Project Proposal.pdf
├── Website Code.js
└── data_backup.zip
```

### Command
```bash
orderly organize my-folder
```

### After
```
my-folder/
├── archives/
│   └── data-backup.zip
├── audio/
│   └── background-music.mp3
├── code/
│   └── website-code.js
├── documents/
│   ├── meeting-notes.docx
│   └── project-proposal.pdf
├── images/
│   └── photo-vacation.jpg
├── spreadsheets/
│   └── budget-2024.xlsx
└── videos/
    └── holiday-video.mp4
```

**What happened:**
- Files were automatically categorized by extension
- All file names were converted to kebab-case
- Files were moved to their respective category folders
- A manifest was generated in `.orderly/manifest.json` and `.orderly/manifest.md`
- All actions were logged to `.orderly/orderly.log`

## Example 2: Custom Configuration

Create a `.orderly.yml` file:

```yaml
categories:
  - name: frontend
    extensions: [.js, .jsx, .tsx, .css, .html]
    targetFolder: src/frontend
  - name: backend
    extensions: [.py, .go, .java]
    targetFolder: src/backend
  - name: config
    extensions: [.yml, .yaml, .json, .toml]
    targetFolder: config

namingConvention:
  type: snake_case

excludePatterns:
  - node_modules/**
  - .git/**
```

### Before
```
project/
├── AppComponent.jsx
├── serverMain.py
├── configFile.yml
└── StyleSheet.css
```

### Command
```bash
orderly organize project
```

### After
```
project/
├── config/
│   └── config_file.yml
├── src/
│   ├── backend/
│   │   └── server_main.py
│   └── frontend/
│       ├── app_component.jsx
│       └── style_sheet.css
```

## Example 3: Dry Run Mode

Preview changes before applying them:

```bash
orderly organize my-folder --dry-run
```

Output:
```
🗂️  Orderly - File Organization Tool

[INFO] Target directory: my-folder
[WARN] Running in DRY RUN mode - no files will be modified
[INFO] Scanning directory: my-folder
[INFO] Scanned 8 files

File categories found:
  documents: 2 files
  images: 1 files
  videos: 1 files
  audio: 1 files
  
Planned operations: 8
[DRY RUN] move-rename: my-folder/Project Proposal.pdf -> my-folder/documents/project-proposal.pdf
[DRY RUN] move-rename: my-folder/Photo_Vacation.JPG -> my-folder/images/photo-vacation.jpg
...
```

## Example 4: Scan Before Organizing

Get a summary of what will be organized:

```bash
orderly scan ~/Downloads
```

Output:
```
🔍 Scanning directory...

File categories:
  documents: 45 files
  images: 23 files
  videos: 12 files
  audio: 8 files
  archives: 5 files
  code: 3 files

Operations needed: 96
  Move: 12
  Rename: 34
  Move + Rename: 50
```

## Example 5: Different Naming Conventions

### kebab-case (default)
```
My File Name.pdf → my-file-name.pdf
```

### snake_case
```yaml
namingConvention:
  type: snake_case
```
```
My File Name.pdf → my_file_name.pdf
```

### camelCase
```yaml
namingConvention:
  type: camelCase
```
```
My File Name.pdf → myFileName.pdf
```

### PascalCase
```yaml
namingConvention:
  type: PascalCase
```
```
My File Name.pdf → MyFileName.pdf
```

## Example 6: Organizing with Output Directory

Organize files to a different location:

```bash
orderly organize ./messy-folder -o ./organized-output
```

### Before
```
messy-folder/
├── file1.pdf
├── file2.jpg
└── file3.mp4
```

### After
```
messy-folder/      (unchanged)
├── file1.pdf
├── file2.jpg
└── file3.mp4

organized-output/  (new)
├── documents/
│   └── file1.pdf
├── images/
│   └── file2.jpg
└── videos/
    └── file3.mp4
```

## Example 7: Manifest Output

After organizing, Orderly generates detailed manifests:

### manifest.json
```json
{
  "generatedAt": "2025-10-19T18:56:28.070Z",
  "totalOperations": 8,
  "successful": 8,
  "failed": 0,
  "entries": [
    {
      "timestamp": "2025-10-19T18:56:28.070Z",
      "operation": {
        "type": "move-rename",
        "originalPath": "/tmp/demo/Project Proposal.pdf",
        "newPath": "/tmp/demo/documents/project-proposal.pdf",
        "reason": "Moving to documents and renaming to project-proposal.pdf"
      },
      "status": "success"
    }
  ]
}
```

### manifest.md
```markdown
# Orderly File Organization Manifest

**Generated:** 2025-10-19T18:56:28.070Z

**Total Operations:** 8
**Successful:** 8
**Failed:** 0

## Operations

### ✓ MOVE-RENAME
- **From:** `/tmp/demo/Project Proposal.pdf`
- **To:** `/tmp/demo/documents/project-proposal.pdf`
- **Reason:** Moving to documents and renaming to project-proposal.pdf
```

## Tips and Best Practices

1. **Always use dry-run first**: Preview changes before applying them
   ```bash
   orderly organize . --dry-run
   ```

2. **Use scan for quick overview**: Get a summary without seeing all operations
   ```bash
   orderly scan .
   ```

3. **Customize for your workflow**: Create project-specific configurations
   ```bash
   orderly init
   # Edit .orderly.yml to match your needs
   ```

4. **Review logs**: Check `.orderly/orderly.log` for detailed operation history

5. **Keep manifests**: The generated manifests provide a full audit trail

6. **Test with a copy**: When organizing important files, test on a copy first
   ```bash
   cp -r important-folder important-folder-backup
   orderly organize important-folder
   ```
