export type CreateSavedVehicleInput = {
  year: number;
  vehicleGenerationId: string;
  engineTypeId: string | null;
  label: string | null;
};

export type GarageVehicle = {
  id: string;
  year: number;
  label: string | null;
  isActive: boolean;
  generation: {
    id: string;
    code: string;
    name: string | null;
    yearFrom: number;
    yearTo: number;
    model: {
      id: string;
      name: string;
      make: { id: string; name: string };
    };
  };
  engine: { id: string; code: string; name: string } | null;
};

export type GarageCollectionResponse = { data: GarageVehicle[] };
export type GarageItemResponse = { data: GarageVehicle };
