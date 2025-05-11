const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Por favor, insira um email válido",
    ],
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
  },
  birthDate: {
    type: Date,
    required: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  gender: {
    type: String,
    required: true,
    enum: ["Masculino", "Feminino", "Definir"],
  },
  customGender: {
    type: String,
    trim: true,
    maxlength: 15,
    validate: {
      validator: function (v) {
        if (this.gender === "Definir") {
          return /^[a-zA-Z\s]*$/.test(v);
        }
        return true;
      },
      message: "Gênero personalizado pode conter apenas letras e espaços.",
    },
    required: function () {
      return this.gender === "Definir";
    },
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash da senha antes de salvar
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.lastModifiedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Adicionar um hook para atualizar lastModifiedAt em qualquer operação de save
userSchema.pre("save", function (next) {
  this.lastModifiedAt = new Date();
  next();
});

// Método para verificar senha
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

const User = mongoose.model("User", userSchema);

module.exports = User;
