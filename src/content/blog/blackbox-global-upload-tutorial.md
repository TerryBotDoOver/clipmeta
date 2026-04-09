---
title: "How to Upload to Blackbox.global: Complete CSV Guide"
description: "Step-by-step guide to uploading stock footage to Blackbox.global using their CSV format. Covers required columns, categories, common errors, and how to export directly from ClipMeta."
date: "2026-03-21"
author: "ClipMeta Team"
tags: ["blackbox global", "stock footage", "CSV upload", "contributor guide"]
---

Blackbox.global has become one of the most contributor-friendly stock footage platforms available. The revenue share is competitive, the submission process is straightforward, and the platform actively works to place footage with buyers across multiple markets.

But the upload process trips up a lot of new contributors. The CSV format has specific requirements, the category list needs to match exactly, and a single formatting error can cause the whole batch to fail.

This guide walks you through the entire process from start to finish.

## What Is Blackbox.global?

Blackbox.global is a stock footage licensing platform that connects videographers with media buyers, broadcasters, and content teams. It focuses on high-quality footage and offers contributors a transparent royalty structure.

Unlike some platforms that require you to upload files one at a time through a web interface, Blackbox uses a batch CSV upload system. You upload your video files, then submit a CSV file that contains the metadata for each clip. This makes it efficient for contributors with large libraries.

## The Upload Process: Step by Step

### Step 1: Create a Contributor Account

If you have not already, go to Blackbox.global and sign up as a contributor. You will need to complete your profile and agree to their contributor agreement before you can submit footage.

### Step 2: Upload Your Video Files

In the contributor dashboard, you will see an upload section. Upload your footage files here. Blackbox accepts standard video formats including MP4, MOV, and MXF. Files should be high resolution, ideally 4K, with clean audio if applicable.

After uploading, each file will appear in your queue with its filename listed. Keep track of these exact filenames because they need to match your CSV exactly.

### Step 3: Prepare Your CSV File

This is where most contributors run into problems. The CSV has to be formatted correctly, with the exact column headers Blackbox expects.

Open a spreadsheet program (Excel, Google Sheets, or LibreOffice Calc) and create the following columns:

| Column | Description |
|--------|-------------|
| `filename` | Exact filename with extension, e.g., `DJI_0142.mp4` |
| `title` | Descriptive title, under 200 characters |
| `description` | 2 to 4 sentence description of the clip |
| `keywords` | Keywords separated by semicolons, e.g., `aerial;drone;city;urban` |
| `category` | Must match one of Blackbox's approved categories exactly |

### Step 4: Fill In Your Metadata

For each clip in your queue, fill in one row in the CSV. Be specific and accurate.

**Filename:** Copy the filename exactly as it appears in your upload queue, including the file extension. Even a small difference, like a space or different capitalization, will cause that row to fail.

**Title:** Write a clear, specific title. Include the subject, action, and location. "Aerial drone footage of golden wheat fields in Kansas during harvest season" is much better than "Farm drone shot."

**Description:** Write 2 to 4 sentences. Describe what is in the frame, the camera movement, the time of day, and any relevant context. Think about what a video editor or producer would want to know when searching for this type of footage.

**Keywords:** Use semicolons between keywords, not commas. Most contributors aim for 30 to 50 keywords. Cover the subject, action, setting, mood, and technical details. A field of wheat at harvest might include: `wheat;field;harvest;agriculture;farm;aerial;drone;summer;golden;crops;farming;Kansas;rural;landscape;sky`.

**Category:** This needs to match Blackbox's category list exactly. See the category overview below.

### Step 5: Save and Export as CSV

When your spreadsheet is complete, export it as a CSV file. In Excel: File > Save As > CSV (Comma delimited). In Google Sheets: File > Download > Comma-separated values.

### Step 6: Submit Your CSV

In your Blackbox contributor dashboard, find the CSV upload section and submit the file. The platform will validate each row against your uploaded files and flag any issues.

If the upload shows errors, read the error messages carefully. They will usually tell you which rows failed and why.

### Step 7: Wait for Review

