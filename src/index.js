require("dotenv").config();
const { Metric } = require("./metrics.js");
const app = require("./service.js");

const port = process.argv[2] || 3000;

const metric = new Metric();
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
  metric.sendMetricsPeriodically(10000);
});
