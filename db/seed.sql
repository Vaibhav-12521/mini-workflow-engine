-- Synthetic seed data (no real people or data). Idempotent: fixed ids + ON CONFLICT DO NOTHING.
-- Run after migrate (lookup tables must exist). Timestamps are relative to now() so the UI looks fresh.

INSERT INTO tasks (id, title, description, priority, status, version, created_at, updated_at) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Set up CI pipeline for the API', 'Run lint, typecheck and tests on every pull request.', 'high', 'in_progress', 2, now() - interval '50 hours', now() - interval '48 hours'),
  ('00000000-0000-4000-8000-000000000002', 'Write onboarding guide for new volunteers', 'Cover tools access, code of conduct and first-week checklist.', 'medium', 'todo', 1, now() - interval '46 hours', now() - interval '46 hours'),
  ('00000000-0000-4000-8000-000000000003', 'Fix pagination off-by-one on reports page', 'Last page shows an empty table when total is a multiple of page size.', 'high', 'done', 3, now() - interval '44 hours', now() - interval '40 hours'),
  ('00000000-0000-4000-8000-000000000004', 'Design donation receipt email', 'Plain-text fallback plus HTML version with the NGO logo.', 'low', 'todo', 1, now() - interval '40 hours', now() - interval '40 hours'),
  ('00000000-0000-4000-8000-000000000005', 'Migrate tree-plantation survey data', 'Import 2025 survey CSV into the new schema and verify counts.', 'medium', 'in_progress', 2, now() - interval '36 hours', now() - interval '34 hours'),
  ('00000000-0000-4000-8000-000000000006', 'Add search to volunteer directory', 'Match on name and city; combine with district filter.', 'medium', 'todo', 1, now() - interval '30 hours', now() - interval '30 hours'),
  ('00000000-0000-4000-8000-000000000007', 'Review accessibility of the signup form', 'Keyboard order, labels, error announcements, contrast.', 'high', 'todo', 1, now() - interval '26 hours', now() - interval '26 hours'),
  ('00000000-0000-4000-8000-000000000008', 'Archive old campaign pages', 'Move 2023 campaign pages to the archive section.', 'low', 'done', 3, now() - interval '22 hours', now() - interval '18 hours'),
  ('00000000-0000-4000-8000-000000000009', 'Prepare monthly impact report', 'Trees planted, volunteers active, funds utilised.', 'medium', 'in_progress', 2, now() - interval '18 hours', now() - interval '16 hours'),
  ('00000000-0000-4000-8000-000000000010', 'Rotate database credentials', 'Synthetic task: update secrets in the vault and redeploy.', 'high', 'done', 3, now() - interval '12 hours', now() - interval '8 hours'),
  ('00000000-0000-4000-8000-000000000011', 'Clean up unused image assets', 'Remove images not referenced by any page.', 'low', 'todo', 1, now() - interval '6 hours', now() - interval '6 hours'),
  ('00000000-0000-4000-8000-000000000012', 'Plan river clean-up drive logistics', 'Transport, gloves, bags and a sign-in sheet for 40 volunteers.', 'medium', 'todo', 1, now() - interval '2 hours', now() - interval '2 hours')
ON CONFLICT (id) DO NOTHING;

-- History rows only for seed tasks that have none yet (keeps re-runs idempotent).
INSERT INTO task_activities (task_id, action, field, old_value, new_value, created_at)
SELECT v.task_id::uuid, v.action, v.field, v.old_value, v.new_value, v.created_at
FROM (VALUES
  ('00000000-0000-4000-8000-000000000001', 'created', NULL, NULL, 'Set up CI pipeline for the API', now() - interval '50 hours'),
  ('00000000-0000-4000-8000-000000000001', 'status_changed', 'status', 'todo', 'in_progress', now() - interval '48 hours'),
  ('00000000-0000-4000-8000-000000000002', 'created', NULL, NULL, 'Write onboarding guide for new volunteers', now() - interval '46 hours'),
  ('00000000-0000-4000-8000-000000000003', 'created', NULL, NULL, 'Fix pagination off-by-one on reports page', now() - interval '44 hours'),
  ('00000000-0000-4000-8000-000000000003', 'status_changed', 'status', 'todo', 'in_progress', now() - interval '42 hours'),
  ('00000000-0000-4000-8000-000000000003', 'status_changed', 'status', 'in_progress', 'done', now() - interval '40 hours'),
  ('00000000-0000-4000-8000-000000000004', 'created', NULL, NULL, 'Design donation receipt email', now() - interval '40 hours'),
  ('00000000-0000-4000-8000-000000000005', 'created', NULL, NULL, 'Migrate tree-plantation survey data', now() - interval '36 hours'),
  ('00000000-0000-4000-8000-000000000005', 'status_changed', 'status', 'todo', 'in_progress', now() - interval '34 hours'),
  ('00000000-0000-4000-8000-000000000006', 'created', NULL, NULL, 'Add search to volunteer directory', now() - interval '30 hours'),
  ('00000000-0000-4000-8000-000000000007', 'created', NULL, NULL, 'Review accessibility of the signup form', now() - interval '26 hours'),
  ('00000000-0000-4000-8000-000000000008', 'created', NULL, NULL, 'Archive old campaign pages', now() - interval '22 hours'),
  ('00000000-0000-4000-8000-000000000008', 'status_changed', 'status', 'todo', 'in_progress', now() - interval '20 hours'),
  ('00000000-0000-4000-8000-000000000008', 'status_changed', 'status', 'in_progress', 'done', now() - interval '18 hours'),
  ('00000000-0000-4000-8000-000000000009', 'created', NULL, NULL, 'Prepare monthly impact report', now() - interval '18 hours'),
  ('00000000-0000-4000-8000-000000000009', 'status_changed', 'status', 'todo', 'in_progress', now() - interval '16 hours'),
  ('00000000-0000-4000-8000-000000000010', 'created', NULL, NULL, 'Rotate database credentials', now() - interval '12 hours'),
  ('00000000-0000-4000-8000-000000000010', 'status_changed', 'status', 'todo', 'in_progress', now() - interval '10 hours'),
  ('00000000-0000-4000-8000-000000000010', 'status_changed', 'status', 'in_progress', 'done', now() - interval '8 hours'),
  ('00000000-0000-4000-8000-000000000011', 'created', NULL, NULL, 'Clean up unused image assets', now() - interval '6 hours'),
  ('00000000-0000-4000-8000-000000000012', 'created', NULL, NULL, 'Plan river clean-up drive logistics', now() - interval '2 hours')
) AS v(task_id, action, field, old_value, new_value, created_at)
WHERE NOT EXISTS (SELECT 1 FROM task_activities a WHERE a.task_id = v.task_id::uuid);