Blackbox reviews submitted footage for quality and accuracy. This can take a few days. Once approved, your clips will be live on the platform and available for licensing.

## Blackbox Category Overview

Blackbox uses a defined category list. Submitting an invalid category name will cause your row to fail. The main categories include:

- **Nature and Wildlife** -- animals, plants, ecosystems, natural landscapes
- **Aerial and Drone** -- shots captured from aircraft or drones
- **Urban and City** -- cities, streets, architecture, public spaces
- **People and Lifestyle** -- everyday life, activities, social interactions
- **Business and Technology** -- offices, meetings, devices, digital concepts
- **Food and Beverage** -- cooking, dining, ingredients, restaurants
- **Sports and Action** -- athletics, outdoor sports, fitness, recreation
- **Travel and Tourism** -- destinations, landmarks, transportation
- **Abstract and Background** -- textures, patterns, visual effects
- **Medical and Health** -- healthcare, medicine, wellness
- **Education and Science** -- learning, research, laboratory settings
- **Arts and Entertainment** -- performances, creative work, culture

Always check the current category list in your Blackbox dashboard, as categories can be updated.

## Common Upload Errors and How to Fix Them

**"Filename not found"**
Your CSV filename does not match the uploaded file exactly. Check for extra spaces, different capitalization, or missing file extensions. Copy and paste the filename directly from the dashboard to avoid typos.

**"Invalid category"**
The category you entered does not match Blackbox's approved list. Copy the exact category name from their documentation.

**"Keywords formatting error"**
You used commas instead of semicolons to separate keywords. Find and replace all commas with semicolons in the keywords column.

**"Title too long"**
Your title exceeds the character limit. Trim it to under 200 characters.

**"CSV encoding error"**
Your file was saved with the wrong encoding. When saving, choose UTF-8 encoding. In Excel, use "Save As" and select "CSV UTF-8."

**Batch partially failing**
Some rows succeeded and others failed. The platform will show you which rows failed. Fix those rows and re-submit only the failed clips, or remove the successful ones from your CSV before re-submitting.

## How ClipMeta Exports in Blackbox Format

One of the reasons contributors use ClipMeta is the platform-specific export feature. When you finish generating and reviewing your metadata in ClipMeta, you can export directly in Blackbox's CSV format.

The export handles the column names, the semicolon-separated keyword formatting, and the file structure that Blackbox expects. You do not need to manually reformat anything.

The workflow looks like this:
1. Upload your clips to ClipMeta
2. AI generates titles, descriptions, and keywords from the actual video frames
3. Review and edit the metadata in ClipMeta's review interface
4. Export as "Blackbox CSV"
5. Upload the exported file directly to Blackbox

It removes the most error-prone part of the process, which is manually formatting and reformatting metadata for each platform.

---

## Frequently Asked Questions

**What video formats does Blackbox.global accept?**
Blackbox accepts MP4, MOV, MXF, and other common professional formats. Check their contributor documentation for the current list of accepted codecs and minimum resolution requirements.

**How many keywords should I include for Blackbox?**
Aim for 30 to 50 keywords. There is no benefit to using fewer. Keywords are semicolon-separated in the Blackbox CSV format.

**Can I upload the same footage to multiple platforms?**
Yes, most stock footage platforms allow non-exclusive submissions. You can upload the same clip to Blackbox, Shutterstock, Adobe Stock, and Pond5 simultaneously. Each platform has its own CSV format, so you will need a separate export for each.

**How long does Blackbox review take?**
Review times vary, but typically range from a few days to about a week for standard submissions. During high-volume periods it may take longer.

**What happens if my CSV has errors?**
The platform will validate your CSV and flag rows with errors. Those clips will not be published until the errors are corrected and the CSV is re-submitted.

**Do I need to include a description for every clip?**
Yes. Clips without descriptions may be deprioritized in search results. Write at least 2 sentences for each clip.

---

If you are uploading a batch of clips to Blackbox, ClipMeta can generate the metadata and export the correctly formatted CSV for you. [Try it free](https://clipmeta.app/sign-up) -- 3 clips per day, no credit card required.
