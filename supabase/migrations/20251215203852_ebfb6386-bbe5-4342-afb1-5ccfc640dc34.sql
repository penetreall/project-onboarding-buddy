-- Create ice_wall_users table for authentication
CREATE TABLE public.ice_wall_users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ice_wall_users ENABLE ROW LEVEL SECURITY;

-- Create policy for reading (service role only for auth)
CREATE POLICY "Service role can read users"
ON public.ice_wall_users
FOR SELECT
USING (true);

-- Insert default devian user (password: solitude - using bcrypt hash)
INSERT INTO public.ice_wall_users (username, password_hash, role)
VALUES ('devian', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin');