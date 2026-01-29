# Plan de Automatización Completa - Autogram

## Objetivo
Convertir el sistema en un generador y publicador completamente automático de contenido para Instagram, con:
- Generación automática de prompts
- Generación automática de captions con Llama
- Generación automática de imágenes con Gemini
- Publicación automática en Instagram
- Cola de reintentos con Redis para publicaciones fallidas
- Configuración por intervalos desde .env
- Consideración de timezone para contenido contextual

## Arquitectura Propuesta

### 1. Sistema de Generación Automática de Contenido
**Archivo**: `server/automation/contentGenerator.ts`
- Genera prompts automáticamente basados en:
  - Hora del día (mañana, tarde, noche)
  - Día de la semana
  - Tendencias configurables
  - Temas rotativos
- Usa timezone configurado en .env para contexto temporal

### 2. Sistema de Orquestación
**Archivo**: `server/automation/orchestrator.ts`
- Coordina todo el flujo automático:
  1. Genera prompt automático
  2. Genera caption con Llama API
  3. Genera imagen(s) con Gemini
  4. Programa publicación
  5. Publica en Instagram
- Maneja errores de forma independiente (si falla una imagen, continúa con las demás)

### 3. Cola de Reintentos con Redis
**Archivo**: `server/automation/retryQueue.ts`
- Cola de publicaciones fallidas
- Reintentos exponenciales
- Persistencia en Redis
- Monitoreo de estado

### 4. Scheduler Mejorado
**Archivo**: `server/automation/scheduler.ts`
- Intervalo configurable desde .env
- Múltiples estrategias de publicación:
  - Intervalo fijo
  - Horarios específicos
  - Basado en engagement histórico

## Cambios en .env

```env
# Automation Settings
AUTO_GENERATION_ENABLED=true
AUTO_GENERATION_INTERVAL_MINUTES=60
AUTO_PUBLISH_ENABLED=true
TIMEZONE=America/Sao_Paulo

# Content Generation
CONTENT_THEMES=fitness,wellness,motivation,lifestyle
DAILY_POST_LIMIT=10

# Retry Settings
MAX_RETRY_ATTEMPTS=5
RETRY_DELAY_MINUTES=15

# Llama API (para captions)
LLAMA_API_URL=https://llama-3-8b-instruct.24hwww.workers.dev/
API_KEY=3c848f6060bbe5e7ec37dcd9ff74b465
```

## Estructura de Archivos Nueva

```
server/
├── automation/
│   ├── contentGenerator.ts    # Genera prompts automáticos
│   ├── orchestrator.ts         # Orquesta todo el flujo
│   ├── retryQueue.ts          # Cola de reintentos con Redis
│   ├── scheduler.ts           # Scheduler mejorado
│   └── themes/                # Temas de contenido
│       ├── fitness.ts
│       ├── wellness.ts
│       └── index.ts
├── services/
│   ├── gemini.ts              # Servicio de generación de imágenes
│   ├── llama.ts               # Servicio de generación de captions
│   └── instagram.ts           # Servicio de publicación
└── routes.ts                  # Rutas API (simplificadas)
```

## Flujo de Trabajo Automático

```
┌─────────────────────────────────────────────────────────────┐
│                    SCHEDULER (Cron/Interval)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              CONTENT GENERATOR (Orchestrator)                │
│  1. Genera prompt basado en hora/día/tema                   │
│  2. Genera caption con Llama API                            │
│  3. Genera imagen(es) con Gemini                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  STORAGE (Database)                          │
│  Guarda imagen con status 'scheduled'                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              PUBLISH SCHEDULER (BullMQ/Redis)                │
│  Publica en el momento programado                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │         │
                    ▼         ▼
            ┌──────────┐  ┌──────────┐
            │ SUCCESS  │  │  FAILED  │
            └──────────┘  └────┬─────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   RETRY QUEUE       │
                    │   (Redis BullMQ)    │
                    │   - Exponential     │
                    │   - Max 5 attempts  │
                    └─────────────────────┘
```

## Implementación por Fases

### Fase 1: Refactorización de Servicios ✅
- [x] Mover lógica de Gemini a `services/gemini.ts`
- [x] Mover lógica de Llama a `services/llama.ts`
- [x] Mover lógica de Instagram a `services/instagram.ts`

### Fase 2: Sistema de Generación Automática
- [ ] Crear `automation/contentGenerator.ts`
- [ ] Crear temas de contenido en `automation/themes/`
- [ ] Implementar lógica de selección basada en hora/día

### Fase 3: Orquestador
- [ ] Crear `automation/orchestrator.ts`
- [ ] Integrar generación de prompt → caption → imagen
- [ ] Manejo de errores independiente

### Fase 4: Cola de Reintentos
- [ ] Crear `automation/retryQueue.ts`
- [ ] Implementar reintentos exponenciales
- [ ] Integrar con BullMQ/Redis

### Fase 5: Scheduler Mejorado
- [ ] Crear `automation/scheduler.ts`
- [ ] Implementar intervalo configurable
- [ ] Integrar con orchestrator

### Fase 6: Integración y Testing
- [ ] Actualizar `server/index.ts`
- [ ] Actualizar variables de entorno
- [ ] Testing end-to-end
- [ ] Documentación

## Consideraciones Técnicas

### Manejo de Errores Independiente
Cada componente debe ser resiliente:
- Si falla generación de caption → usar prompt como caption
- Si falla generación de imagen → reintentar con prompt simplificado
- Si falla publicación → agregar a cola de reintentos

### Timezone
- Usar `TZ` de .env para determinar hora local
- Generar contenido contextual (ej: "Buenos días" en la mañana)

### Límites
- Respetar límite diario de generación
- Respetar rate limits de Instagram
- Implementar backoff exponencial

### Monitoreo
- Logs detallados de cada paso
- Métricas de éxito/fallo
- Dashboard de estado (opcional)
