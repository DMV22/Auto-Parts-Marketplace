export type CustomerCommerceActor = {
  kind: 'CUSTOMER';
  customerId: string;
};

export type GuestCommerceActor = {
  kind: 'GUEST';
  guestTokenHash: string;
};

export type CommerceActor = CustomerCommerceActor | GuestCommerceActor;

export type CommerceActorResolution = {
  actor: CommerceActor;
  guestContext: {
    token: string;
    tokenHash: string;
    isNew: boolean;
  } | null;
  clearGuestCookie: boolean;
};
