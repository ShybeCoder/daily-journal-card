ALTER TABLE routine_items ADD COLUMN behavior TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE routine_items ADD COLUMN interval_days INTEGER NOT NULL DEFAULT 0;
