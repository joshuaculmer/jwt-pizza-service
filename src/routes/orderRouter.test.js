const request = require("supertest");
const app = require("../service");
const {
  jestTimeoutVSCodeIncrease,
  expectValidJwt,
  createAdminUser,
} = require("../testhelper");
const Test = require("supertest/lib/test");

// Increase timeout for debugging in VSCode
jestTimeoutVSCodeIncrease();

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
const adminUser = createAdminUser();
let testUserAuthToken;
let adminUserAuthToken;

beforeAll(async () => {
  // testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);

  const adminRegisterRes = await request(app)
    .post("/api/auth")
    .send(await adminUser);
  adminUserAuthToken = adminRegisterRes.body.token;
  expectValidJwt(adminUserAuthToken);
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

test("Add menu item as admin", async () => {
  const newMenuItem = { description: "Meat Lovers", price: 0.1 };
  const addMenuRes = await request(app)
    .put(`/api/order/menu`)
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send(newMenuItem);
  expect(addMenuRes.status).toBe(200);
});
