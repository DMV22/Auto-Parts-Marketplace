import { ServiceUnavailableException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

jest.mock('../generated/prisma/client', () => ({
  PrismaClient: class {},
}));

describe('HealthService', () => {
  it('reports process liveness without checking dependencies', () => {
    const queryRaw = jest.fn();
    const prisma = {
      $queryRaw: queryRaw,
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    expect(service.live()).toEqual({ status: 'ok' });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('reports readiness after a successful database probe', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const prisma = {
      $queryRaw: queryRaw,
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    await expect(service.ready()).resolves.toEqual({ status: 'ok' });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns only a safe unavailable status when the probe fails', async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockRejectedValue(new Error('postgresql://secret@database/demo')),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    await expect(service.ready()).rejects.toMatchObject<
      Partial<ServiceUnavailableException>
    >({
      response: { status: 'unavailable' },
      status: 503,
    });
  });

  it('bounds a database probe that does not settle', async () => {
    jest.useFakeTimers();
    const prisma = {
      $queryRaw: jest.fn().mockReturnValue(new Promise(() => undefined)),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);
    const readiness = expect(service.ready()).rejects.toMatchObject({
      response: { status: 'unavailable' },
      status: 503,
    });

    await jest.advanceTimersByTimeAsync(2_000);
    await readiness;
    jest.useRealTimers();
  });
});
