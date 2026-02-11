# Comprehensive Refactoring Plan - AutoGram

## Executive Summary

This document outlines a complete refactoring of the AutoGram system to resolve critical architectural issues, eliminate duplication, and establish a clean, maintainable codebase.

## Critical Issues Identified

### 1. Dual Storage Systems (CRITICAL)
**Problem**: The system uses both Drizzle ORM and Prisma simultaneously, causing:
- Inconsistent data access patterns
- Type mismatches between storage layers
- Maintenance overhead
- Potential data integrity issues

**Current State**:
- [`server/storage.ts`](../server/storage.ts) - Drizzle ORM implementation
- [`server/storage-prisma.ts`](../server/storage-prisma.ts) - Prisma implementation
- [`server/db.ts`](../server/db.ts) - Drizzle database connection
- [`server/prisma.ts`](../server/prisma.ts) - Prisma client

**Impact**: Files import from different storage implementations:
- [`server/index.ts`](../server/index.ts:4) imports from `storage-prisma`
- [`server/routes.ts`](../server/routes.ts:3) imports from `storage`
- [`server/scheduler.ts`](../server/scheduler.ts:1) imports from `storage`
- [`server/automation/orchestrator.ts`](../server/automation/orchestrator.ts:6) imports from `storage`

### 2. Duplicate Service Implementations (HIGH)
**Problem**: Instagram service exists in two locations with different implementations:
- [`server/instagram.ts`](../server/instagram.ts) - Original implementation
- [`server/services/instagram.ts`](../server/services/instagram.ts) - Newer service class

**Impact**: Inconsistent behavior, confusion about which to use, potential bugs.

### 3. Scheduler Architecture Confusion (HIGH)
**Problem**: Multiple scheduler implementations exist:
- [`server/scheduler.ts`](../server/scheduler.ts) - Simple setInterval scheduler
- [`server/scheduler/JobScheduler.ts`](../server/scheduler/JobScheduler.ts) - Bree-based scheduler
- [`server/scheduler/SimpleScheduler.ts`](../server/scheduler/SimpleScheduler.ts) - Another simple scheduler
- [`server/scheduler/BreeScheduler.ts`](../server/scheduler/BreeScheduler.ts) - Bree wrapper

**Impact**: Unclear which scheduler is active, potential conflicts, maintenance complexity.

### 4. Type Inconsistencies (MEDIUM)
**Problem**: Different enum values for ImageStatus:
- Drizzle: `'pending' | 'scheduled' | 'published' | 'failed'` (lowercase)
- Prisma: `'PENDING' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED'` (UPPERCASE)

**Impact**: Type errors, runtime failures when converting between systems.

### 5. Missing Storage Methods (HIGH)
**Problem**: Automation system calls methods that don't exist:
- [`server/automation/contentGenerator.ts:53`](../server/automation/contentGenerator.ts:53) calls `storage.getInfluencerProfile()`
- [`server/automation/contentGenerator.ts:56`](../server/automation/contentGenerator.ts:56) calls `storage.getRecentPublishedImages(5)`

**Impact**: Runtime errors when automation runs.

### 6. Incomplete Automation Integration (MEDIUM)
**Problem**: Automation system exists but isn't fully integrated:
- ContentGenerator, Orchestrator, RetryQueue exist
- Not properly initialized in main server
- Missing configuration options

## Refactoring Strategy

### Decision: Choose Prisma as the Single ORM

**Rationale**:
1. Prisma schema is already well-defined ([`prisma/schema.prisma`](../prisma/schema.prisma))
2. Prisma provides better TypeScript support
3. Prisma has better migration tools
4. Prisma client is already generated
5. Cleaner API for complex queries

**Action**: Remove Drizzle ORM completely, standardize on Prisma.

## Detailed Refactoring Plan

### Phase 1: Unify Storage Layer (Choose Single ORM)

#### 1.1 Remove Drizzle Dependencies
- Remove Drizzle-related packages from [`package.json`](../package.json)
- Delete [`server/db.ts`](../server/db.ts) (Drizzle connection)
- Delete [`server/storage.ts`](../server/storage.ts) (Drizzle storage)
- Delete [`shared/schema.ts`](../shared/schema.ts) (Drizzle schemas)
- Delete [`drizzle.config.ts`](../drizzle.config.ts)
- Delete [`prisma.config.ts`](../prisma.config.ts)

