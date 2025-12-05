const express = require("express");
const config = require("../config.js");
const { Role, DB } = require("../database/database.js");
const { authRouter } = require("./authRouter.js");
const { asyncHandler, StatusCodeError } = require("../endpointHelper.js");
const { Metric } = require("../metrics.js");
const Logger = require("../logger.js");

const metric = new Metric();
const orderRouter = express.Router();

orderRouter.docs = [
  {
    method: "GET",
    path: "/api/order/menu",
    description: "Get the pizza menu",
    example: `curl localhost:3000/api/order/menu`,
    response: [
      {
        id: 1,
        title: "Veggie",
        image: "pizza1.png",
        price: 0.0038,
        description: "A garden of delight",
      },
    ],
  },
  {
    method: "PUT",
    path: "/api/order/menu",
    requiresAuth: true,
    description: "Add an item to the menu",
    example: `curl -X PUT localhost:3000/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Student", "description": "No topping, no sauce, just carbs", "image":"pizza9.png", "price": 0.0001 }'  -H 'Authorization: Bearer tttttt'`,
    response: [
      {
        id: 1,
        title: "Student",
        description: "No topping, no sauce, just carbs",
        image: "pizza9.png",
        price: 0.0001,
      },
    ],
  },
  {
    method: "GET",
    path: "/api/order",
    requiresAuth: true,
    description: "Get the orders for the authenticated user",
    example: `curl -X GET localhost:3000/api/order  -H 'Authorization: Bearer tttttt'`,
    response: {
      dinerId: 4,
      orders: [
        {
          id: 1,
          franchiseId: 1,
          storeId: 1,
          date: "2024-06-05T05:14:40.000Z",
          items: [{ id: 1, menuId: 1, description: "Veggie", price: 0.05 }],
        },
      ],
      page: 1,
    },
  },
  {
    method: "POST",
    path: "/api/order",
    requiresAuth: true,
    description: "Create a order for the authenticated user",
    example: `curl -X POST localhost:3000/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}'  -H 'Authorization: Bearer tttttt'`,
    response: {
      order: {
        franchiseId: 1,
        storeId: 1,
        items: [{ menuId: 1, description: "Veggie", price: 0.05 }],
        id: 1,
      },
      jwt: "1111111111",
    },
  },
];

// TODO move to another more appropriate file
let enableChaos = false;
orderRouter.put(
  "/chaos/:state",
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user.isRole(Role.Admin)) {
      enableChaos = req.params.state === "true";
    }
    // else {
    //   console.log("was not an admin");
    // }
    res.json({ chaos: enableChaos });
  })
);

orderRouter.post("/", (req, res, next) => {
  if (enableChaos && Math.random() < 0.5) {
    throw new StatusCodeError("Chaos monkey", 500);
  }
  next();
});

// getMenu
orderRouter.get(
  "/menu",
  asyncHandler(async (req, res) => {
    res.send(await DB.getMenu());
  })
);

// addMenuItem
orderRouter.put(
  "/menu",
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    if (!req.user.isRole(Role.Admin)) {
      Logger.log(403, "Error", {
        userId: req.user.id,
        message: "Unauthorized attempt to add menu item",
      });
      throw new StatusCodeError("unable to add menu item", 403);
    }

    const addMenuItemReq = req.body;
    await DB.addMenuItem(addMenuItemReq);
    res.send(await DB.getMenu());
  })
);

// getOrders
orderRouter.get(
  "/",
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    res.json(await DB.getOrders(req.user, req.query.page));
  })
);

// createOrder
orderRouter.post(
  "/",
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    const orderReq = req.body;
    const startTime = Date.now();
    const order = await DB.addDinerOrder(req.user, orderReq);
    const factoryOrder = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${config.factory.apiKey}`,
      },
      body: JSON.stringify({
        diner: { id: req.user.id, name: req.user.name, email: req.user.email },
        order,
      }),
    };
    Logger.log(200, "FactoryOrder", factoryOrder);
    const r = await fetch(`${config.factory.url}/api/order`, factoryOrder);
    const j = await r.json();
    // console.log("j:" + j.reportUrl + " " + j.jwt);
    // console.log("r:" + r.ok);
    // Had a 500 error here once when the factory was down potentially
    // talked with Danika on September 29th 2025
    if (r.ok) {
      res.send({ order, followLinkToEndChaos: j.reportUrl, jwt: j.jwt });
      // console.log(order);
      Logger.log(200, "FactoryResponse", { "Jwt created": true });
      metric.pizzaPurchase(true, order.items, Date.now() - startTime);
    } else {
      res.status(500).send({
        message: "Failed to fulfill order at factory",
        followLinkToEndChaos: j.reportUrl,
      });
      Logger.log(500, "FactoryResponse", { "Jwt created": false });
      // console.log(order);
      metric.pizzaPurchase(false, order.items, Date.now() - startTime);
    }
  })
);

module.exports = orderRouter;
