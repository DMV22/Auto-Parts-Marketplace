import { BadRequestException } from '@nestjs/common';
import {
  CreateNotePipe,
  encodeNoteCursor,
  NotesQueryPipe,
  RedactNotePipe,
} from './internal-notes.validation';

const NOTE_ID = 'c1000000-0000-4000-8000-000000000001';
const CREATED_AT = '2026-08-14T10:00:00.000Z';

describe('Internal Notes validation', () => {
  it('accepts append-only notes and optional correction links', () => {
    const pipe = new CreateNotePipe();
    expect(pipe.transform({ body: '  Contacted customer  ' })).toEqual({
      body: 'Contacted customer',
      correctsNoteId: null,
    });
    expect(
      pipe.transform({ body: 'Corrected context', correctsNoteId: NOTE_ID }),
    ).toEqual({ body: 'Corrected context', correctsNoteId: NOTE_ID });
  });

  it.each([
    [{}],
    [{ body: '' }],
    [{ body: 'x'.repeat(4001) }],
    [{ body: 'Valid', correctsNoteId: 'not-a-uuid' }],
    [{ body: 'Valid', orderId: NOTE_ID }],
  ])('rejects unsafe create payload: %j', (payload) => {
    expect(() => new CreateNotePipe().transform(payload)).toThrow(
      BadRequestException,
    );
  });

  it('validates bounded deterministic pagination', () => {
    const pipe = new NotesQueryPipe();
    expect(pipe.transform({})).toEqual({ limit: 20, cursor: null });
    expect(
      pipe.transform({
        limit: '50',
        cursor: encodeNoteCursor({ id: NOTE_ID, createdAt: CREATED_AT }),
      }),
    ).toEqual({
      limit: 50,
      cursor: { id: NOTE_ID, createdAt: new Date(CREATED_AT) },
    });
    expect(() => pipe.transform({ limit: '51' })).toThrow(BadRequestException);
    expect(() => pipe.transform({ unknown: 'value' })).toThrow(
      BadRequestException,
    );
  });

  it('requires a bounded Admin redaction reason', () => {
    const pipe = new RedactNotePipe();
    expect(pipe.transform({ reason: '  Contains secret  ' })).toEqual({
      reason: 'Contains secret',
    });
    expect(() => pipe.transform({ reason: '' })).toThrow(BadRequestException);
    expect(() => pipe.transform({ reason: 'x'.repeat(501) })).toThrow(
      BadRequestException,
    );
  });
});
