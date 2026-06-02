require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const transactions = await Transaction.find();
  console.log("ALL TRANSACTIONS:", JSON.stringify(transactions, null, 2));

  const summary = await Transaction.aggregate([
    {
      $match: { status: "completed" }
    },
    {
      $group: {
        _id: { type: "$type", category: "$category" },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    }
  ]);
  console.log("AGGREGATE SUMMARY:", JSON.stringify(summary, null, 2));
  process.exit(0);
});
