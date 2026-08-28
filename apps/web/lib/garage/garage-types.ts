import { z } from "zod";

const garageVehicleSchema = z.object({
  id: z.uuid(),
  year: z.number().int(),
  label: z.string().nullable(),
  isActive: z.boolean(),
  generation: z.object({
    id: z.uuid(),
    code: z.string(),
    name: z.string().nullable(),
    yearFrom: z.number().int(),
    yearTo: z.number().int(),
    model: z.object({
      id: z.uuid(),
      name: z.string(),
      make: z.object({ id: z.uuid(), name: z.string() }),
    }),
  }),
  engine: z
    .object({ id: z.uuid(), code: z.string(), name: z.string() })
    .nullable(),
});

export const garageCollectionResponseSchema = z.object({
  data: z.array(garageVehicleSchema),
});

export const garageItemResponseSchema = z.object({ data: garageVehicleSchema });

export type GarageVehicle = z.infer<typeof garageVehicleSchema>;

export type CreateGarageVehicleInput = {
  year: number;
  vehicleGenerationId: string;
  engineTypeId: string | null;
  label: string | null;
};
