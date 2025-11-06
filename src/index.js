require("dotenv").config();
const metrics = require("./metrics.js");
const app = require("./service.js");
require("./metrics.js");

const port = process.argv[2] || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
  metrics.sendMetrics(60000);
});
