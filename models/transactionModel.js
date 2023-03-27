const mongoose = require("mongoose");

const transactionSchema = mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reference: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "Menunggu pembayaran",
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
