const User = require("../models/User");
const { ALL_REAL_EMAILS, TEST_USER_EMAILS } = require("../config/realUsers");

/** Sync known real/test flags on startup (safe to run repeatedly). */
const syncRealUserFlags = async () => {
  let realMarked = 0;
  let testMarked = 0;

  if (ALL_REAL_EMAILS.length) {
    const realResult = await User.updateMany(
      { email: { $in: ALL_REAL_EMAILS } },
      { $set: { isRealUser: true } }
    );
    realMarked = realResult.modifiedCount;
  }

  if (TEST_USER_EMAILS.length) {
    const testResult = await User.updateMany(
      { email: { $in: TEST_USER_EMAILS } },
      { $set: { isRealUser: false } }
    );
    testMarked = testResult.modifiedCount;
  }

  return { realMarked, testMarked };
};

module.exports = { syncRealUserFlags };
