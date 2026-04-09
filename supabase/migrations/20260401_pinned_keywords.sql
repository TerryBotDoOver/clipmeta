-- Add pinned_keywords column to projects table
-- These keywords are always prepended to AI-generated keywords for every clip in the project
ALTER TABLE projects ADD COLUMN pinned_keywords TEXT DEFAULT NULL;
