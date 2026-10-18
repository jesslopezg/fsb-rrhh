-- Coordinates supplied from Google Maps place links, 2026-10-17.
update public.branches set latitude=case name when 'Bonita' then 32.507099 when 'Fiesta' then 32.5280451 when 'Alondras' then 32.4495993 when 'Libertad' then 32.5305457 end,
longitude=case name when 'Bonita' then -116.9817009 when 'Fiesta' then -117.0230734 when 'Alondras' then -117.0249373 when 'Libertad' then -117.0109763 end,
radius_m=100 where name in ('Bonita','Fiesta','Alondras','Libertad');
-- Update clock_event's 'in' branch after checking p_branch_id exists:
-- Reject p_accuracy > 100 meters.
-- Reject locations whose haversine distance from the selected branch is greater than radius_m.
-- Do not trust client-side distance validation. Implemented on live Supabase database.
