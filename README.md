# FSB RRHH

Sistema de asistencia para sucursales Fiesta, Bonita, Libertad y Alondras.

## Modulo 1
- Usuarios individuales: acceso desde dispositivo compartido o celular personal autenticado.
- Registro de entrada y salida con hora real y 5 minutos de tolerancia administrativa.
- Traslados entre sucursales autorizados por Gerencia sin abrir otra jornada.
- Extensiones de horario: registrar salida real y notificar a Gerencia.
- Ventanas comisionables por tipo de turno y ajustes de Gerencia, independientes de la asistencia.
- Solicitudes de correccion de checadas, con auditoria.
- Ubicacion puntual GPS o IP de sucursal y contingencias offline pendientes de revision.

## Reportes de Gerencia + Google Sheets
Supabase es la fuente oficial de datos. Google Sheets recibira una copia de reportes a traves de una integracion de servidor con credenciales protegidas (no desde el navegador).

Hojas propuestas:
1. `Asistencia`: fecha, ID empleada, nombre, sucursal inicio/fin, entrada, salida, horas reales, turno, retardo administrativo, estado de validacion.
2. `Movimientos`: traslados, extensiones, autor y marcas de tiempo.
3. `Comisionable`: empleada, fecha, tipo turno, inicio/fin de ventana comisionable y modificaciones.
4. `Incidencias`: checadas omitidas, registros offline, solicitudes y resoluciones.
5. `Resumen semanal`: asistencia por empleada y sucursal, diferencias de horario, movimientos y pendientes.

Reglas de integracion: idempotencia por identificador, reintentos, registro de ultimo sincronizado, correcciones propagadas sin duplicar filas, exclusion de IP/GPS exactos, contrasenas y PIN. No se usara Google Sheets como fuente de autenticacion ni de verdad para la asistencia.

## Siguientes pasos tecnicos
React + TypeScript, Supabase (Auth, Postgres, RLS, funciones seguras), Vercel/PWA, exportaciones CSV/PDF y sincronizacion automatica con Google Sheets. Hace falta vincular el proyecto Supabase y una hoja de Google Sheets con permisos apropiados antes de activar el flujo real.
