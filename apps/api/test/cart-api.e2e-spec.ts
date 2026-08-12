import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureAuthHttp } from '../src/auth/configure-auth-http';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  ACTIVE_LISTING_ID,
  cleanCartFixtures,
  createCartFixtures,
  EMPTY_LISTING_ID,
  OTHER_CURRENCY_LISTING_ID,
  PAUSED_LISTING_ID,
} from './cart-api.fixtures';

const PASSWORD = 'Password-12345';

jest.setTimeout(30_000);

describe('Cart API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureAuthHttp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanCartFixtures(prisma);
    await createCartFixtures(prisma);
  });

  afterAll(async () => {
    if (prisma) await cleanCartFixtures(prisma);
    await app?.close();
  });

  it('isolates a Guest Cart by a server-issued HttpOnly cookie', async () => {
    const guest = request.agent(app.getHttpServer());
    await guest
      .get('/api/v1/cart')
      .expect(200)
      .expect('set-cookie', /apm_guest_cart=.*HttpOnly.*SameSite=Lax/)
      .expect({
        data: {
          id: null,
          currency: null,
          totalQuantity: 0,
          totalAmount: '0.00',
          items: [],
        },
      });

    await guest
      .post('/api/v1/cart/items')
      .send({ listingId: ACTIVE_LISTING_ID, quantity: 2 })
      .expect(201)
      .expect('set-cookie', /Max-Age=2592000/)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          currency: 'UAH',
          totalQuantity: 2,
          totalAmount: '250.00',
        });
      });

    await guest
      .get('/api/v1/cart')
      .expect(200)
      .expect((response) => {
        expect(response.body.data.items).toHaveLength(1);
      });
    await request(app.getHttpServer())
      .get('/api/v1/cart')
      .expect(200)
      .expect((response) => {
        expect(response.body.data.id).toBeNull();
      });
  });

  it('supports owner-scoped update/remove/clear and stable errors', async () => {
    const owner = request.agent(app.getHttpServer());
    const other = request.agent(app.getHttpServer());
    const created = await owner
      .post('/api/v1/cart/items')
      .send({ listingId: ACTIVE_LISTING_ID, quantity: 1 })
      .expect(201);
    const itemId = created.body.data.items[0].id as string;

    await owner
      .patch(`/api/v1/cart/items/${itemId}`)
      .send({ quantity: 4 })
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          totalQuantity: 4,
          totalAmount: '500.00',
        });
      });
    await owner
      .patch(`/api/v1/cart/items/${itemId}`)
      .send({ quantity: 6 })
      .expect(409);
    await owner
      .patch(`/api/v1/cart/items/${itemId}`)
      .send({ quantity: 1, listingId: ACTIVE_LISTING_ID })
      .expect(400);
    await owner
      .post('/api/v1/cart/items')
      .send({ listingId: ACTIVE_LISTING_ID, quantity: 1, price: '1.00' })
      .expect(400);
    await owner
      .post('/api/v1/cart/items')
      .send({ listingId: OTHER_CURRENCY_LISTING_ID, quantity: 1 })
      .expect(409);
    await owner
      .post('/api/v1/cart/items')
      .send({ listingId: PAUSED_LISTING_ID, quantity: 1 })
      .expect(404);
    await owner
      .post('/api/v1/cart/items')
      .send({ listingId: EMPTY_LISTING_ID, quantity: 1 })
      .expect(409);

    const missing = await other
      .delete('/api/v1/cart/items/ffffffff-ffff-4fff-8fff-ffffffffffff')
      .expect(404);
    const crossOwner = await other
      .delete(`/api/v1/cart/items/${itemId}`)
      .expect(404);
    expect(crossOwner.body).toEqual(missing.body);

    await owner
      .delete(`/api/v1/cart/items/${itemId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({ currency: null, items: [] });
      });
    await owner.delete('/api/v1/cart').expect(200);
    await owner.delete('/api/v1/cart').expect(200);
  });

  it('switches from Guest to Customer Cart without merging', async () => {
    const client = request.agent(app.getHttpServer());
    await client.get('/api/v1/cart').expect(200);
    await client
      .post('/api/v1/cart/items')
      .send({ listingId: ACTIVE_LISTING_ID, quantity: 2 })
      .expect(201);

    await client
      .post('/api/auth/sign-up/email')
      .send({
        name: 'Cart Customer',
        email: 'e2e-owner@cart.test',
        password: PASSWORD,
      })
      .expect(200);
    await client
      .get('/api/v1/cart')
      .expect(200)
      .expect('set-cookie', /apm_guest_cart=; Max-Age=0/)
      .expect((response) => {
        expect(response.body.data).toMatchObject({ id: null, items: [] });
      });

    await client
      .post('/api/v1/cart/items')
      .send({ listingId: ACTIVE_LISTING_ID, quantity: 1 })
      .expect(201)
      .expect((response) => {
        expect(response.body.data.totalQuantity).toBe(1);
      });
    await client.post('/api/auth/sign-out').expect(200);
    await client
      .get('/api/v1/cart')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({ id: null, items: [] });
      });
  });
});
