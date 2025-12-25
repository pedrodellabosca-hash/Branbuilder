# Next Steps: Stage Execution & AI Generation

## Current Status
- ✅ Phase 1 complete (T1-T4)
- ✅ Job queue working (DEV sync / PROD async)
- ✅ Output + OutputVersion creation
- ✅ Stage status transitions (NOT_STARTED → GENERATED → APPROVED)

## What's Working
- Click "Generar" → Job created → Output generated → Stage updated
- Anti-spam cooldown (900ms)
- Multi-tenant validation on all endpoints
- File uploads per project

## Next: AI Provider Integration

### Location
`lib/jobs/processor.ts` → `processGenerateOutput()`

### Current Mock
```ts
content: "Contenido generado... (Demo)"
```

### Integration Plan

**PR 1: Add AI Provider Abstraction**
- Create `lib/ai/provider.ts` interface
- Add OpenAI implementation
- Add env var `AI_PROVIDER=openai`

**PR 2: Connect to Job Processor**
- Import provider in processor
- Replace mock with real call
- Handle errors gracefully

**PR 3: Stage-Specific Prompts**
- Create prompts per stageKey (naming, manifesto, etc.)
- Store in `lib/ai/prompts/`

## Pending Features (Lower Priority)
- [ ] Versioning UI (view/compare OutputVersions)
- [ ] Approval workflow improvements
- [ ] Stage dependencies (block Visual until Voice approved)
- [ ] Export to PDF/Word
