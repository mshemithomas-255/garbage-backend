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

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("secretWord")) return next();
  if (this.secretWord) {
    this.secretWord = await bcrypt.hash(this.secretWord, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.compareSecretWord = async function (secretWord) {
  if (!this.secretWord) return false;
  return await bcrypt.compare(secretWord, this.secretWord);
};

module.exports = mongoose.model("User", userSchema);
