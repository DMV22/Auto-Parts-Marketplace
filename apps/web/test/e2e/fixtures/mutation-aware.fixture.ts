import {
  cleanMarketplaceScenario,
  provisionMarketplaceScenario,
  type MarketplaceScenario,
} from "./test-database";
import {
  expect,
  test as roleAwareTest,
} from "./role-aware.fixture";

type MutationFixtures = {
  marketplaceScenario: MarketplaceScenario;
};

export const test = roleAwareTest.extend<MutationFixtures>({
  marketplaceScenario: async (
    { activeSupplierUser, admin, customer, supportManager },
    provide,
  ) => {
    if (!activeSupplierUser.supplierId || !customer.userId) {
      throw new Error("Role-aware actors are missing scenario ownership IDs");
    }

    const scenario = await provisionMarketplaceScenario({
      customerUserId: customer.userId,
      supplierId: activeSupplierUser.supplierId,
    });

    // Keep strict Note authors and moderation actors alive until domain cleanup.
    void admin;
    void supportManager;

    try {
      await provide(scenario);
    } finally {
      await cleanMarketplaceScenario(scenario, customer.userId);
    }
  },
});

export { expect };