#### 1.2 Enhance Prisma Storage
- Update [`server/storage-prisma.ts`](../server/storage-prisma.ts) to be the single storage implementation
- Rename to [`server/storage.ts`](../server/storage.ts)
- Add missing methods:
  - `getInfluencerProfile()`
  - `getRecentPublishedImages(limit: number)`
  - `getAllImages()` (already exists but ensure consistency)
- Ensure all methods use consistent types (lowercase status enums)

#### 1.3 Update All Imports
- Update [`server/index.ts`](../server/index.ts:4) to import from `./storage`
- Update [`server/routes.ts`](../server/routes.ts:3) to import from `./storage`
- Update [`server/scheduler.ts`](../server/scheduler.ts:1) to import from `./storage`
- Update [`server/automation/orchestrator.ts`](../server/automation/orchestrator.ts:6) to import from `./storage`
- Update [`server/automation/contentGenerator.ts`](../server/automation/contentGenerator.ts:3) to import from `./storage`
- Update [`server/automation/retryQueue.ts`](../server/automation/retryQueue.ts:4) to import from `./storage`
- Update [`server/jobs/auto-generation.ts`](../server/jobs/auto-generation.ts) to import from `./storage`
- Update [`server/scheduler/JobScheduler.ts`](../server/scheduler/JobScheduler.ts:1) to import from `./storage`
- Update [`server/scheduler/SimpleScheduler.ts`](../server/scheduler/SimpleScheduler.ts:1) to import from `./storage`

#### 1.4 Update Shared Types
- Create [`shared/types.ts`](../shared/types.ts) with unified type definitions
- Export from Prisma-generated types
- Ensure consistent enum values (lowercase)

### Phase 2: Consolidate Service Implementations

#### 2.1 Choose Single Instagram Service
**Decision**: Use [`server/services/instagram.ts`](../server/services/instagram.ts) (InstagramService class)

**Rationale**:
- Better structured (class-based)
- Has session management
- Has proper error handling
- More maintainable

**Actions**:
- Delete [`server/instagram.ts`](../server/instagram.ts)
- Update [`server/routes.ts`](../server/routes.ts:12) to import from `./services/instagram`
- Update [`server/scheduler.ts`](../server/scheduler.ts:2) to import from `./services/instagram`
- Update [`server/automation/orchestrator.ts`](../server/automation/orchestrator.ts:4) to import from `./services/instagram`
- Update [`server/automation/retryQueue.ts`](../server/automation/retryQueue.ts:3) to import from `./services/instagram`
- Update [`server/jobs/instagram-post.ts`](../server/jobs/instagram-post.ts:2) to import from `./services/instagram`
- Update [`server/scheduler/JobScheduler.ts`](../server/scheduler/JobScheduler.ts:2) to import from `./services/instagram`
- Update [`server/scheduler/SimpleScheduler.ts`](../server/scheduler/SimpleScheduler.ts:2) to import from `./services/instagram`

#### 2.2 Review Other Services
- Ensure [`server/services/huggingface.ts`](../server/services/huggingface.ts) is properly integrated
- Ensure [`server/services/llama.ts`](../server/services/llama.ts) is properly integrated
- Ensure [`server/services/imageGenerator.ts`](../server/services/imageGenerator.ts) is properly integrated

### Phase 3: Fix Scheduler Architecture

#### 3.1 Choose Single Scheduler Implementation
**Decision**: Use [`server/scheduler.ts`](../server/scheduler.ts) (simple setInterval) as the primary scheduler

**Rationale**:
- Simple and reliable
- No external dependencies (Redis/BullMQ optional)
- Already working
- Easier to debug

**Actions**:
- Delete [`server/scheduler/JobScheduler.ts`](../server/scheduler/JobScheduler.ts)
- Delete [`server/scheduler/SimpleScheduler.ts`](../server/scheduler/SimpleScheduler.ts)
- Delete [`server/scheduler/BreeScheduler.ts`](../server/scheduler/BreeScheduler.ts)
- Keep [`server/scheduler.ts`](../server/scheduler.ts) as the single scheduler
- Ensure it's properly initialized in [`server/index.ts`](../server/index.ts:210)

