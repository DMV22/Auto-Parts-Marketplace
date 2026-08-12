import { BadRequestException } from '@nestjs/common';
import { VehicleTaxonomyQueryPipe } from './vehicle-taxonomy.validation';

describe('VehicleTaxonomyQueryPipe', () => {
  it('parses a valid makes query', () => {
    const pipe = new VehicleTaxonomyQueryPipe('makes');

    expect(pipe.transform({ year: '2020' })).toEqual({ year: 2020 });
  });

  it('rejects unknown query parameters', () => {
    const pipe = new VehicleTaxonomyQueryPipe('makes');

    expect(() => pipe.transform({ year: '2020', unexpected: 'value' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects missing or out-of-range years', () => {
    const pipe = new VehicleTaxonomyQueryPipe('makes');

    expect(() => pipe.transform({})).toThrow(BadRequestException);
    expect(() => pipe.transform({ year: '1885' })).toThrow(BadRequestException);
  });

  it('parses parent identifiers for each hierarchy step', () => {
    const makeId = '71000000-0000-4000-8000-000000000001';
    const modelId = '72000000-0000-4000-8000-000000000001';
    const generationId = '73000000-0000-4000-8000-000000000001';

    expect(
      new VehicleTaxonomyQueryPipe('models').transform({
        year: '2020',
        makeId,
      }),
    ).toEqual({ year: 2020, makeId });
    expect(
      new VehicleTaxonomyQueryPipe('generations').transform({
        year: '2020',
        modelId,
      }),
    ).toEqual({ year: 2020, modelId });
    expect(
      new VehicleTaxonomyQueryPipe('engines').transform({ generationId }),
    ).toEqual({ generationId });
  });

  it('rejects malformed parent identifiers', () => {
    expect(() =>
      new VehicleTaxonomyQueryPipe('models').transform({
        year: '2020',
        makeId: 'not-a-uuid',
      }),
    ).toThrow(BadRequestException);
  });
});
