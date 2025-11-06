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

// function createMetric(
//   metricName,
//   metricValue,
//   metricUnit,
//   metricType,
//   valueType,
//   attributes
// ) {
//   attributes = { ...attributes, source: config.source };

//   const metric = {
//     name: metricName,
//     unit: metricUnit,
//     [metricType]: {
//       dataPoints: [
//         {
//           [valueType]: metricValue,
//           timeUnixNano: Date.now() * 1000000,
//           attributes: [],
//         },
//       ],
//     },
//   };

//   Object.keys(attributes).forEach((key) => {
//     metric[metricType].dataPoints[0].attributes.push({
//       key: key,
//       value: { stringValue: attributes[key] },
//     });
//   });

//   if (metricType === "sum") {
//     metric[metricType].aggregationTemporality =
//       "AGGREGATION_TEMPORALITY_CUMULATIVE";
//     metric[metricType].isMonotonic = true;
//   }

//   return metric;
// }

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

sendMetrics = function sendMetricsPeriodically(period) {
  const timer = setInterval(() => {
    try {
      const metrics = new OtelMetricBuilder();

      // metrics.add(httpMetrics);

      const systemMetrics = {
        cpuUsage: getCpuUsagePercentage(),
        memoryUsage: getMemoryUsagePercentage(),
      };
      metrics.add(systemMetrics);

      // metrics.add(userMetrics);
      // metrics.add(purchaseMetrics);
      // metrics.add(authMetrics);

      sendMetricToGrafana(metrics);
    } catch (error) {
      console.log("Error sending metrics", error);
    }
  }, period);
};



module.exports = {
  sendMetrics,
  OtelMetricBuilder,
};
