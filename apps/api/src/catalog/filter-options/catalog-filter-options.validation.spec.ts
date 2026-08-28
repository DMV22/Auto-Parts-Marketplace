import { BadRequestException } from '@nestjs/common';
import { FilterOptionsQueryPipe } from './filter-options.validation';

describe('FilterOptionsQueryPipe', () => {
  const pipe = new FilterOptionsQueryPipe();

  it('accepts an empty query and rejects query parameters', () => {
    expect(pipe.transform({})).toEqual({});
    expect(() => pipe.transform({ unexpected: 'value' })).toThrow(
      BadRequestException,
    );
  });
});
