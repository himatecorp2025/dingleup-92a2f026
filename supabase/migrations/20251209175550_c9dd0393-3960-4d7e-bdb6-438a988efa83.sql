
-- Remove lootbox system completely

-- Drop lootbox tables
DROP TABLE IF EXISTS public.lootbox_instances CASCADE;
DROP TABLE IF EXISTS public.lootbox_activity_log CASCADE;
DROP TABLE IF EXISTS public.lootbox_daily_plan CASCADE;

-- Drop lootbox functions
DROP FUNCTION IF EXISTS public.expire_old_lootboxes() CASCADE;
DROP FUNCTION IF EXISTS public.generate_lootbox_daily_plan(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.open_lootbox_transaction(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_lootbox_instance(uuid, text, text) CASCADE;
