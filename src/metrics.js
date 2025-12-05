// app.use(metrics.requestTracker);
require("dotenv").config();
const config = require("./config.js");
const os = require("os");

class OtelMetricBuilder {
  constructor() {
    this.metrics = [];
    this.timestamp = Date.now() * 1000000; // Convert to nanoseconds
  }

  add(metricData, type = "gauge") {
    // Handle different metric formats
    if (Array.isArray(metricData)) {
      // If it's already an array of metrics
      this.metrics.push(...metricData);
    } else if (typeof metricData === "object") {
      // Convert object of key-value pairs to OpenTelemetry metrics
      for (const [key, value] of Object.entries(metricData)) {
        // Determine metric type - auto-detect based on name or use provided type

        if (type === "sum") {
          this.metrics.push(this.createSumMetric(key, value));
        } else {
          this.metrics.push(this.createGaugeMetric(key, value));
        }
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
    this.pizzasPurchased = 0; // sum
    this.pizzaRevenue = 0; // sum
    this.orderFailures = 0; // sum
    this.revenueLost = 0; // sum
    this.latency = 0; // gauge

    // all sum
    this.counters = {
      requests_total: 0,
    };

    this.activeUsers = 0; // gauge
    this.successfulAuth = 0; // sum
    this.failedAuth = 0; // sum
    this.chaosEnabled = false; // gauge
  }

  reportChaos(state) {
    this.chaosEnabled = state;
    this.sendSingleMetric({ chaosEnabled: this.chaosEnabled });
  }

  // Middle man solution
  requestTracker = (req, res, next) => {
    const metrics = new OtelMetricBuilder();
    const method = req.method.toLowerCase();
    const methodKey = `requests_${method}`;

    this.counters.requests_total += 1;
    if (!this.counters[methodKey]) {
      this.counters[methodKey] = 0;
    }
    this.counters[methodKey] += 1;

    metrics.add({ requests_total: this.counters.requests_total }, "sum");
    metrics.add({ [methodKey]: this.counters[methodKey] }, "sum");
    this.sendMetricToGrafana(metrics);
    next();
  };

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

  // User metrics
  incrementActiveUsers() {
    this.activeUsers += 1;
    this.sendSingleMetric({ activeusers: this.activeUsers });
  }
  decrementActiveUsers() {
    this.activeUsers -= 1;
    this.sendSingleMetric({ activeusers: this.activeUsers });
  }

  incrementSuccessfulAuth() {
    this.successfulAuth += 1;
    this.sendSingleMetric({ authSuccess: this.successfulAuth }, "sum");
  }
  incrementFailedAuth() {
    this.failedAuth += 1;
    this.sendSingleMetric({ authFailure: this.failedAuth }, "sum");
  }

  sendSingleMetric(metric, type) {
    const metrics = new OtelMetricBuilder();
    metrics.add(metric, type);
    this.sendMetricToGrafana(metrics);
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

        metrics.add(systemMetrics);
        const chaosMetrics = { chaosEnabled: this.chaosEnabled };
        metrics.add(chaosMetrics);
        // metrics.add({ activeUsers: this.activeUsers });

        this.sendMetricToGrafana(metrics);
      } catch (error) {
        console.log("Error sending metrics", error);
      }
    }, period);
  }

  // record metrics associated with a pizza purchase
  pizzaPurchase(success, items, lat) {
    let pizzasOrdered = 0;
    let orderRevenue = 0;

    if (success) {
      for (const item of items) {
        pizzasOrdered += 1;
        orderRevenue += item.price;
      }
      this.pizzasPurchased += pizzasOrdered;
      this.pizzaRevenue += orderRevenue;
    } else {
      this.orderFailures += 1;
      this.revenueLost += orderRevenue;
    }

    this.latency = lat;

    const metrics = new OtelMetricBuilder();
    metrics.add({ pizzasPurchased: this.pizzasPurchased }, "sum");
    metrics.add({ latency: this.latency }, "gauge");
    metrics.add({ pizzaRevenue: this.pizzaRevenue }, "sum");
    metrics.add({ orderFailures: this.orderFailures }, "sum");
    metrics.add({ revenueLost: this.revenueLost }, "sum");
    this.sendMetricToGrafana(metrics);
  }
}

module.exports = {
  Metric,
};
