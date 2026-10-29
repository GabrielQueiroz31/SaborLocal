import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    nome: {
      type: String,
      required: true,
    },
    precoUnit: {
      type: Number,
      required: true,
    },
    quantidade: {
      type: Number,
      required: true,
      min: [1, "A quantidade mínima por item é 1"],
    },
    observacao: {
      type: String,
      default: "",
    },
  },
  {
    _id: false, // Conforme especificado: sem _id no subdocumento
  }
);

const OrderSchema = new mongoose.Schema(
  {
    mesa: {
      type: Number,
      required: [true, "O número da mesa é obrigatório"],
      min: [1, "O número da mesa deve ser no mínimo 1"],
    },
    itens: {
      type: [OrderItemSchema],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length >= 1;
        },
        message: "O pedido deve conter pelo menos 1 item",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["Recebido", "Em Preparo", "Entregue"],
        message: "Status deve ser Recebido, Em Preparo ou Entregue",
      },
      default: "Recebido",
    },
    total: {
      type: Number,
      default: 0,
    },
    pago: {
      type: Boolean,
      default: false,
    },
    criadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hook pre("save") para recalcular o total a partir do snapshot
OrderSchema.pre("save", function () {
  if (this.itens && this.itens.length > 0) {
    this.total = this.itens.reduce((acc, item) => {
      return acc + Number(item.precoUnit) * Number(item.quantidade);
    }, 0);
  } else {
    this.total = 0;
  }
});

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
