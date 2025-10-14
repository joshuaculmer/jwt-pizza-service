const request = require("supertest");
const app = require("../service");
const { jestTimeoutVSCodeIncrease, expectValidJwt } = require("../testhelper");

// Increase timeout for debugging in VSCode
jestTimeoutVSCodeIncrease();

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;
// const adminUser = createAdminUser();
// let adminUserAuthToken;

beforeAll(async () => {
  // testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
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

test("update user not admin", async () => {
  const newName = "updated name";
  const userId = 1; // Assuming testUser has ID 1; adjust as necessary
  const updateRes = await request(app)
    .put(`/api/user/${userId}`)
    .send({ name: newName })
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(updateRes.status).toBe(403); // Expecting forbidden
  expect(updateRes.body).toMatchObject({ message: "unauthorized" });
});

test("list users unauthorized", async () => {
  const listUsersRes = await request(app).get("/api/user");
  expect(listUsersRes.status).toBe(401);
});

test('list users', async () => {
  const [user, userToken] = await registerUser(request(app));
  const listUsersRes = await request(app)
    .get('/api/user')
    .set('Authorization', 'Bearer ' + userToken);
  expect(listUsersRes.status).toBe(200);
});

async function registerUser(service) {
  const testUser = {
    name: 'pizza diner',
    email: `${randomName()}@test.com`,
    password: 'a',
  };
  const registerRes = await service.post('/api/auth').send(testUser);
  registerRes.body.user.password = testUser.password;

  return [registerRes.body.user, registerRes.body.token];
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}