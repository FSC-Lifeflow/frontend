-- Simple version: Just add the column with default value
ALTER TABLE users ADD COLUMN activity_sharing BOOLEAN DEFAULT TRUE;
