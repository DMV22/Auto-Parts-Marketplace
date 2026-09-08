export async function runInTransactionBatches<TItem, TTransaction>(
  items: readonly TItem[],
  batchSize: number,
  runTransaction: (
    operation: (transaction: TTransaction) => Promise<void>,
  ) => Promise<void>,
  writeItem: (transaction: TTransaction, item: TItem) => Promise<void>,
): Promise<void> {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error('Transaction batch size must be a positive integer');
  }

  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize);

    await runTransaction(async (transaction) => {
      for (const item of batch) {
        await writeItem(transaction, item);
      }
    });
  }
}
