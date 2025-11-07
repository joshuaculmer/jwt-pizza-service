// app.use(metrics.requestTracker);
require("dotenv").config();
const config = require("./config.js");
const os = require("os");

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

class Metric {
  constructor() {
    // HTTP Request metrics
    this.put = 0;
    this.post = 0;
    this.get = 0;
    this.delete = 0;
    this.totalRequests = 0;

    // Pizza metrics
    this.pizzasPurchased = 0;
    this.pizzaRevenue = 0;
    this.orderFailures = 0;
    this.revenueLost = 0;
    this.latency = 0;

    // User and authentication
    this.activeUsers = 0;
    this.successfulAuth = 0;
    this.failedAuth = 0;
  }

  // CPU and Memory
  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }
  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }

  // HTTP request metrics
  incrementTotalRequests() {
    this.totalRequests += 1;
  }
  incrementPostRequest() {
    this.incrementTotalRequests();
    this.post += 1;
  }
  incrementDeleteRequest() {
    this.incrementTotalRequests();
    this.delete += 1;
  }
  incrementPutRequest() {
    this.incrementTotalRequests();
    this.put += 1;
  }
  incrementGetRequest() {
    this.incrementTotalRequests();
    this.get += 1;
  }

  // User metrics
  incrementActiveUsers() {
    this.activeUsers += 1;
  }
  decrementActiveUsers() {
    this.activeUsers -= 1;
  }
  incrementSuccessfulAuth() {
    this.successfulAuth += 1;
  }
  incrementFailedAuth() {
    this.failedAuth += 1;
  }

  // Resets all Metrics
  resetMetrics() {
    this.pizzasPurchased = 0;
    this.latency = 0;
    this.pizzaRevenue = 0;
    this.orderFailures = 0;
    this.revenueLost = 0;
  }

  // Send one metric to Grafana
  sendMetricToGrafana(metrics) {
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

  // Send metrics every _period_ milliseconds
  sendMetricsPeriodically(period) {
    setInterval(() => {
      try {
        const metrics = new OtelMetricBuilder();

        const systemMetrics = {
          cpuUsage: this.getCpuUsagePercentage(),
          memoryUsage: this.getMemoryUsagePercentage(),
        };

        const purchaseMetrics = {
          pizzasPurchased: this.pizzasPurchased,
          latency: this.latency,
          pizzaRevenue: this.pizzaRevenue,
          orderFailures: this.orderFailures,
          revenueLost: this.revenueLost,
        };

        const requestMetrics = {
          GET_requests: this.get,
          POST_requests: this.post,
          PUT_requests: this.put,
          DELETE_requests: this.delete,
          TOTAL_requests: this.totalRequests,
        };

        const userMetrics = {
          activeUsers: this.activeUsers,
          authSuccess: this.successfulAuth,
          authFailure: this.failedAuth,
        };

        metrics.add(systemMetrics);
        metrics.add(purchaseMetrics);
        metrics.add(requestMetrics);
        metrics.add(userMetrics);

        this.resetMetrics();

        this.sendMetricToGrafana(metrics);
      } catch (error) {
        console.log("Error sending metrics", error);
      }
    }, period);
  }

  // record metrics associated with a pizza purchase
  pizzaPurchase(success, pizzasOrdered, lat, orderRevenue) {
    if (success) {
      this.pizzasPurchased += pizzasOrdered;
      this.pizzaRevenue += orderRevenue;
    } else {
      this.orderFailures += 1;
      this.revenueLost += orderRevenue;
    }
    if (this.latency == null) {
      this.latency = lat;
    } else {
      this.latency += lat;
    }
  }
}

// middle man idea that I'm abandoning for my faster uglier solution
// function requestTracker() {
//   return (req, res, next) => {
//     const metrics = new OtelMetricBuilder();
//     const method = req.method.toLowerCase();
//     metrics.add({ [`requests_${method}`]: 1 });
//     metrics.add({ requests_total: 1 });
//     sendMetricToGrafana(metrics);
//     next();
//   };
// }

module.exports = {
  Metric,
};
