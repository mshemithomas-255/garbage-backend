const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["superadmin", "admin", "user"],
    default: "user",
  },
  plotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plot",
  },
  paymentStatus: {
    type: String,
    enum: ["paid", "pending", "partial"],
    default: "pending",
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  // Secret word for password recovery
  secretWord: {
    type: String,
    default: null,
  },
  secretWordSet: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Method to compare password
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to compare secret word
userSchema.methods.compareSecretWord = async function (secretWord) {
  if (!this.secretWord) return false;
  return await bcrypt.compare(secretWord, this.secretWord);
};

module.exports = mongoose.model("User", userSchema);
