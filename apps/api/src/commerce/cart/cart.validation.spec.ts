import { BadRequestException } from '@nestjs/common';
import { CartAddItemBodyPipe, CartUpdateItemBodyPipe } from './cart.validation';

const LISTING_ID = '81000000-0000-4000-8000-000000000001';

describe('Cart body validation', () => {
  it('accepts a listing ID and positive integer quantity', () => {
    expect(
      new CartAddItemBodyPipe().transform({
        listingId: LISTING_ID,
        quantity: 2,
      }),
    ).toEqual({ listingId: LISTING_ID, quantity: 2 });
  });

  it('rejects client-supplied commercial fields', () => {
    expect(() =>
      new CartAddItemBodyPipe().transform({
        listingId: LISTING_ID,
        quantity: 1,
        price: '1.00',
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts only a positive replacement quantity for updates', () => {
    const pipe = new CartUpdateItemBodyPipe();

    expect(pipe.transform({ quantity: 3 })).toEqual({ quantity: 3 });
    expect(() => pipe.transform({ quantity: 0 })).toThrow(BadRequestException);
    expect(() =>
      pipe.transform({ quantity: 1, listingId: LISTING_ID }),
    ).toThrow(BadRequestException);
  });
});
