const request = require("supertest");
const app = require("../service");
const {
  jestTimeoutVSCodeIncrease,
  expectValidJwt,
  randomUser,
} = require("../testhelper");
const Test = require("supertest/lib/test");

// Increase timeout for debugging in VSCode
jestTimeoutVSCodeIncrease();

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
const franchiseUser = {
  name: "franchisee",
  email: "f@test.com",
  password: "f",
};

beforeAll(async () => {
  // testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);

  //  // register franchise user as franchise admin
  //     const registerRes = await request(app).post("/api/franchise").send(franchiseUser);
});

// test("Get all franchises", async () => {
//   const getFranchiseRes = await request(app).get(
//     `/api/franchise&page=0&limit=10&name=${testUser.name}`
//   );

//   expect(getFranchiseRes.status).toBe(200);
// });

test("Get test user franchises unauthorized", async () => {
  console.log(testUserAuthToken);
  const testUserId = 1; // change this later once I figure out what userId is
  const getFranchiseRes = await request(app)
    .get(`/api/franchise/${testUserId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);

  expect(getFranchiseRes.status).toBe(200);
  // check body here

  // console.log(getFranchiseRes);
  // expect(getFranchiseRes.body.message).toBe("unauthorized");
});

test("Create franchise unauthorized", async () => {
  const getFranchiseRes = await request(app)
    .post(`/api/franchise`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);

  expect(getFranchiseRes.status).toBe(403);
  expect(getFranchiseRes.body.message).toBe("unable to create a franchise");
});

// test("List a user's franchise", () => {
