const axios = require("axios");
const crypto = require("crypto");
const Transaction = require("../models/transactionModel");
const amqp = require("amqplib/callback_api");

const privateKey = process.env.TRIPAY_PRIVATE_KEY;
const apiKey = process.env.TRIPAY_API_KEY;
const apiUrl = process.env.TRIPAY_API_URL;
const messageBrokerUri = process.env.MESSAGE_BROKER;
const messageBrokerPort = process.env.MESSAGE_BROKER_PORT;

const getPaymentChannel = async (req, res) => {
  try {
    const response = await axios.get(`${apiUrl}/merchant/payment-channel`, {
      headers: {
        Authorization: "Bearer " + apiKey,
      },
    });

    const paymentChannels = response.data.data;
    res.json({ paymentChannels });
  } catch (error) {
    console.log(error);
    res.status(500).json(error.response.data);
  }
};

const requestTransaction = async (req, res) => {
  const { paymentMethod, amount, orderItem } = req.body;
  const merchant_code = "T11510";

  const expiry = parseInt(Math.floor(new Date() / 1000) + 24 * 60 * 60); //24 jam

  const signature = crypto
    .createHmac("sha256", privateKey)
    .update(merchant_code + amount)
    .digest("hex");

  const payload = {
    method: paymentMethod,
    amount: amount,
    customer_name: req.user.name,
    customer_email: req.user.email,
    customer_phone: req.user.phone,
    order_items: [orderItem],
    // callback_url:
    //   "https://963f-2001-448a-5010-847d-117f-9eab-bea2-6d04.ap.ngrok.io/api/payment/callback",
    // return_url: "https://domainanda.com/redirect",
    expired_time: expiry,
    signature: signature,
  };

  const response = await axios.post(`${apiUrl}/transaction/create`, payload, {
    headers: {
      Authorization: "Bearer " + apiKey,
    },
    validateStatus: function (status) {
      return status < 999; // ignore http error
    },
  });

  if (!response.data.success)
    return res.status(500).json("Payment gateway error");

  const transaction = await Transaction.create({
    orderId: req.params.orderId,
    reference: response.data.data.reference,
  });

  res.status(201).json({
    message: "Pemesanan berhasil, silahkan lakukan pembayaran.",
    transaction,
    transactionDetail: response.data.data,
  });
};

const getTransactionDetail = async (req, res) => {
  const { reference } = req.params;

  const response = await axios.get(
    `${apiUrl}/transaction/detail?reference=` + reference,
    {
      headers: { Authorization: "Bearer " + apiKey },
      validateStatus: function (status) {
        return status < 999; // ignore http error
      },
    }
  );

  res.json(response.data);
};

const tripayCallback = async (req, res) => {
  const data = req.body;
  const callbackSignature = req.headers["x-callback-signature"];
  const callbackEvent = req.headers["x-callback-event"];

  const signature = crypto
    .createHmac("sha256", privateKey)
    .update(JSON.stringify(data))
    .digest("hex");

  if (callbackSignature !== signature) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid signature." });
  }

  if (callbackEvent !== "payment_status") {
    return res.status(400).json({
      success: false,
      message: "Unrecognized callback event, no action was taken",
    });
  }

  const transaction = await Transaction.findOne({
    reference: data.reference,
  });

  if (!transaction) {
    return res.status(400).json({
      success: false,
      message: `No transaction found or already paid ${data.reference}`,
    });
  }

  switch (data.status) {
    case "PAID": {
      transaction.status = "Sudah dibayar";
      transaction.isPaid = true;
      transaction.save();
      break;
    }
    case "EXPIRED": {
      transaction.status = "Expired";
      transaction.isPaid = false;
      transaction.save();
      break;
    }
    case "FAILED": {
      transaction.status = "Failed";
      transaction.isPaid = false;
      transaction.save();
      break;
    }
    default:
      return res
        .status(500)
        .json({ success: false, message: "Unrecognized payment status" });
  }

  if (data.status === "PAID") {
    amqp.connect(`${messageBrokerUri}:${messageBrokerPort}`, (err, conn) => {
      if (err) throw err;

      conn.createChannel((err, channel) => {
        if (err) throw err;

        const queueName = "order_queue";

        channel.assertQueue(queueName, { durable: false });

        console.log(
          `Sending request for order with id: ${transaction.orderId}`
        );

        channel.assertQueue("order_queue_reply", { durable: false });

        channel.sendToQueue(queueName, Buffer.from(transaction.orderId), {
          replyTo: "order_queue_reply",
        });

        channel.consume(
          "order_queue_reply",
          async (msg) => {
            const order = JSON.parse(msg.content.toString());
            console.log(
              `Received response for order with id: ${transaction.orderId}`
            );

            if (!order) reject("Data order tidak didapatkan");

            const queueName2 = "payment_success";
            channel.assertQueue(queueName2, { durable: false });
            channel.sendToQueue(queueName2, Buffer.from(JSON.stringify(order)));

            channel.ack(msg);
          },
          { noAck: false }
        );
      });
    });
  }

  res.json({ success: true, data });
};

module.exports = {
  getPaymentChannel,
  requestTransaction,
  getTransactionDetail,
  tripayCallback,
};
