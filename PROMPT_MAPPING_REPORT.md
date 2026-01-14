# Venture Prompt Mapping Report (v1)

## StageKey -> Prompt Wrapper -> Schema
- venture_intake -> lib/prompts/stages/venture-intake.ts -> VentureIntakeSchema
- venture_idea_validation -> lib/prompts/stages/venture-validation.ts -> VentureValidationSchema
- venture_buyer_persona -> lib/prompts/stages/venture-persona.ts -> VenturePersonaSchema
- venture_business_plan -> lib/prompts/stages/venture-plan.ts -> VenturePlanSchema

## Signature Checks (System Prompt)
- venture_intake includes "AGENTE DE INTAKE PLANLY"
- venture_idea_validation includes "BUSINESS VIABILITY ARCHITECT V3.2"
- venture_buyer_persona includes "HUNTER V3"
- venture_business_plan includes "UNIFIED BUSINESS ARCHITECT"

## Registry Wiring
- lib/prompts/registry.ts maps venture_* stageKeys to their wrappers.

## Verification
1) npx tsx scripts/test-venture-prompts.ts
2) npx tsx scripts/smoke-test-venture-flow.ts

## Files Touched
- lib/prompts/stages/venture-intake.ts
- lib/prompts/stages/venture-validation.ts
- lib/prompts/stages/venture-persona.ts
- lib/prompts/stages/venture-plan.ts
- lib/prompts/registry.ts
- lib/stages/schemas.ts
- lib/stages/runStage.ts
- lib/stages/gating.ts
- scripts/test-venture-prompts.ts
- scripts/smoke-test-venture-flow.ts