#### 3.2 Integrate Automation with Scheduler
- Add auto-generation interval to scheduler
- Call `Orchestrator.generateAndPost()` at configured intervals
- Make interval configurable via environment variable

### Phase 4: Resolve Type Inconsistencies

#### 4.1 Standardize ImageStatus Enum
- Use lowercase values: `'pending' | 'scheduled' | 'published' | 'failed'`
- Update [`prisma/schema.prisma`](../prisma/schema.prisma:56-61) enum definition
- Regenerate Prisma client
- Update all code to use lowercase values

#### 4.2 Create Unified Type Definitions
- Create [`shared/types.ts`](../shared/types.ts) with:
  - `ImageModel` type
  - `ImageStatus` type
  - `UsageLimit` type
  - `InfluencerProfile` type
  - Request/Response types
- Export from Prisma-generated types where possible

### Phase 5: Complete Automation System Integration

#### 5.1 Add Missing Storage Methods
Add to [`server/storage.ts`](../server/storage.ts):
```typescript
async getInfluencerProfile(): Promise<InfluencerProfile | null>
async getRecentPublishedImages(limit: number): Promise<ImageModel[]>
```

#### 5.2 Add InfluencerProfile to Prisma Schema
Update [`prisma/schema.prisma`](../prisma/schema.prisma):
```prisma
model InfluencerProfile {
  id                  Int      @id @default(autoincrement())
  name                String
  personality         String
  physicalDescription String?
  activities          String?
  tone                String   @default("engaging")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@map("influencer_profiles")
}
```

#### 5.3 Initialize Automation System
Update [`server/index.ts`](../server/index.ts):
- Import `Orchestrator` from `./automation/orchestrator`
- Import `RetryQueue` from `./automation/retryQueue`
- Initialize RetryQueue on startup
- Start auto-generation if enabled

