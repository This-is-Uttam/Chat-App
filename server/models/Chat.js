const mongoose = require("mongoose");


const MessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, required: true },
});

const ChatSchema = new mongoose.Schema(
  {
    roomId: { type: String, unique: true },
    participants: [String],
    messages: [MessageSchema],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.models.Chat || mongoose.model("Chat", ChatSchema);