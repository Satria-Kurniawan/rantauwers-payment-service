const express = require("express");
const router = express.Router();
const {
  getPaymentChannel,
  requestTransaction,
  getTransactionDetail,
  tripayCallback,
} = require("../controllers/paymentController");
const { withAuth } = require("../middlewares/auth");

router.get("/payment-channel", withAuth, getPaymentChannel);
router.post("/:orderId/request-transaction", withAuth, requestTransaction);
router.get("/:reference/transaction-detail", withAuth, getTransactionDetail);
router.post("/callback", tripayCallback);

module.exports = router;
