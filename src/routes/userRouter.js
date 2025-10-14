const express = require("express");
const { asyncHandler } = require("../endpointHelper.js");
const { DB, Role } = require("../database/database.js");
const { authRouter, setAuth } = require("./authRouter.js");

const userRouter = express.Router();

userRouter.docs = [
  {
    method: "GET",
    path: "/api/user/me",
    requiresAuth: true,
    description: "Get authenticated user",
    example: `curl -X GET localhost:3000/api/user/me -H 'Authorization: Bearer tttttt'`,
    response: {
      id: 1,
      name: "常用名字",
      email: "a@jwt.com",
      roles: [{ role: "admin" }],
    },
  },
  {
    method: "PUT",
    path: "/api/user/:userId",
    requiresAuth: true,
    description: "Update user",
    example: `curl -X PUT localhost:3000/api/user/1 -d '{"name":"常用名字", "email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json' -H 'Authorization: Bearer tttttt'`,
    response: {
      user: {
        id: 1,
        name: "常用名字",
        email: "a@jwt.com",
        roles: [{ role: "admin" }],
      },
      token: "tttttt",
    },
  },
  {
    method: "GET",
    path: "/api/user?page=1&limit=10&name=*",
    requiresAuth: true,
    description: "Gets a list of users",
    example: `curl -X GET localhost:3000/api/user -H 'Authorization: Bearer tttttt'`,
    response: {
      users: [
        {
          id: 1,
          name: "常用名字",
          email: "a@jwt.com",
          roles: [{ role: "admin" }],
        },
      ],
    },
  },
  {
    method: "DELETE",
    path: "api/user/:userId",
    requiresAuth: true,
    description: "Deletes a user with userId",
    example: `curl -X DELETE localhost:3000/api/user/1 -H 'Authorization: Bearer tttttt'`,
    response: {},
  },
];

// getUser
userRouter.get(
  "/me",
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    res.json(req.user);
  })
);

// updateUser
userRouter.put(
  "/:userId",
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    let { name, email, password } = req.body;
    const userId = Number(req.params.userId);
    const user = req.user;
    if (user.id !== userId && !user.isRole(Role.Admin)) {
      return res.status(403).json({ message: "unauthorized" });
    }
    const updatedUser = await DB.updateUser(userId, name, email, password);
    const auth = await setAuth(updatedUser);
    res.json({ user: updatedUser, token: auth });
  })
);

// listUsers
userRouter.get(
  "/",
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const users = await DB.getListOfUsers(page, limit);
    res.json(users);
  })
);

// working here, pretty sure it does not work
// deleteUser
userRouter.delete(
  "/:userId",
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    // const user = req.user;
    // TODO: add make sure that only admins can delete users
    // if (user.id !== userId && !user.isRole(Role.Admin)) {
    //   return res.status(403).json({ message: "unauthorized" });
    // }
    try {
      await DB.deleteUser(userId);
      res.json({});
    } catch (error) {
      console.error("Delete user error:", error);
      throw error;
    }
  })
);

module.exports = userRouter;
