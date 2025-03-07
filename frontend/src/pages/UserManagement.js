import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';
import Layout from "../components/Layout";
import './UserManagement.css';
import CryptoBackground from '../components/CryptoBackground';

const SERVER_URL = window.location.hostname === "192.168.100.26"
  ? "192.168.100.26"
  : window.location.hostname;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', isAdmin: false });

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.get(`http://${SERVER_URL}:5000/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar usuários');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      await axios.post(
        `http://${SERVER_URL}:5000/api/users`,
        newUser,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewUser({ username: '', password: '', isAdmin: false });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar usuário');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      let updateData = {
        username: editingUser.username,
        isAdmin: editingUser.isAdmin,
      };

      // Só adiciona a senha se o usuário digitou algo
      if (editingUser.password && editingUser.password.trim() !== '') {
        updateData.password = editingUser.password;
      }

      await axios.put(
        `http://${SERVER_URL}:5000/api/users/${editingUser._id}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar usuário');
    }
};


  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) return;
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      await axios.delete(
        `http://${SERVER_URL}:5000/api/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao deletar usuário');
    }
  };

  if (loading) return <Layout><div className="loading">Carregando...</div></Layout>;
  if (error) return <Layout><div className="error">{error}</div></Layout>;

  return (
    <Layout>
      <CryptoBackground />
      <div className="user-management">
        <h2>Gerenciamento de Usuários</h2>

        {/* Formulário para criar novo usuário */}
        <div className="user-form">
          <h3><FaUserPlus /> Criar Novo Usuário</h3>
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="Senha"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
              />
            </div>
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={newUser.isAdmin}
                  onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                />
                Administrador
              </label>
            </div>
            <button type="submit" className="btn-create">Criar Usuário</button>
          </form>
        </div>

        {/* Lista de usuários */}
        <div className="users-list">
          <h3>Usuários Cadastrados</h3>
          <div className="users-grid">
            {users.map(user => (
              <div key={user._id} className="user-card">
                {editingUser && editingUser._id === user._id ? (
                  <form onSubmit={handleUpdateUser} className="edit-form">
                    <input
                      type="text"
                      value={editingUser.username}
                      onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    />
                    <input
                      type="password"
                      placeholder="Nova senha (opcional)"
                      onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    />
                    <label>
                      <input
                        type="checkbox"
                        checked={editingUser.isAdmin}
                        onChange={(e) => setEditingUser({ ...editingUser, isAdmin: e.target.checked })}
                      />
                      Administrador
                    </label>
                    <div className="edit-actions">
                      <button type="submit" className="btn-save">Salvar</button>
                      <button type="button" onClick={() => setEditingUser(null)} className="btn-cancel">
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="user-info">
                      <h4>{user.username}</h4>
                      <span className={`badge ${user.isAdmin ? 'admin' : 'user'}`}>
                        {user.isAdmin ? 'Administrador' : 'Usuário'}
                      </span>
                    </div>
                    <div className="user-actions">
                      <button onClick={() => setEditingUser(user)} className="btn-edit">
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDeleteUser(user._id)} className="btn-delete">
                        <FaTrash />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UserManagement; 