import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { FitmentRuleEffect } from '../../generated/prisma/enums';
import type {
  FitmentAnswer,
  FitmentRuleInput,
  VehicleContext,
} from './fitment.types';

type VariantAlias = 'variant' | 'search_variant';

@Injectable()
export class FitmentService {
  evaluate(
    vehicle: VehicleContext | null,
    rules: FitmentRuleInput[],
  ): FitmentAnswer {
    if (!vehicle) return answer('unknown', 'VEHICLE_NOT_SELECTED');

    const generationRules = rules.filter(
      (rule) => rule.vehicleGenerationId === vehicle.generationId,
    );
    if (vehicle.engineTypeId) {
      const exact = generationRules.find(
        (rule) => rule.engineTypeId === vehicle.engineTypeId,
      );
      if (exact) return fromRule(exact, 'ENGINE');
    }

    const generation = generationRules.find(
      (rule) => rule.engineTypeId === null,
    );
    if (generation) return fromRule(generation, 'GENERATION');

    if (
      !vehicle.engineTypeId &&
      generationRules.some((rule) => rule.engineTypeId !== null)
    ) {
      return answer('caution', 'ENGINE_REQUIRED');
    }
    return answer('unknown', 'NO_FITMENT_DATA');
  }

  compatibleVariantWhere(
    vehicle: VehicleContext | null,
  ): Prisma.ProductVariantWhereInput {
    if (!vehicle) return {};
    const generationId = vehicle.generationId;
    if (!vehicle.engineTypeId) {
      return {
        fitmentRules: {
          some: {
            vehicleGenerationId: generationId,
            engineTypeId: null,
            effect: FitmentRuleEffect.COMPATIBLE,
          },
        },
      };
    }

    const engineTypeId = vehicle.engineTypeId;
    return {
      OR: [
        {
          fitmentRules: {
            some: {
              vehicleGenerationId: generationId,
              engineTypeId,
              effect: FitmentRuleEffect.COMPATIBLE,
            },
          },
        },
        {
          AND: [
            {
              fitmentRules: {
                none: { vehicleGenerationId: generationId, engineTypeId },
              },
            },
            {
              fitmentRules: {
                some: {
                  vehicleGenerationId: generationId,
                  engineTypeId: null,
                  effect: FitmentRuleEffect.COMPATIBLE,
                },
              },
            },
          ],
        },
      ],
    };
  }

  compatibleVariantSql(
    vehicle: VehicleContext | null,
    variantAlias: VariantAlias,
  ): Prisma.Sql | null {
    if (!vehicle) return null;
    const variantId =
      variantAlias === 'variant'
        ? Prisma.sql`variant.id`
        : Prisma.sql`search_variant.id`;
    const generationId = vehicle.generationId;
    if (!vehicle.engineTypeId) {
      return Prisma.sql`EXISTS (
        SELECT 1 FROM "FitmentRule" AS fitment
        WHERE fitment."productVariantId" = ${variantId}
          AND fitment."vehicleGenerationId" = ${generationId}::uuid
          AND fitment."engineTypeId" IS NULL
          AND fitment.effect = 'COMPATIBLE'::"FitmentRuleEffect"
      )`;
    }

    const engineTypeId = vehicle.engineTypeId;
    return Prisma.sql`(
      EXISTS (
        SELECT 1 FROM "FitmentRule" AS exact_fitment
        WHERE exact_fitment."productVariantId" = ${variantId}
          AND exact_fitment."vehicleGenerationId" = ${generationId}::uuid
          AND exact_fitment."engineTypeId" = ${engineTypeId}::uuid
          AND exact_fitment.effect = 'COMPATIBLE'::"FitmentRuleEffect"
      )
      OR (
        NOT EXISTS (
          SELECT 1 FROM "FitmentRule" AS exact_fitment
          WHERE exact_fitment."productVariantId" = ${variantId}
            AND exact_fitment."vehicleGenerationId" = ${generationId}::uuid
            AND exact_fitment."engineTypeId" = ${engineTypeId}::uuid
        )
        AND EXISTS (
          SELECT 1 FROM "FitmentRule" AS generation_fitment
          WHERE generation_fitment."productVariantId" = ${variantId}
            AND generation_fitment."vehicleGenerationId" = ${generationId}::uuid
            AND generation_fitment."engineTypeId" IS NULL
            AND generation_fitment.effect = 'COMPATIBLE'::"FitmentRuleEffect"
        )
      )
    )`;
  }
}

function fromRule(
  rule: FitmentRuleInput,
  scope: 'ENGINE' | 'GENERATION',
): FitmentAnswer {
  const compatible = rule.effect === FitmentRuleEffect.COMPATIBLE;
  const reasonCode =
    scope === 'ENGINE'
      ? compatible
        ? 'EXACT_ENGINE_MATCH'
        : 'EXACT_ENGINE_EXCLUSION'
      : compatible
        ? 'GENERATION_MATCH'
        : 'GENERATION_EXCLUSION';
  return {
    status: compatible ? 'compatible' : 'incompatible',
    reasonCode,
    matchedRule: { ...rule, scope },
  };
}

function answer(
  status: FitmentAnswer['status'],
  reasonCode: FitmentAnswer['reasonCode'],
): FitmentAnswer {
  return { status, reasonCode, matchedRule: null };
}
