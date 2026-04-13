-- Restaurar permisos completos para el super admin de Seguridad Web
-- Este script asegura que admin@seguridadweb.com SIEMPRE tenga todos los permisos

-- Primero, asegurarse de que todos los permisos existan en la tabla permissions
INSERT INTO permissions (code, description) VALUES
  ('ticket:add', 'Crear tickets'),
  ('ticket:view', 'Ver tickets'),
  ('ticket:edit', 'Editar ticket completo'),
  ('ticket:edit:status', 'Cambiar estado de ticket'),
  ('ticket:edit:comment', 'Comentar ticket'),
  ('ticket:edit:priority', 'Cambiar prioridad de ticket'),
  ('ticket:edit:deadline', 'Cambiar fecha limite de ticket'),
  ('ticket:edit:assign', 'Reasignar ticket'),
  ('ticket:delete', 'Eliminar tickets'),
  ('group:add', 'Crear grupos'),
  ('group:view', 'Ver grupos'),
  ('group:edit', 'Editar grupos'),
  ('group:remove', 'Eliminar grupos'),
  ('group:add:members', 'Agregar miembros a grupos'),
  ('group:remove:members', 'Remover miembros de grupos'),
  ('user:add', 'Crear usuarios'),
  ('user:view:all', 'Ver todos los usuarios'),
  ('user:edit', 'Editar usuarios'),
  ('user:remove', 'Eliminar usuarios'),
  ('user:edit:permissions', 'Administrar permisos de usuario'),
  ('user:deactivate', 'Desactivar usuarios'),
  ('user:activate', 'Activar usuarios')
ON CONFLICT (code) DO NOTHING;

-- Obtener IDs de usuarios super admin
WITH super_admins AS (
  SELECT id FROM users WHERE email IN ('admin@seguridadweb.com', 'superadmin@seguridadweb.com')
)
-- Eliminar permisos existentes para limpiar
DELETE FROM user_permissions 
WHERE user_id IN (SELECT id FROM super_admins);

-- Asignar TODOS los permisos a los super admins
INSERT INTO user_permissions (user_id, permission_id)
SELECT 
  u.id,
  p.id
FROM users u
CROSS JOIN permissions p
WHERE u.email IN ('admin@seguridadweb.com', 'superadmin@seguridadweb.com')
ON CONFLICT DO NOTHING;

-- Verificación: mostrar permisos asignados
SELECT u.id, u.username, u.email, COUNT(p.id) as total_permisos
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
LEFT JOIN permissions p ON up.permission_id = p.id
WHERE u.email IN ('admin@seguridadweb.com', 'superadmin@seguridadweb.com')
GROUP BY u.id, u.username, u.email
ORDER BY u.id;
