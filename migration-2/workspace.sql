BEGIN;

SET CONSTRAINTS ALL DEFERRED;

INSERT INTO public."Workspace" VALUES ('47309c56-56ee-47af-9782-bbd2c6557136', 'Jack''s Statuspage', 'jackcrane', '123b176f-e41f-4488-8a1c-3f0122ffa49d', NULL, true, '2024-06-09 03:40:10', '2024-06-21 14:46:25.651');

\i link.sql


COMMIT;