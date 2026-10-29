import mongoose from "mongoose";

const MenuItemSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, "O nome do item é obrigatório"],
      trim: true,
    },
    preco: {
      type: Number,
      required: [true, "O preço do item é obrigatório"],
      min: [0, "O preço não pode ser negativo"],
    },
    categoria: {
      type: String,
      required: [true, "A categoria é obrigatória"],
      enum: {
        values: ["Entrada", "Prato", "Bebida", "Sobremesa"],
        message: "Categoria inválida. Escolha entre Entrada, Prato, Bebida ou Sobremesa",
      },
    },
    ativo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.MenuItem || mongoose.model("MenuItem", MenuItemSchema);
