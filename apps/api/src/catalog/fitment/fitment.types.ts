import type { FitmentRuleEffect } from '../../generated/prisma/enums';

export type VehicleContext = {
  year: number;
  generationId: string;
  engineTypeId: string | null;
};

export type VehicleContextInput = {
  year: number | null;
  generationId: string | null;
  engineTypeId: string | null;
  savedVehicleId: string | null;
};

export type FitmentRuleInput = {
  id: string;
  effect: FitmentRuleEffect;
  vehicleGenerationId: string;
  engineTypeId: string | null;
};

export type FitmentStatus =
  | 'compatible'
  | 'incompatible'
  | 'unknown'
  | 'caution';

export type FitmentReasonCode =
  | 'VEHICLE_NOT_SELECTED'
  | 'EXACT_ENGINE_MATCH'
  | 'EXACT_ENGINE_EXCLUSION'
  | 'GENERATION_MATCH'
  | 'GENERATION_EXCLUSION'
  | 'ENGINE_REQUIRED'
  | 'NO_FITMENT_DATA';

export type FitmentAnswer = {
  status: FitmentStatus;
  reasonCode: FitmentReasonCode;
  matchedRule: {
    id: string;
    effect: FitmentRuleEffect;
    scope: 'ENGINE' | 'GENERATION';
    vehicleGenerationId: string;
    engineTypeId: string | null;
  } | null;
};
