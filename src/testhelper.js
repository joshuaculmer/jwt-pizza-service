async function createAdminUser() {
  const { Role, DB } = require("./database/database.js");

  let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + "@admin.com";

  // console.log(user);
  await DB.addUser(user);
  user.password = "toomanysecrets";
  return user;
}

function jestTimeoutVSCodeIncrease() {
  if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
  }
}

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(
    /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/
  );
}

function randomUser() {
  return {
    name: randomName(),
    email: Math.random().toString(36).substring(2, 12) + "@test.com",
    password: "a",
  };
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

module.exports = {
  expectValidJwt,
  randomUser,
  randomName,
  jestTimeoutVSCodeIncrease,
  createAdminUser,
};
