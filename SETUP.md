# Estado y despliegue — FSB RRHH

## Implementado en código
- React + TypeScript, inicio de sesión Supabase Auth.
- Roles Gerencia y empleada, perfiles y RLS.
- Entrada/salida con hora del servidor; GPS solicitado puntualmente, **sin geocerca validada todavía**.
- Turnos y ventanas comisionables por turno.
- Traslados autorizados por Gerencia, sin nueva checada.
- Solicitudes de corrección y resolución con auditoría.
- Panel de asistencia, CSV y enlace a Google Sheets.

## Activar
1. Crear proyecto en Supabase y ejecutar `supabase/schema.sql` en SQL Editor.
2. Crear manualmente cuentas en Authentication > Users, sin registro público. Insertar perfil en `public.profiles` con el UUID de Auth. El primer gerente requiere rol `manager` mediante SQL Editor.
3. Configurar variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (clave publicable, **nunca service_role**) en Vercel y localmente.
4. Importar este repo a Vercel. Build `npm run build`, salida `dist`. Agregar URL del sitio a Authentication > URL Configuration de Supabase.
5. Crear datos de prueba, validar roles y permisos antes de empleados reales.

## Pendiente antes de producción
- Sincronización automática con [Google Sheets FSB](https://docs.google.com/spreadsheets/d/1fYpJnYqCMbogmA4mIsdDgdZDPSscUe31ny3QqqvfGps/edit): actualmente la hoja existe pero **no recibe registros automáticamente**.
- GPS geocercas de las cuatro sucursales, validación IP y modo kiosco seguro.
- Cola offline PWA con conciliación.
- Alertas de 5 minutos, salidas tardías, extensiones auditadas, reglas comisionables por tipo de turno.
- Gestión de cuentas de empleados desde Gerencia y tablero semanal completo.
- Revisión legal y privacidad.

**Esta es una primera versión de desarrollo, no lista para producción ni nómina.**
