import { z } from "zod";

const vehicleMakeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

const vehicleModelSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

const vehicleGenerationSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string().nullable(),
  yearFrom: z.number().int(),
  yearTo: z.number().int(),
});

const engineTypeSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
});

export const vehicleYearsResponseSchema = z.object({
  data: z.array(z.number().int()),
});

export const vehicleMakesResponseSchema = z.object({
  data: z.array(vehicleMakeSchema),
});

export const vehicleModelsResponseSchema = z.object({
  data: z.array(vehicleModelSchema),
});

export const vehicleGenerationsResponseSchema = z.object({
  data: z.array(vehicleGenerationSchema),
});

export const engineTypesResponseSchema = z.object({
  data: z.array(engineTypeSchema),
});

export type VehicleMake = z.infer<typeof vehicleMakeSchema>;
export type VehicleModel = z.infer<typeof vehicleModelSchema>;
export type VehicleGeneration = z.infer<typeof vehicleGenerationSchema>;
export type EngineType = z.infer<typeof engineTypeSchema>;
