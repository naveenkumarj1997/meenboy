const mongoose = require("mongoose");

const getDbState = () => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] || "unknown";
};

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in environment");
    }

    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    // eslint-disable-next-line no-console
    console.log(`MongoDB connected: ${connection.connection.host}`);

    try {
      const { syncRealUserFlags } = require("../utils/syncRealUsers");
      const { marked } = await syncRealUserFlags();
      // eslint-disable-next-line no-console
      console.log(`Real user flags synced (real: ${marked.realMarked}, test: ${marked.testMarked}).`);
    } catch (syncErr) {
      // eslint-disable-next-line no-console
      console.warn(`Real user sync skipped: ${syncErr.message}`);
    }

    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`MongoDB connection error: ${error.message}`);
    return false;
  }
};

module.exports = { connectDB, getDbState };
