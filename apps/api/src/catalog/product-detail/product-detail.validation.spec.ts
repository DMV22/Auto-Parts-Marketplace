import { BadRequestException } from '@nestjs/common';
import { ProductDetailQueryPipe } from './product-detail.validation';

const GENERATION_ID = '73000000-0000-4000-8000-000000000001';
const ENGINE_ID = '74000000-0000-4000-8000-000000000001';

describe('ProductDetailQueryPipe validation', () => {
  const pipe = new ProductDetailQueryPipe();

  it('accepts an explicit vehicle context', () => {
    expect(
      pipe.transform({
        year: '2020',
        generationId: GENERATION_ID,
        engineTypeId: ENGINE_ID,
      }),
    ).toEqual({
      year: 2020,
      generationId: GENERATION_ID,
      engineTypeId: ENGINE_ID,
      savedVehicleId: null,
    });
  });

  it('accepts an authenticated saved vehicle reference', () => {
    expect(pipe.transform({ savedVehicleId: GENERATION_ID })).toEqual({
      year: null,
      generationId: null,
      engineTypeId: null,
      savedVehicleId: GENERATION_ID,
    });
  });

  it.each([
    [{ unexpected: 'value' }],
    [{ year: '2020' }],
    [{ generationId: GENERATION_ID }],
    [{ engineTypeId: ENGINE_ID }],
    [
      {
        year: '2020',
        generationId: GENERATION_ID,
        savedVehicleId: GENERATION_ID,
      },
    ],
  ])('rejects malformed or conflicting query: %j', (query) => {
    expect(() => pipe.transform(query)).toThrow(BadRequestException);
  });
});
