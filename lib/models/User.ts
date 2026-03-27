import mongoose, { Schema, Document, Types } from "mongoose";

export type TUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  image: string;
};

const userSchema = new Schema<TUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    image: { type: String, required: true },
  },
  { timestamps: true },
);

export const User =
  mongoose.models.User || mongoose.model<TUser>("User", userSchema);
