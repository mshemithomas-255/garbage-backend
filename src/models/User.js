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

// Remove pre-save hooks - we'll handle hashing in controllers
// No pre-save hooks here to avoid double hashing

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.compareSecretWord = async function (secretWord) {
  if (!this.secretWord) return false;
  return await bcrypt.compare(secretWord, this.secretWord);
};

module.exports = mongoose.model("User", userSchema);
