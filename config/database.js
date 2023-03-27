const mongoose = require("mongoose");

const URI = process.env.MONGODB_ATLAS_URI;

const connectToDatabase = async () => {
  try {
    const result = await mongoose.connect(URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`Connected to MongoDB Atlas ${result.connection.host}`);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectToDatabase;
