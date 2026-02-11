# Sistema de Limpieza Automática de Imágenes

## Descripción

Este proyecto implementa un sistema automático de limpieza de imágenes generadas para liberar espacio en el disco. Las imágenes más antiguas de 3 días son eliminadas automáticamente.

## Características

### 🔄 **Limpieza Automática con Redis**
- Si Redis está disponible, se programa una limpieza diaria a las 2:00 AM
- Utiliza BullMQ para gestionar las tareas de limpieza
- Reintento automático en caso de fallos

### 🚀 **Limpieza al Inicio**
- Siempre se ejecuta una limpieza al iniciar el servidor
- También se ejecuta al cargar el frontend (si el usuario está autenticado)

### 🛡️ **Seguridad**
- Solo elimina imágenes que no están registradas en la base de datos
- Verifica la fecha de modificación del archivo (más de 3 días)
- Manejo robusto de errores

## Configuración

### Variables de Entorno
```bash
REDIS_URL=redis://redis:6379  # URL de Redis (opcional)
```

### Personalización
Para cambiar el número de días que se conservan las imágenes, modifica esta constante en `server/services/imageCleanup.ts`:

```typescript
const DAYS_TO_KEEP = 3; // Cambiar este valor
```

## Endpoints API

### Limpiar Imágenes Manualmente
```http
POST /api/cleanup/images
Authorization: Bearer <token>
```

### Ver Estado del Servicio
```http
GET /api/cleanup/status
Authorization: Bearer <token>
```

Respuesta:
```json
{
  "redisAvailable": true,
  "message": "Scheduled cleanup enabled (daily at 2 AM)"
}
```

## Implementación

### Archivos Principales

1. **`server/services/imageCleanup.ts`** - Servicio principal de limpieza
2. **`client/src/hooks/use-image-cleanup.ts`** - Hook para limpieza en frontend
3. **`server/routes.ts`** - Endpoints API y inicialización

### Flujo de Trabajo

1. **Inicio del Servidor**: 
   - Inicializa el servicio de limpieza
   - Intenta conectar a Redis
   - Ejecuta limpieza inmediata

2. **Con Redis Disponible**:
   - Programa tarea diaria a las 2:00 AM
   - Usa BullMQ para gestión de colas

3. **Sin Redis**:
   - Solo ejecuta limpieza al inicio
   - Funciona completamente sin dependencias externas

4. **Inicio del Frontend**:
   - Ejecuta limpieza adicional después de 2 segundos
   - Solo si el usuario está autenticado

## Monitoreo

### Logs
El sistema genera logs detallados:
```
🧹 ImageCleanupService: Starting image cleanup...
🗑️  Deleted old image: old_image.png (25.43 KB)
✅ ImageCleanupService: Cleanup completed. Deleted 2 files, freed 1.75 MB
```

### Verificación Manual
Para verificar qué archivos serían eliminados:

1. Revisa el directorio `client/public/generated_images/`
2. Los archivos con más de 3 días de antigüedad que no están en la BD serán eliminados
3. Usa el endpoint `/api/cleanup/status` para verificar el estado

## Troubleshooting

### Problemas Comunes

1. **Redis no disponible**: El sistema funcionará igualmente, pero sin programación automática
2. **Permisos de archivo**: Asegúrate que el servidor tiene permisos de escritura
3. **Base de datos desincronizada**: Las imágenes en BD nunca serán eliminadas

### Depuración

Para habilitar logs detallados, el sistema ya incluye console.log para todas las operaciones importantes.

## Ejemplo de Uso

```bash
# Iniciar servidor (se ejecuta limpieza automática)
npm run dev

# Verificar estado
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/cleanup/status

# Limpiar manualmente
curl -X POST -H "Authorization: Bearer <token>" http://localhost:5000/api/cleanup/images
```

## Notas Importantes

- Las imágenes referenciadas en la base de datos NUNCA son eliminadas
- El sistema es completamente seguro y no afecta el funcionamiento normal
- Funciona tanto en desarrollo como en producción
- Compatible con Docker y entornos sin Redis
