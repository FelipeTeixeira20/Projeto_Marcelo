const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../middleware/auth");

// Rota de registro
router.post("/register", async (req, res) => {
  try {
    const {
      username,
      password,
      fullName,
      birthDate,
      country,
      city,
      gender,
      customGender,
      email,
    } = req.body;

    // Verificar se o usuário já existe
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Usuário já existe" });
    }

    // Criar novo usuário
    const user = new User({
      username,
      password,
      email,
      fullName,
      birthDate,
      country,
      city,
      gender,
      customGender: gender === "Definir" ? customGender : undefined,
      isAdmin: false,
    });

    await user.save();

    // Gerar token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ message: "Erro ao registrar usuário" });
  }
});

// Rota de login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Buscar usuário
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Usuário ou senha inválidos" });
    }

    // Verificar senha
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Usuário ou senha inválidos" });
    }

    // Gerar token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Erro ao fazer login" });
  }
});

router.get("/", (req, res) => {
  res.json({
    message: "API de autenticação funcionando! Use /register ou /login.",
  });
});

module.exports = router;
