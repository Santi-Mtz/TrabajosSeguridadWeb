# Guía: Restaurar Permisos del Super Admin

## Problema
El usuario `admin@seguridadweb.com` no tenía permisos registrados en la tabla `user_permissions`, por lo que el JWT generado no incluía permisos y era rechazado.

## Solución Implementada

### 1. Cambios en Frontend (✅ Completado)
Se han añadido protecciones adicionales en `user.component.ts`:
- El super admin `admin@seguridadweb.com` ahora está protegido junto con `superadmin@seguridadweb.com`
- No se puede eliminar ni desactivar estas cuentas
- No se puede remover permisos de estas cuentas
- Nueva propiedad: `securityAdminEmail = 'admin@seguridadweb.com'`
- Nuevos métodos: `isProtectedAdminAccount()` e `isProtectedAdminUser()` para validación

### 2. Restauración de Permisos en Base de Datos
Necesitas ejecutar el script `restore_superadmin_permissions.sql` en Supabase:

**Pasos:**
1. Accede a [Supabase Dashboard](https://supabase.com) o tu instancia local
2. Abre la pestaña **SQL Editor**
3. Crea una nueva query  
4. Copia y pega el contenido de `restore_superadmin_permissions.sql`
5. Ejecuta la query (botón Run)

**Lo que hace el script:**
- Inserta todos los 22 permisos en la tabla `permissions` (si no existen)
- Limpia permisos viejos para los dos super admins
- Asigna TODOS los permisos a:
  - `admin@seguridadweb.com` (ID 4)
  - `superadmin@seguridadweb.com` (ID 5)

### 3. Verificación
Después de ejecutar el script, verifica en la tabla `user_permissions`:
```sql
SELECT u.id, u.email, COUNT(p.id) as permisos_totales
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
LEFT JOIN permissions p ON up.permission_id = p.id
WHERE u.email IN ('admin@seguridadweb.com', 'superadmin@seguridadweb.com')
GROUP BY u.id, u.email;
```

Ambos usuarios deben tener **22 permisos totales**.

### 4. Política de Protección
Con estos cambios:
- ✅ Estos dos usuarios NO pueden perder sus permisos via UI
- ✅ NO pueden ser deletedos ni desactivados
- ✅ El frontend bloquea cualquier intento de modificación
- ✅ El backend (API Gateway) valida que tengan permisos en el JWT

## Archivos Modificados
- `src/app/pages/user/user.component.ts` - Added protection methods
- `restore_superadmin_permissions.sql` - SQL script to fix DB permissions

## Próximos Pasos (Recomendado)
1. Ejecuta el script SQL en Supabase
2. Reinicia el navegador (Ctrl+R)
3. Intenta acceder a la sección de usuarios
4. Verifica que AMBOS super admins están protegidos (no puedes remover permisos)
