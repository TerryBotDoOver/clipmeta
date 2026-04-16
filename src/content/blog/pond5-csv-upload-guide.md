---
title: "How to Upload to Pond5: CSV Guide for Stock Footage Contributors"
description: "Complete step-by-step guide to Pond5 CSV uploads for stock footage contributors, covering format requirements, fields, common errors, and bulk tips."
date: "2026-04-11"
author: "ClipMeta Team"
tags: ["Pond5 upload", "CSV upload guide", "stock footage upload", "Pond5 metadata", "bulk upload", "stock contributor"]
---

## Why Use CSV Uploads on Pond5

If you are uploading more than a handful of clips to Pond5, the web form is painfully slow. You fill in the same fields over and over, risk inconsistent metadata, and lose time that should be spent shooting or editing.

Pond5 supports CSV-based metadata uploads that let you prepare all your titles, descriptions, keywords, and settings in a spreadsheet, then apply them to your clips in one batch. For contributors uploading 10, 50, or 500 clips at a time, this is the only workflow that makes sense.

This guide walks through the CSV process step by step -- the format, the fields, the gotchas, and the tricks that save you time.

## The Upload Workflow Overview

The CSV workflow has three stages:

1. **Upload your video files** through the Pond5 contributor dashboard (FTP or web upload)
2. **Wait for processing** -- Pond5 encodes your clips and generates previews
3. **Apply metadata via CSV** -- upload a CSV file that maps metadata to each clip by filename

The CSV does not upload the video files themselves. It only applies metadata to files that are already in your Pond5 account and waiting to be published.

## CSV Format Requirements

Pond5 expects a standard CSV file with these technical requirements:

- **Encoding:** UTF-8 (this matters -- non-UTF-8 encoding causes special characters to break)
- **Delimiter:** Comma-separated
- **Header row:** Required -- the first row must contain column names exactly as Pond5 expects them
- **File extension:** .csv

If you are working in Excel, save as "CSV UTF-8 (Comma delimited)" specifically. The regular CSV option in Excel uses a different encoding that can corrupt accented characters and special symbols.

Google Sheets exports UTF-8 by default, so File > Download > CSV works without extra steps.

## Required and Optional Fields

### Required Fields

These fields must be present and filled in for every row, or the CSV will be rejected:

| Field Name | Description | Requirements |
|---|---|---|
| **Filename** | The exact filename of your uploaded clip | Must match the file in your Pond5 account exactly, including extension (e.g., DJI_0234.mp4) |
| **Description** | Title/description of the clip | 5-200 characters. This is what buyers see as the clip title |
| **Keywords** | Comma-separated keyword list | 5-50 keywords, each 2-30 characters. Separate with commas inside the field |
| **Category** | Pond5 content category | Must match a valid Pond5 category exactly (see category list below) |

### Optional but Recommended Fields

These fields are not strictly required but significantly affect discoverability and sales:

| Field Name | Description | Notes |
|---|---|---|
| **Editorial** | Whether the clip is editorial-only | "yes" or "no" -- defaults to "no" if omitted |
| **Model Release** | Model release status | "yes," "no," or "not applicable" |
| **Property Release** | Property release status | "yes," "no," or "not applicable" |
| **Location** | Where the footage was shot | Free text, but be specific (city, state/country) |
| **FPS** | Frames per second | Numeric value (24, 30, 60, etc.) |
| **Resolution** | Video resolution | e.g., "3840x2160" or "1920x1080" |
| **Codec** | Video codec | e.g., "H.264," "ProRes" |
| **Price** | Your suggested price | Numeric value in USD. If omitted, Pond5 assigns a default |

### The Keywords Field Format

The keywords field is where most CSV errors happen. Inside a single CSV cell, your keywords are separated by commas. But since the CSV file itself uses commas as delimiters, the entire keywords field must be wrapped in double quotes.

**Correct CSV row:**
```
DJI_0234.mp4,"Aerial view of mountain lake at sunrise","aerial,mountain,lake,sunrise,drone,landscape,nature,4K,morning,reflection",Landscapes/Nature
```

If you are building your CSV in a spreadsheet application, you generally do not need to worry about the quoting -- the application handles it on export. The problem occurs when people hand-edit CSV files in a text editor.

## Valid Pond5 Categories

Pond5 requires exact category names. The main categories for video footage include:

- Aerial/Drone
- Animals/Wildlife
- Arts/Abstract
- Business/Finance
- Celebrations/Holidays
- Education
- Food/Drink
- Health/Medical
- Industrial/Technology
- Landscapes/Nature
- Lifestyle/People
- News/Events
- Sports/Recreation
- Transportation
- Travel/Vacation
- Urban/Cities
- Underwater
- Weather/Climate

Use the exact format including the slash. "Nature" alone will be rejected -- it must be "Landscapes/Nature" or whichever compound name Pond5 expects. Check the Pond5 contributor documentation for the most current list, as categories occasionally get updated.

