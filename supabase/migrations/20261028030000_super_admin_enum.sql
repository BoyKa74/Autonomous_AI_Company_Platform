-- Add the platform-owner role. Keep this in its own migration so the new enum
-- value is committed before later migrations use it.
alter type public.profile_role add value if not exists 'super_admin';
