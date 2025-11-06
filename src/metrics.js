// app.use(metrics.requestTracker);
require("dotenv").config();
const config = require("./config.js");
const os = require("os");

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

function sendMetricToGrafana(metrics) {
  const body = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics,
          },
        ],
      },
    ],
  };

  console.log(config.metrics.url);
  fetch(`${config.metrics.url}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${config.metrics.apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP status: ${response.status}`);
      }
    })
    .catch((error) => {
      console.error("Error pushing metrics:", error);
    });
}

class OtelMetricBuilder {
  constructor() {
    this.metrics = [];
    this.timestamp = Date.now() * 1000000; // Convert to nanoseconds
  }

  add(metricData) {
    // Handle different metric formats
    if (Array.isArray(metricData)) {
      // If it's already an array of metrics
      this.metrics.push(...metricData);
    } else if (typeof metricData === "object") {
      // Convert object of key-value pairs to OpenTelemetry metrics
      for (const [key, value] of Object.entries(metricData)) {
        this.metrics.push(this.createGaugeMetric(key, value));
      }
    }
    return this; // Allow chaining
  }

  createGaugeMetric(name, value) {
    return {
      name: name,
      gauge: {
        dataPoints: [
          {
            asDouble: typeof value === "number" ? value : parseFloat(value),
            timeUnixNano: this.timestamp,
          },
        ],
      },
    };
  }

  createSumMetric(name, value) {
    return {
      name: name,
      sum: {
        aggregationTemporality: 2, // Cumulative
        isMonotonic: true,
        dataPoints: [
          {
            asDouble: typeof value === "number" ? value : parseFloat(value),
            timeUnixNano: this.timestamp,
          },
        ],
      },
    };
  }

  getMetrics() {
    return this.metrics;
  }

  toJSON() {
    return this.metrics;
  }
}

let pizzasPurchased = 0;
let latency = 0;
let pizzaRevenue = 0;
let orderFailures = 0;
let revenueLost = 0;

function resetPurchaseMetrics() {
  pizzasPurchased = 0;
  latency = 0;
  pizzaRevenue = 0;
  orderFailures = 0;
  revenueLost = 0;
}

function sendMetricsPeriodically(period) {
  setInterval(() => {
    try {
      const metrics = new OtelMetricBuilder();

      const systemMetrics = {
        cpuUsage: getCpuUsagePercentage(),
        memoryUsage: getMemoryUsagePercentage(),
      };
      metrics.add(systemMetrics);

      const purchaseMetrics = {
        pizzasPurchased: pizzasPurchased,
        latency: latency,
        pizzaRevenue: pizzaRevenue,
        orderFailures: orderFailures,
        revenueLost: revenueLost,
      };
      metrics.add(purchaseMetrics);
      resetPurchaseMetrics();

      sendMetricToGrafana(metrics);
    } catch (error) {
      console.log("Error sending metrics", error);
    }
  }, period);
}

function pizzaPurchase(success, pizzasOrdered, lat, orderRevenue) {
  if (success) {
    pizzasPurchased += pizzasOrdered;
    pizzaRevenue += orderRevenue;
  } else {
    orderFailures += 1;
    revenueLost += orderRevenue;
  }
  if (latency == null) {
    latency = lat;
  } else {
    latency += lat;
  }
}

// Example: app.use(metrics.requestTracker);

// This function is used to track all the GET, POST, DELETE, PUT, and TOTAL requests
// then send them to grafana
function requestTracker() {
  return (req, res, next) => {
    const metrics = new OtelMetricBuilder();
    const method = req.method.toLowerCase();
    metrics.add({ [`requests_${method}`]: 1 });
    metrics.add({ requests_total: 1 });
    sendMetricToGrafana(metrics);
    next();
  };
}

module.exports = {
  sendMetricsPeriodically,
  pizzaPurchase,
  requestTracker,
};