## Step-by-Step CSV Upload Process

### Step 1: Upload Your Video Files

Log into your Pond5 contributor account and upload your video files using either the web uploader or FTP. Wait for Pond5 to finish processing all files -- you will see them in your "Unfinished Items" section with a status of "Awaiting Metadata."

### Step 2: Prepare Your CSV

Create a spreadsheet with the required columns as headers in the first row. Fill in one row per clip. Double-check that:

- Every filename matches exactly (case-sensitive)
- Every clip has at least 5 keywords
- Category names match the valid list exactly
- Descriptions are between 5 and 200 characters

### Step 3: Export as UTF-8 CSV

Save or export your spreadsheet as a UTF-8 CSV file. Name it something descriptive like "pond5_upload_april_2026.csv."

### Step 4: Upload the CSV

In the Pond5 contributor dashboard, navigate to your unfinished items. Look for the "Import CSV" or "Apply Metadata" option. Select your CSV file and upload it.

### Step 5: Review and Publish

Pond5 will show you a preview of the metadata it is about to apply. Review it carefully. Check that keywords parsed correctly (this is where quoting errors become visible). If everything looks right, confirm and publish.

## Common CSV Errors and How to Fix Them

### "Filename not found"

Your CSV references a filename that does not exist in your Pond5 account. Common causes:
- Typo in the filename
- Case mismatch (DJI_0234.MP4 vs DJI_0234.mp4)
- File has not finished processing yet
- You renamed the file after upload

**Fix:** Compare your CSV filenames against the exact filenames shown in your Pond5 dashboard.

### Keywords Not Parsing Correctly

Symptoms: all your keywords appear as a single long keyword, or the CSV fails to parse entirely.

**Fix:** Make sure your keywords field is properly quoted in the CSV. If editing manually, wrap the keyword list in double quotes. If using a spreadsheet, make sure you are listing keywords as comma-separated values within a single cell, not across multiple cells.

### "Invalid Category"

The category name in your CSV does not match the expected values.

**Fix:** Copy the exact category name from the documentation. Do not abbreviate or modify it.

### Special Character Errors

Accented characters, curly quotes, or other special characters appearing as garbled text.

**Fix:** Re-export your CSV with explicit UTF-8 encoding. In Excel, use "CSV UTF-8 (Comma delimited)" from the Save As menu.

### Blank Rows Causing Errors

Empty rows at the bottom of your CSV (common when deleting rows in Excel without fully clearing them) can cause parsing issues.

**Fix:** Open the CSV in a text editor and delete any blank lines at the end of the file.

## Tips for Efficient Bulk Uploads

### Use a Template

Create a CSV template with all the required headers already in place. Start every upload batch from this template to avoid missing columns or misspelling header names.

### Batch by Category and Location

If you shot 50 clips at the same location in the same category, set up your CSV with those common values filled in for all rows, then customize the per-clip fields (description, specific keywords). This cuts the per-clip metadata time significantly.

### Automate with ClipMeta

For contributors who regularly upload in bulk, ClipMeta can generate Pond5-compatible CSVs directly from your footage files. It handles the formatting, keyword generation, and category mapping so you skip the spreadsheet step entirely. The output CSV is ready to upload to Pond5 without manual reformatting.

### Quality-Check with a Small Batch First

Before uploading a 200-row CSV, test with 5 clips first. Confirm the metadata applies correctly, keywords parse properly, and categories are accepted. Fixing a 5-row CSV is fast. Debugging a 200-row one is not.

### Keep a Local Archive

Save a copy of every CSV you upload. If you ever need to re-upload or reference past metadata, having the original CSV saves hours of re-keywording.

## CSV Template Example

Here is a minimal working template to get you started:

```
Filename,Description,Keywords,Category,Editorial,Location
DJI_0234.mp4,"Aerial drone shot of mountain lake at sunrise with fog","aerial,drone,mountain,lake,sunrise,fog,landscape,nature,4K,morning,calm,reflection,water,scenic,cinematic",Landscapes/Nature,no,"Colorado, USA"
DJI_0235.mp4,"Close-up of wildflowers in alpine meadow with bees","wildflowers,alpine,meadow,bees,pollination,nature,close-up,macro,summer,colorful,botanical,garden,flora",Landscapes/Nature,no,"Colorado, USA"
```

Copy this structure, replace with your own data, and you have a working Pond5 CSV.

## Final Notes

The CSV workflow takes a bit of setup the first time, but it pays off immediately on your second upload. The time savings compound with every batch, and the consistency of your metadata improves because you can review everything in one spreadsheet before publishing.

Getting the format right is the hardest part. Once you have a working template and a reliable export process, bulk uploading to Pond5 becomes a 5-minute task instead of an hour-long grind.
