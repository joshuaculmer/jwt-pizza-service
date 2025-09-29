const request = require("supertest");
const app = require("../service");
const {
  jestTimeoutVSCodeIncrease,
  expectValidJwt,
  createAdminUser,
  randomName,
} = require("../testhelper");

// Increase timeout for debugging in VSCode
jestTimeoutVSCodeIncrease();

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;
let adminUser;
let adminUserAuthToken;
let testFranchise;
let testFranchiseId;
let testStore;
let testStoreId;
let createFranchiseRes;

beforeAll(async () => {
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);

  // create admin user
  adminUser = await createAdminUser();

  // login admin user
  const loginRes = await request(app).put("/api/auth").send(adminUser);
  const adminUserAuthToken = loginRes.body.token;
  expectValidJwt(adminUserAuthToken);

  // create test franchise object
  testFranchise = {
    name: randomName(),
    admins: [{ email: adminUser.email }],
    stores: [],
  };

  // create franchise with admin user
  createFranchiseRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send(testFranchise);
  // console.log(createFranchiseRes.body);
  // expect(createFranchiseRes.status).toBe(200);
  testFranchiseId = createFranchiseRes.body.id;
  testStore = await {
    id: randomName(),
    name: randomName(),
    totalRevenue: 1000,
  };
});

afterAll(async () => {
  await request(app)
    .delete("/api/auth/")
    .set("Authorization", `Bearer ${testUserAuthToken}`);

  await request(app)
    .delete("/api/auth/")
    .set("Authorization", `Bearer ${adminUserAuthToken}`);

  // delete test franchise
  await request(app)
    .delete(`/api/franchise/${testFranchiseId}`)
    .set("Authorization", `Bearer ${adminUserAuthToken}`); // delete franchise not working either
});

test("Get franchises", async () => {
  const getFranchiseRes = await request(app)
    .get("/api/franchise")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(getFranchiseRes.status).toBe(200);
  expect(getFranchiseRes.body.franchises.length).toBeGreaterThan(0);
});

test("Get test user franchises unauthorized", async () => {
  console.log(testUserAuthToken);
  const testUserId = 1; // change this later once I figure out what userId is
  const getFranchiseRes = await request(app)
    .get(`/api/franchise/${testUserId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);

  expect(getFranchiseRes.status).toBe(200);
  // check body here
});

test("Create franchise unauthorized", async () => {
  const getFranchiseRes = await request(app)
    .post(`/api/franchise`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);

  expect(getFranchiseRes.status).toBe(403);
  expect(getFranchiseRes.body.message).toBe("unable to create a franchise");
});

test("create franchise", async () => {
  expect(createFranchiseRes.status).toBe(200);
  expect(createFranchiseRes.body.name).toBe(testFranchise.name);
});

test("Create a store not admin", async () => {
  const createStoreRes = await request(app)
    .post(`/api/franchise/${testFranchiseId}/store`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(testStore);
  expect(createStoreRes.status).toBe(403);
  // expect(createStoreRes.body.name).toBe(testStore.name);
});

test("Delete a store not admin", async () => {
  const deleteStoreRes = await request(app)
    .delete(`/api/franchise/${testFranchiseId}/store/${testStoreId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(deleteStoreRes.status).toBe(403);
  // expect(deleteStoreRes.body.name).toBe(testStore.name);
});
