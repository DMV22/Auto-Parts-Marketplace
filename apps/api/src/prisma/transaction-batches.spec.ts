import { runInTransactionBatches } from './transaction-batches';

describe('runInTransactionBatches', () => {
  it('keeps each sequential transaction within the configured batch size', async () => {
    const transactionSizes: number[] = [];
    let currentTransactionSize = 0;

    await runInTransactionBatches(
      Array.from({ length: 121 }, (_, index) => index + 1),
      50,
      async (operation) => {
        currentTransactionSize = 0;
        await operation({});
        transactionSizes.push(currentTransactionSize);
      },
      async () => {
        currentTransactionSize += 1;
      },
    );

    expect(transactionSizes).toEqual([50, 50, 21]);
  });

  it('stops before starting another transaction when a batch fails', async () => {
    let transactionCount = 0;

    await expect(
      runInTransactionBatches(
        [1, 2, 3, 4, 5],
        2,
        async (operation) => {
          transactionCount += 1;
          await operation({});
        },
        async (_transaction, item) => {
          if (item === 3) {
            throw new Error('write failed');
          }
        },
      ),
    ).rejects.toThrow('write failed');

    expect(transactionCount).toBe(2);
  });
});
