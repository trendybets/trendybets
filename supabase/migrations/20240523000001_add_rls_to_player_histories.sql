-- Enable Row Level Security on player_history table
ALTER TABLE public.player_history ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows the service role to perform all operations
CREATE POLICY "Service role can do all operations on player_history"
ON public.player_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create a policy that allows authenticated users to select data
CREATE POLICY "Authenticated users can view player_history"
ON public.player_history
FOR SELECT
TO authenticated
USING (true);

-- Create a policy that allows anonymous users to select data
CREATE POLICY "Anonymous users can view player_history"
ON public.player_history
FOR SELECT
TO anon
USING (true); 