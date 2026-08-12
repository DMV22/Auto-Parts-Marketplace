import { FitmentRuleEffect } from '../../generated/prisma/enums';
import { FitmentService } from './fitment.service';
import type { FitmentRuleInput, VehicleContext } from './fitment.types';

jest.mock('../../generated/prisma/client', () => ({ Prisma: {} }));

const GENERATION_ID = '73000000-0000-4000-8000-000000000001';
const ENGINE_ID = '74000000-0000-4000-8000-000000000001';
const OTHER_ENGINE_ID = '74000000-0000-4000-8000-000000000002';

const vehicle = (engineTypeId: string | null): VehicleContext => ({
  year: 2020,
  generationId: GENERATION_ID,
  engineTypeId,
});

const rule = (
  id: string,
  effect: FitmentRuleEffect,
  engineTypeId: string | null,
): FitmentRuleInput => ({
  id,
  effect,
  vehicleGenerationId: GENERATION_ID,
  engineTypeId,
});

describe('FitmentService', () => {
  const service = new FitmentService();

  it.each([
    {
      name: 'no vehicle context',
      context: null,
      rules: [],
      status: 'unknown',
      reasonCode: 'VEHICLE_NOT_SELECTED',
    },
    {
      name: 'exact compatible engine rule',
      context: vehicle(ENGINE_ID),
      rules: [rule('exact', FitmentRuleEffect.COMPATIBLE, ENGINE_ID)],
      status: 'compatible',
      reasonCode: 'EXACT_ENGINE_MATCH',
    },
    {
      name: 'exact exclusion overrides generation compatibility',
      context: vehicle(ENGINE_ID),
      rules: [
        rule('generation', FitmentRuleEffect.COMPATIBLE, null),
        rule('exact', FitmentRuleEffect.INCOMPATIBLE, ENGINE_ID),
      ],
      status: 'incompatible',
      reasonCode: 'EXACT_ENGINE_EXCLUSION',
    },
    {
      name: 'generation compatibility applies without an exact rule',
      context: vehicle(ENGINE_ID),
      rules: [rule('generation', FitmentRuleEffect.COMPATIBLE, null)],
      status: 'compatible',
      reasonCode: 'GENERATION_MATCH',
    },
    {
      name: 'exact compatibility overrides generation exclusion',
      context: vehicle(ENGINE_ID),
      rules: [
        rule('generation', FitmentRuleEffect.INCOMPATIBLE, null),
        rule('exact', FitmentRuleEffect.COMPATIBLE, ENGINE_ID),
      ],
      status: 'compatible',
      reasonCode: 'EXACT_ENGINE_MATCH',
    },
    {
      name: 'generation exclusion applies without engine selection',
      context: vehicle(null),
      rules: [rule('generation', FitmentRuleEffect.INCOMPATIBLE, null)],
      status: 'incompatible',
      reasonCode: 'GENERATION_EXCLUSION',
    },
    {
      name: 'engine-specific rules require engine selection',
      context: vehicle(null),
      rules: [
        rule('other-engine', FitmentRuleEffect.COMPATIBLE, OTHER_ENGINE_ID),
      ],
      status: 'caution',
      reasonCode: 'ENGINE_REQUIRED',
    },
    {
      name: 'no applicable fitment data',
      context: vehicle(ENGINE_ID),
      rules: [],
      status: 'unknown',
      reasonCode: 'NO_FITMENT_DATA',
    },
  ])('$name', ({ context, rules, status, reasonCode }) => {
    expect(service.evaluate(context, rules)).toMatchObject({
      status,
      reasonCode,
    });
  });
});
