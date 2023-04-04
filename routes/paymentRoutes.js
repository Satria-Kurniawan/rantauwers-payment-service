const express = require("express");
const router = express.Router();
const {
  getPaymentChannel,
  requestTransaction,
  getTransactionsByUser,
  getTransactionsByAdmin,
  getTransactionDetail,
  tripayCallback,
} = require("../controllers/paymentController");
const { withAuth, withRoleAdmin } = require("../middlewares/auth");

router.get("/payment-channel", withAuth, getPaymentChannel);
router.post("/:orderId/request-transaction", withAuth, requestTransaction);
router.get("/my-transactions", withAuth, getTransactionsByUser);
router.get(
  "/owner-transactions",
  [withAuth, withRoleAdmin],
  getTransactionsByAdmin
);
router.get("/:reference/transaction-detail", withAuth, getTransactionDetail);
router.post("/callback", tripayCallback);

module.exports = router;
