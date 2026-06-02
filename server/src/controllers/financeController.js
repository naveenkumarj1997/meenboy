const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

// @desc    Create a new transaction
// @route   POST /api/finance
// @access  Admin
exports.addTransaction = async (req, res) => {
  try {
    const { type, category, amount, referenceUser, referenceOrder, status, notes, date } = req.body;

    const transaction = await Transaction.create({
      type,
      category,
      amount,
      referenceUser: referenceUser || null,
      referenceOrder: referenceOrder || null,
      status: status || "completed",
      notes,
      date: date || new Date()
    });

    // Populate user if needed
    if (transaction.referenceUser) {
      await transaction.populate("referenceUser", "name email role");
    }

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ message: "Server error creating transaction" });
  }
};

// @desc    Get all transactions
// @route   GET /api/finance
// @access  Admin
exports.getTransactions = async (req, res) => {
  try {
    const { type, category, status, limit = 50 } = req.query;

    const query = {};
    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .populate("referenceUser", "name email role")
      .populate("referenceOrder", "orderId")
      .sort({ date: -1 })
      .limit(Number(limit));

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Server error fetching transactions" });
  }
};

// @desc    Get finance summary
// @route   GET /api/finance/summary
// @access  Admin
exports.getFinanceSummary = async (req, res) => {
  try {
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

    // Format the summary nicely
    const formattedSummary = {
      collections: {
        cod: 0,
        upi: 0,
        partner_collection: 0,
        other: 0,
        total: 0
      },
      payments: {
        salary: 0,
        other: 0,
        total: 0
      }
    };

    summary.forEach((item) => {
      const { type, category } = item._id;
      const amount = item.totalAmount;

      if (type === "collection") {
        if (formattedSummary.collections[category] !== undefined) {
          formattedSummary.collections[category] += amount;
        } else {
          formattedSummary.collections.other += amount;
        }
        formattedSummary.collections.total += amount;
      } else if (type === "payment") {
        if (formattedSummary.payments[category] !== undefined) {
          formattedSummary.payments[category] += amount;
        } else {
          formattedSummary.payments.other += amount;
        }
        formattedSummary.payments.total += amount;
      }
    });

    res.status(200).json(formattedSummary);
  } catch (error) {
    console.error("Error fetching finance summary:", error);
    res.status(500).json({ message: "Server error fetching finance summary" });
  }
};

// @desc    Update transaction status
// @route   PUT /api/finance/:id/status
// @access  Admin
exports.updateTransactionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["pending", "completed", "failed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const transaction = await Transaction.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate("referenceUser", "name email role");

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ message: "Server error updating transaction" });
  }
};
