-- Migration: rename Prani → Plani in user-visible data
-- Run once after deploying the rebranded application.
-- Safe to run multiple times (WHERE clauses prevent double-replacement).

-- Tenants
UPDATE tenants
SET name = REPLACE(name, 'Prani', 'Plani')
WHERE name LIKE '%Prani%';

-- Events (events table has `name` and `notes`, no `description` column)
UPDATE events
SET name = REPLACE(name, 'Prani', 'Plani')
WHERE name LIKE '%Prani%';

UPDATE events
SET notes = REPLACE(notes, 'Prani', 'Plani')
WHERE notes LIKE '%Prani%';

-- Staff / users display names (column is `name`, not `full_name`)
UPDATE users
SET name = REPLACE(name, 'Prani', 'Plani')
WHERE name LIKE '%Prani%';

-- Notifications (column is `body`, not `message`)
UPDATE notifications
SET body = REPLACE(body, 'Prani', 'Plani')
WHERE body LIKE '%Prani%';

UPDATE notifications
SET title = REPLACE(title, 'Prani', 'Plani')
WHERE title LIKE '%Prani%';
