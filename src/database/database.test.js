const request = require("supertest");
const app = require("../service");
const { jestTimeoutVSCodeIncrease, expectValidJwt } = require("../testhelper");

// Increase timeout for debugging in VSCode
jestTimeoutVSCodeIncrease();

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test("Get Menu Options", async () => {
  const res = await request(app).options("/api/order/menu");
  expect(res.statusCode).toEqual(200);
});
