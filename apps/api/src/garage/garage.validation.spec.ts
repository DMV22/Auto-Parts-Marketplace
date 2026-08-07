import { BadRequestException } from '@nestjs/common';
import { GarageCreateBodyPipe } from './garage.validation';

const GENERATION_ID = '73000000-0000-4000-8000-000000000001';
const ENGINE_ID = '74000000-0000-4000-8000-000000000001';

describe('GarageCreateBodyPipe', () => {
  const pipe = new GarageCreateBodyPipe();

  it('normalizes an exact saved-vehicle payload', () => {
    expect(
      pipe.transform({
        year: 2020,
        vehicleGenerationId: GENERATION_ID,
        engineTypeId: ENGINE_ID,
        label: '  Daily car  ',
      }),
    ).toEqual({
      year: 2020,
      vehicleGenerationId: GENERATION_ID,
      engineTypeId: ENGINE_ID,
      label: 'Daily car',
    });
  });

  it.each([
    [{ year: 2020, vehicleGenerationId: GENERATION_ID, unexpected: true }],
    [{ year: '2020', vehicleGenerationId: GENERATION_ID }],
    [{ year: 2020, vehicleGenerationId: 'not-a-uuid' }],
    [{ year: 2020, vehicleGenerationId: GENERATION_ID, engineTypeId: 'bad' }],
  ])('rejects malformed or unknown input: %j', (body) => {
    expect(() => pipe.transform(body)).toThrow(BadRequestException);
  });
});
