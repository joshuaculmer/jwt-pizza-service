const request = require("supertest");
const app = require("../service");
const {
  jestTimeoutVSCodeIncrease,
  expectValidJwt,
  createAdminUser,
} = require("../testhelper");

// Increase timeout for debugging in VSCode
jestTimeoutVSCodeIncrease();

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;
let adminUser;
let adminUserAuthToken;

beforeAll(async () => {
  // testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);

  adminUser = await createAdminUser();
  const registerAdminRes = await request(app).post("/api/auth").send(adminUser);
  adminUserAuthToken = registerAdminRes.body.token;
  expectValidJwt(adminUserAuthToken);

  const loginRes = await request(app).put("/api/auth").send(adminUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);
});

test("Get pizza menu", async () => {
  const getMenuRes = await request(app).get(`/api/order/menu`);
  expect(getMenuRes.status).toBe(200);
  // console.log(getMenuRes.body);
  expect(getMenuRes.body.length).toBeGreaterThan(0);
});

test("Add menu item unauthorized", async () => {
  const newMenuItem = { description: "Meat Lovers", price: 0.1 };
  const addMenuRes = await request(app)
    .put(`/api/order/menu`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(newMenuItem);
  expect(addMenuRes.status).toBe(403);
  expect(addMenuRes.body.message).toBe("unable to add menu item");
});

// test("Add menu item as admin", async () => {
//   const newMenuItem = {
//     title: "The Horrors",
//     description: "pineapple on pizza :O",
//     image: "pizza1.png",
//     price: 1,
//   };
//   const addMenuRes = await request(app)
//     .put(`/api/order/menu`)
//     .set("Authorization", `Bearer ${adminUserAuthToken}`)
//     .send(newMenuItem);
//   expect(addMenuRes.status).toBe(200);
// });

test("Make an order", async () => {
  const newOrder = {
    franchiseId: 1,
    storeId: 1,
    items: [{ menuId: 1, description: "Veggie", price: 0.05 }],
  };
  const makeOrderRes = await request(app)
    .post(`/api/order`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(newOrder);
  expect(makeOrderRes.status).toBe(200);
  expect(makeOrderRes.body.order).toMatchObject(newOrder);
  expect(makeOrderRes.body.order.id).toBeDefined();
  expect(makeOrderRes.body.jwt).toBeDefined();
});

test("Get my orders", async () => {
  const getOrdersRes = await request(app)
    .get(`/api/order`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(getOrdersRes.status).toBe(200);
  expect(getOrdersRes.body.dinerId).toBeDefined();
  expect(getOrdersRes.body.orders.length).toBeGreaterThan(0);
});

test("Get my orders without token fails", async () => {
  const getOrdersRes = await request(app).get(`/api/order`);
  expect(getOrdersRes.status).toBe(401);
  expect(getOrdersRes.body).toMatchObject({ message: "unauthorized" });
});
