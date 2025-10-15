const request = require("supertest");
const app = require("../service");
const { jestTimeoutVSCodeIncrease, expectValidJwt } = require("../testhelper");

// Increase timeout for debugging in VSCode
jestTimeoutVSCodeIncrease();

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;
let testUserId;
// const adminUser = createAdminUser();
// let adminUserAuthToken;

beforeAll(async () => {
  // testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
  console.log("testUserId: " + testUserId);
  expectValidJwt(testUserAuthToken);
});

afterAll(async () => {
  // logout test user
  await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
});

test("get me", async () => {
  const getMeRes = await request(app)
    .get("/api/user/me")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(getMeRes.status).toBe(200);
  expect(getMeRes.body).toMatchObject({
    name: testUser.name,
    email: testUser.email,
    roles: [{ role: "diner" }],
  });
});

test("update myself not admin", async () => {
  const newName = "updated name";
  const userId = testUserId;
  console.log("Attempting to update userId:", userId);
  console.log("With token:", testUserAuthToken?.substring(0, 20) + "...");

  const updateRes = await request(app)
    .put(`/api/user/${userId}`)
    .send({ name: newName })
    .set("Authorization", `Bearer ${testUserAuthToken}`);

  console.log("Update response status:", updateRes.status);
  console.log("Update response body:", updateRes.body);

  expect(updateRes.status).toBe(200);
});

// TODO make admin update user test

test("list users unauthorized", async () => {
  const listUsersRes = await request(app).get("/api/user");
  expect(listUsersRes.status).toBe(401);
});

test("list users", async () => {
  const [user, userToken] = await registerUser(request(app));
  expect(user.name).toBe("pizza diner");
  const listUsersRes = await request(app)
    .get("/api/user")
    .set("Authorization", "Bearer " + userToken);
  console.log(listUsersRes.body.users);
  expect(listUsersRes.status).toBe(200);
  
  expect(listUsersRes.body.users.length).toBeGreaterThan(1);
});

test("list users with limit", async () => {
  const [, userToken] = await registerUser(request(app));
  const allUsersRes = await request(app)
    .get("/api/user")
    .set("Authorization", "Bearer " + userToken);

  const totalUsers = allUsersRes.body.users.length;

  // Test with limit of 2
  const limitedUsersRes = await request(app)
    .get("/api/user?limit=2")
    .set("Authorization", "Bearer " + userToken);

  expect(limitedUsersRes.status).toBe(200);
  expect(limitedUsersRes.body.users.length).toBe(Math.min(2, totalUsers));
});

test("list users with pagination", async () => {
  const [, userToken] = await registerUser(request(app));

  // Get first page with limit of 2
  const page1Res = await request(app)
    .get("/api/user?page=1&limit=2")
    .set("Authorization", "Bearer " + userToken);

  // Get second page with limit of 2
  const page2Res = await request(app)
    .get("/api/user?page=2&limit=2")
    .set("Authorization", "Bearer " + userToken);

  expect(page1Res.status).toBe(200);
  expect(page2Res.status).toBe(200);

  // Ensure pages have different users
  const page1Ids = page1Res.body.users.map((u) => u.id);
  const page2Ids = page2Res.body.users.map((u) => u.id);

  // No overlap between pages
  const overlap = page1Ids.filter((id) => page2Ids.includes(id));
  expect(overlap.length).toBe(0);
});

async function registerUser(service) {
  const testUser = {
    name: "pizza diner",
    email: `${randomName()}@test.com`,
    password: "a",
  };
  const registerRes = await service.post("/api/auth").send(testUser);
  registerRes.body.user.password = testUser.password;

  return [registerRes.body.user, registerRes.body.token];
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

test("Delete user", async () => {
  const userId = testUserId;
  const apiCall = `/api/user/${userId}`;
  console.log(apiCall);
  const deleteuserRes = await request(app)
    .delete(apiCall)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(deleteuserRes.status).toBe(200);
});

// TODO add a method to test error handling when deleting users that don't exist
