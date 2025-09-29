const request = require("supertest");
const app = require("../service");
const {
  jestTimeoutVSCodeIncrease,
  expectValidJwt,
  randomUser,
  createAdminUser,
} = require("../testhelper");

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

afterAll(async () => {
  // logout test user
  await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
});

test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test("register", async () => {
  const registerRes = await request(app).post("/api/auth").send(randomUser());
  expect(registerRes.status).toBe(200);
  expectValidJwt(registerRes.body.token);
});

test("register missing fields fails", async () => {
  const registerRes = await request(app).post("/api/auth");
  expect(registerRes.status).toBe(400);
});

test("logout", async () => {
  const logoutRes = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  console.log(logoutRes.body);
  expect(logoutRes.body).toMatchObject({ message: "logout successful" });
});

test("logout without token fails", async () => {
  const logoutRes = await request(app).delete("/api/auth");
  expect(logoutRes.status).toBe(401);
  expect(logoutRes.body).toMatchObject({ message: "unauthorized" });
});

test("login admin user", async () => {
  const adminUser = await createAdminUser();
  const loginRes = await request(app).put("/api/auth").send(adminUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);
  const adminUserAuthToken = loginRes.body.token; 
  const expectedUser = adminUser;
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});
