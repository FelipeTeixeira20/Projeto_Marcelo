const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { auth } = require("../middleware/auth");

// Middleware para verificar se é admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        message:
          "Acesso negado. Apenas administradores podem acessar este recurso.",
      });
    }
    next();
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao verificar permissões de administrador" });
  }
};

// Listar todos os usuários (apenas admin)
router.get("/", auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar usuários" });
  }
});

// Criar novo usuário (apenas admin)
router.post("/", auth, isAdmin, async (req, res) => {
  try {
    const {
      username,
      password,
      isAdmin,
      fullName,
      birthDate,
      country,
      city,
      gender,
      customGender,
      email,
    } = req.body;

    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return res.status(400).json({ message: "Nome de usuário já existe" });
    }
    if (email) {
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }
    }

    const user = new User({
      username,
      password,
      email,
      isAdmin: isAdmin || false,
      fullName,
      birthDate,
      country,
      city,
      gender,
      customGender: gender === "Definir" ? customGender : undefined,
    });

    await user.save();
    res.status(201).json({
      message: "Usuário criado com sucesso",
      user: {
        _id: user._id,
        username: user.username,
        isAdmin: user.isAdmin,
        email: user.email,
        fullName: user.fullName,
        birthDate: user.birthDate,
        country: user.country,
        city: user.city,
        gender: user.gender,
        customGender: user.customGender,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Erro ao criar usuário (admin):", error);
    res
      .status(500)
      .json({ message: "Erro ao criar usuário", error: error.message });
  }
});

// Atualizar usuário (apenas admin)
router.put("/:id", auth, isAdmin, async (req, res) => {
  try {
    const {
      username,
      password,
      isAdmin,
      fullName,
      birthDate,
      country,
      city,
      gender,
      customGender,
      email,
    } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // 🔥 Validação para garantir no mínimo 2 caracteres
    if (username && username.length < 2) {
      return res.status(400).json({
        message: "O nome de usuário deve ter pelo menos 2 caracteres.",
      });
    }

    if (username) user.username = username;
    if (password) user.password = password;
    if (email) {
      const existingUserWithEmail = await User.findOne({
        email: email,
        _id: { $ne: req.params.id },
      });
      if (existingUserWithEmail) {
        return res
          .status(400)
          .json({ message: "Este email já está em uso por outro usuário." });
      }
      user.email = email;
    }
    if (typeof isAdmin !== "undefined") user.isAdmin = isAdmin;
    if (fullName) user.fullName = fullName;
    if (birthDate) user.birthDate = birthDate;
    if (country) user.country = country;
    if (city) user.city = city;
    if (gender) user.gender = gender;

    if (gender && gender !== "Definir") {
      user.customGender = undefined;
    } else if (gender === "Definir") {
      if (typeof customGender !== "undefined") {
        user.customGender = customGender;
      }
    } else if (
      typeof customGender !== "undefined" &&
      user.gender === "Definir"
    ) {
      user.customGender = customGender;
    }

    await user.save();
    const updatedUser = await User.findById(req.params.id, "-password");
    res.json({ message: "Usuário atualizado com sucesso", user: updatedUser });
  } catch (error) {
    console.error(`Erro ao atualizar usuário ${req.params.id} (admin):`, error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar usuário", error: error.message });
  }
});

// Deletar usuário (apenas admin)
router.delete("/:id", auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    await user.deleteOne();
    res.json({ message: "Usuário deletado com sucesso" });
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar usuário" });
  }
});

// Rota para verificar o status do usuário atual
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId, "-password");
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar informações do usuário" });
  }
});

// Rota temporária para transformar um usuário em admin
router.post("/make-admin", auth, async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    user.isAdmin = true;
    await user.save();

    res.json({
      message: "Usuário transformado em admin com sucesso",
      user: { username: user.username, isAdmin: user.isAdmin },
    });
  } catch (error) {
    res.status(500).json({ message: "Erro ao transformar usuário em admin" });
  }
});

module.exports = router;
