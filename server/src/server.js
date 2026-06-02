const dotenv = require("dotenv");
const { connectDB, getDbState } = require("./config/db");
const app = require("./app");

dotenv.config();

const PORT = process.env.PORT || 5000;
const RETRY_MS = Number(process.env.DB_RETRY_INTERVAL_MS || 15000);

const start = async () => {
  let isConnected = await connectDB();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${PORT}`);
    if (!isConnected) {
      // eslint-disable-next-line no-console
      console.warn(
        `Server started without DB connection (state: ${getDbState()}). Retrying every ${RETRY_MS}ms.`
      );
    }
  });

  setInterval(async () => {
    if (getDbState() === "connected" || getDbState() === "connecting") {
      return;
    }
    isConnected = await connectDB();
    if (isConnected) {
      // eslint-disable-next-line no-console
      console.log("MongoDB reconnect successful.");
    }
  }, RETRY_MS);
};

start();
