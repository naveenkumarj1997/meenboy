require("dotenv").config();
const { connectDB } = require("../src/config/db");
const DailyPurchase = require("../src/models/DailyPurchase");
const { getBusinessStartDate } = require("../src/utils/moneyManagement");

(async () => {
  await connectDB();
  const start = getBusinessStartDate();
  const result = await DailyPurchase.deleteMany({ date: { $lt: start } });
  console.log("Business start:", start);
  console.log("Deleted records:", result.deletedCount);
  const remaining = await DailyPurchase.find()
    .select("date chickenShop muttonShop fishCompany localFishShop")
    .sort({ date: 1 })
    .lean();
  console.log("Remaining records:", remaining.length);
  remaining.forEach((r) => console.log(r.date, r));
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
