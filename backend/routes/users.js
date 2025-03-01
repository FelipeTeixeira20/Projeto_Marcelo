const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Middleware para verificar se é admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar este recurso.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Erro ao verificar permissões de administrador' });
  }
};

// Listar todos os usuários (apenas admin)
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuários' });
  }
});

// Criar novo usuário (apenas admin)
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Usuário já existe' });
    }

    const user = new User({
      username,
      password,
      isAdmin: isAdmin || false
    });

    await user.save();
    res.status(201).json({ message: 'Usuário criado com sucesso', user: { username: user.username, isAdmin: user.isAdmin } });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar usuário' });
  }
});

// Atualizar usuário (apenas admin)
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (username) user.username = username;
    if (password) user.password = password;
    if (typeof isAdmin !== 'undefined') user.isAdmin = isAdmin;

    await user.save();
    res.json({ message: 'Usuário atualizado com sucesso', user: { username: user.username, isAdmin: user.isAdmin } });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

// Deletar usuário (apenas admin)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    await user.deleteOne();
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar usuário' });
  }
});

// Rota para verificar o status do usuário atual
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId, '-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar informações do usuário' });
  }
});

// Rota temporária para transformar um usuário em admin
router.post('/make-admin', auth, async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    user.isAdmin = true;
    await user.save();

    res.json({ message: 'Usuário transformado em admin com sucesso', user: { username: user.username, isAdmin: user.isAdmin } });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao transformar usuário em admin' });
  }
});

module.exports = router; 