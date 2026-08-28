export const customerSessionResponseFixture = {
  session: {
    id: "session-id",
    userId: "user-id",
    token: "must-not-cross-the-frontend-boundary",
    expiresAt: "2026-08-25T12:00:00.000Z",
  },
  user: {
    id: "user-id",
    email: "customer@example.test",
    name: "Customer",
    role: "CUSTOMER",
    isActive: true,
  },
} as const;

export const customerSessionProjectionFixture = {
  session: {
    id: "session-id",
    userId: "user-id",
    expiresAt: "2026-08-25T12:00:00.000Z",
  },
  user: customerSessionResponseFixture.user,
} as const;
