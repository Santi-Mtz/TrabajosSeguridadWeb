-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by BIGINT NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(group_id, user_id)
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open' NOT NULL,
    group_id BIGINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    assigned_to BIGINT REFERENCES public.users(id),
    created_by BIGINT NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_group_id ON public.tickets(group_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets(created_by);

-- Insert sample group data
INSERT INTO public.groups (name, description, created_by) VALUES 
('Grupo de Administración', 'Grupo para administradores del sistema', 1),
('Grupo de Desarrollo', 'Grupo para desarrolladores', 1),
('Grupo de Seguridad', 'Grupo para gestionar seguridad', 1)
ON CONFLICT DO NOTHING;

-- Add members to groups (user 1 to all groups)
INSERT INTO public.group_members (group_id, user_id) VALUES 
(1, 1),
(2, 1),
(3, 1),
(1, 2),
(2, 2),
(3, 3)
ON CONFLICT DO NOTHING;

-- Insert sample tickets
INSERT INTO public.tickets (title, description, status, group_id, assigned_to, created_by) VALUES
('Configurar BD', 'Configurar la base de datos Supabase', 'open', 1, 1, 1),
('Implementar UI', 'Implementar interfaz de usuario', 'in-progress', 2, 2, 1),
('Auditar seguridad', 'Realizar auditoría de seguridad del sistema', 'open', 3, 1, 1)
ON CONFLICT DO NOTHING;