#### 5.4 Add Configuration Options
Update [`.env.example`](../.env.example):
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
```

### Phase 6: Update Imports and Dependencies

#### 6.1 Update Package.json
Remove Drizzle-related packages:
- `drizzle-orm`
- `drizzle-zod`
- `drizzle-kit`
- `better-sqlite3` (if not needed for other purposes)

Keep Prisma packages:
- `@prisma/client`
- `prisma`

#### 6.2 Update All Import Statements
Systematically update all files to import from the correct locations:
- Storage: `./storage`
- Instagram: `./services/instagram`
- Types: `@shared/types`

### Phase 7: Add Missing Storage Methods

#### 7.1 Implement getInfluencerProfile()
```typescript
async getInfluencerProfile(): Promise<InfluencerProfile | null> {
  const profile = await prisma.influencerProfile.findFirst();
  return profile ? this.mapProfileToModel(profile) : null;
}
```

#### 7.2 Implement getRecentPublishedImages()
```typescript
async getRecentPublishedImages(limit: number): Promise<ImageModel[]> {
  const images = await prisma.image.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: limit
  });
  return images.map(this.mapImageToModel);
}
```

#### 7.3 Implement createInfluencerProfile()
```typescript
async createInfluencerProfile(data: Omit<InfluencerProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<InfluencerProfile> {
  const profile = await prisma.influencerProfile.create({ data });
  return this.mapProfileToModel(profile);
}
```

### Phase 8: Testing and Validation

#### 8.1 Unit Tests
- Test storage methods
- Test service methods
- Test automation components

#### 8.2 Integration Tests
- Test full flow: generation → storage → scheduling → publishing
- Test error handling
- Test retry queue

#### 8.3 Manual Testing
- Test image generation
- Test Instagram publishing
- Test auto-generation
- Test retry queue

### Phase 9: Documentation Updates

#### 9.1 Update README
- Document new architecture
- Update setup instructions
- Add configuration guide

#### 9.2 Update AUTOMATION_PLAN.md
- Mark completed phases
- Update implementation status
- Add troubleshooting section

#### 9.3 Create API Documentation
- Document all API endpoints
- Document request/response formats
- Document error handling

## Architecture Diagram (After Refactoring)

```mermaid
graph TB
    subgraph Client
        App[React App]
    end
    
    subgraph Server
        Index[server/index.ts]
        Routes[server/routes.ts]
        Auth[server/auth.ts]
        Scheduler[server/scheduler.ts]
        
        subgraph Storage
            Storage[server/storage.ts]
            Prisma[Prisma Client]
            DB[(SQLite/PostgreSQL)]
        end
        
        subgraph Services
            Instagram[server/services/instagram.ts]
            HuggingFace[server/services/huggingface.ts]
            Llama[server/services/llama.ts]
            ImageGen[server/services/imageGenerator.ts]
        end
        
        subgraph Automation
            Orchestrator[server/automation/orchestrator.ts]
            ContentGen[server/automation/contentGenerator.ts]
            RetryQueue[server/automation/retryQueue.ts]
        end
    end
    
    App -->|HTTP| Routes
    Routes --> Storage
    Routes --> Instagram
    Auth --> Storage
    
    Scheduler --> Orchestrator
    Scheduler --> Storage
    
    Orchestrator --> ContentGen
    Orchestrator --> HuggingFace
    Orchestrator --> ImageGen
    Orchestrator --> Instagram
    Orchestrator --> RetryQueue
    
    ContentGen --> Llama
    ContentGen --> Storage
    
    Instagram --> Storage
    RetryQueue --> Instagram
    RetryQueue --> Storage
    
    Storage --> Prisma
    Prisma --> DB
```

## File Structure After Refactoring

```
autogram/
├── client/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── pages/
│       └── App.tsx
├── server/
│   ├── automation/
│   │   ├── contentGenerator.ts
│   │   ├── orchestrator.ts
│   │   ├── retryQueue.ts
│   │   └── themes/
│   │       └── index.ts
│   ├── jobs/
│   │   ├── auto-generation.ts
│   │   ├── cleanup.ts
│   │   └── instagram-post.ts
│   ├── prompts/
│   │   └── influencer.ts
│   ├── replit_integrations/
│   │   ├── batch/
│   │   ├── chat/
│   │   └── image/
│   ├── services/
│   │   ├── huggingface.ts
│   │   ├── imageGenerator.ts
│   │   ├── instagram.ts
│   │   └── llama.ts
│   ├── auth.ts
│   ├── index.ts
│   ├── prisma.ts
│   ├── routes.ts
│   ├── scheduler.ts
│   ├── static.ts
│   └── storage.ts
├── shared/
│   ├── routes.ts
│   └── types.ts
├── prisma/
│   ├── schema.prisma
│   └── data/
├── plans/
│   ├── REFACTORING_PLAN.md
│   └── AUTOMATION_PLAN.md
├── .env.example
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Risk Assessment

### High Risk
- **Database Migration**: Changing from Drizzle to Prisma requires careful data migration
- **Breaking Changes**: Updating all imports may cause temporary failures

### Medium Risk
- **Service Consolidation**: Removing duplicate services may break existing functionality
- **Scheduler Changes**: Changing scheduler implementation may affect timing

### Low Risk
- **Type Updates**: Standardizing types is straightforward
- **Documentation**: Updates are non-breaking

## Rollback Plan

If issues arise during refactoring:
1. Keep Git commits granular for easy rollback
2. Maintain backup of working state
3. Test each phase before proceeding
4. Have feature flags for new functionality

## Success Criteria

- [ ] Single storage implementation (Prisma only)
- [ ] Single Instagram service implementation
- [ ] Single scheduler implementation
- [ ] Consistent type definitions
- [ ] All automation features working
- [ ] All tests passing
- [ ] Documentation updated
- [ ] No runtime errors
- [ ] Performance maintained or improved

## Timeline Estimate

- Phase 1: 2-3 hours
- Phase 2: 1-2 hours
- Phase 3: 1-2 hours
- Phase 4: 1 hour
- Phase 5: 2-3 hours
- Phase 6: 1-2 hours
- Phase 7: 1-2 hours
- Phase 8: 2-3 hours
- Phase 9: 1-2 hours

**Total**: 12-20 hours

## Next Steps

1. Review this plan with stakeholders
2. Get approval to proceed
3. Create feature branch for refactoring
4. Execute phases sequentially
5. Test thoroughly after each phase
6. Merge to main when complete
