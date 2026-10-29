import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, "O nome é obrigatório"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "O email é obrigatório"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    senhaHash: {
      type: String,
      required: [true, "A senha é obrigatória"],
    },
    role: {
      type: String,
      enum: {
        values: ["gerente", "garcom"],
        message: "O papel deve ser 'gerente' ou 'garcom'",
      },
      default: "garcom",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
