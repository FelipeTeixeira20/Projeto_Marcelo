import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaUserPlus } from "react-icons/fa";
import Layout from "../components/Layout";
import "./UserManagement.css";
import CryptoBackground from "../components/CryptoBackground";

const SERVER_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    isAdmin: false,
    email: "",
    fullName: "",
    birthDate: "",
    country: "",
    city: "",
    gender: "Masculino", // Default
    customGender: "",
  });

  const fetchUsers = async () => {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`//${SERVER_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      setError("Erro ao carregar usuários");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.post(`//${SERVER_URL}/api/users`, newUser, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewUser({
        username: "",
        password: "",
        isAdmin: false,
        email: "",
        fullName: "",
        birthDate: "",
        country: "",
        city: "",
        gender: "Masculino",
        customGender: "",
      });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao criar usuário");
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      let updateData = {
        username: editingUser.username,
        isAdmin: editingUser.isAdmin,
        email: editingUser.email,
        fullName: editingUser.fullName,
        birthDate: editingUser.birthDate,
        country: editingUser.country,
        city: editingUser.city,
        gender: editingUser.gender,
        // customGender will be handled based on gender, similar to backend logic if needed
        // or rely on backend to clear it if gender is not 'Definir'
      };

      if (editingUser.gender === "Definir") {
        updateData.customGender = editingUser.customGender;
      } else {
        updateData.customGender = undefined; // Explicitly clear if not 'Definir'
      }

      // Só adiciona a senha se o usuário digitou algo
      if (editingUser.password && editingUser.password.trim() !== "") {
        updateData.password = editingUser.password;
      }

      await axios.put(
        `//${SERVER_URL}/api/users/${editingUser._id}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao atualizar usuário");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Tem certeza que deseja deletar este usuário?")) return;

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.delete(`//${SERVER_URL}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao deletar usuário");
    }
  };

  if (loading)
    return (
      <Layout>
        <div className="loading">Carregando...</div>
      </Layout>
    );
  if (error)
    return (
      <Layout>
        <div className="error">{error}</div>
      </Layout>
    );

  return (
    <Layout>
      <CryptoBackground />
      <div className="user-management">
        {/* <h2>Gerenciamento de Usuários</h2> */}

        {/* Formulário para criar novo usuário */}
        <div className="user-form">
          <h3>
            <FaUserPlus /> Criar Novo Usuário
          </h3>
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Username"
                value={newUser.username}
                onChange={(e) =>
                  setNewUser({ ...newUser, username: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="Nome Completo"
                value={newUser.fullName}
                onChange={(e) =>
                  setNewUser({ ...newUser, fullName: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="Senha"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <input
                type="date"
                placeholder="Data de Nascimento"
                value={newUser.birthDate}
                onChange={(e) =>
                  setNewUser({ ...newUser, birthDate: e.target.value })
                }
                required
                className="form-input-date" // Added class for potential specific styling
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="País"
                value={newUser.country}
                onChange={(e) =>
                  setNewUser({ ...newUser, country: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="Cidade"
                value={newUser.city}
                onChange={(e) =>
                  setNewUser({ ...newUser, city: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <select
                value={newUser.gender}
                onChange={(e) => {
                  const newGender = e.target.value;
                  setNewUser({
                    ...newUser,
                    gender: newGender,
                    customGender:
                      newGender !== "Definir" ? "" : newUser.customGender,
                  });
                }}
                required
                className="form-input-select" // Added class for potential specific styling
              >
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Definir">Definir</option>
              </select>
            </div>
            {newUser.gender === "Definir" && (
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Definir Gênero (max 15 chars)"
                  value={newUser.customGender}
                  onChange={(e) =>
                    setNewUser({ ...newUser, customGender: e.target.value })
                  }
                  maxLength="15"
                  pattern="^[a-zA-Z\s]*$"
                  required
                />
              </div>
            )}
            <div className="form-group">
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={newUser.isAdmin}
                  onChange={(e) =>
                    setNewUser({ ...newUser, isAdmin: e.target.checked })
                  }
                />
                Administrador
              </label>
            </div>
            <button type="submit" className="btn-create">
              Criar Usuário
            </button>
          </form>
        </div>

        {/* Lista de usuários */}
        <div className="users-list">
          <h3>Usuários Cadastrados</h3>
          <div className="users-grid">
            {users.map((user) => (
              <div key={user._id} className="user-card">
                {editingUser && editingUser._id === user._id ? (
                  <form onSubmit={handleUpdateUser} className="edit-form">
                    <input
                      type="text"
                      placeholder="Nome Completo"
                      value={editingUser.fullName || ""}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          fullName: e.target.value,
                        })
                      }
                    />
                    <input
                      type="text"
                      placeholder="Username"
                      value={editingUser.username}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          username: e.target.value,
                        })
                      }
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={editingUser.email || ""}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          email: e.target.value,
                        })
                      }
                    />
                    <input
                      type="password"
                      placeholder="Nova senha (opcional)"
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          password: e.target.value,
                        })
                      }
                    />
                    <input
                      type="date"
                      placeholder="Data de Nascimento"
                      value={
                        editingUser.birthDate
                          ? editingUser.birthDate.split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          birthDate: e.target.value,
                        })
                      }
                      className="form-input-date"
                    />
                    <input
                      type="text"
                      placeholder="País"
                      value={editingUser.country || ""}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          country: e.target.value,
                        })
                      }
                    />
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={editingUser.city || ""}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, city: e.target.value })
                      }
                    />
                    <select
                      value={editingUser.gender || "Masculino"}
                      onChange={(e) => {
                        const newGender = e.target.value;
                        setEditingUser({
                          ...editingUser,
                          gender: newGender,
                          customGender:
                            newGender !== "Definir"
                              ? ""
                              : editingUser.customGender,
                        });
                      }}
                      className="form-input-select"
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Definir">Definir</option>
                    </select>
                    {editingUser.gender === "Definir" && (
                      <input
                        type="text"
                        placeholder="Definir Gênero (max 15 chars)"
                        value={editingUser.customGender || ""}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            customGender: e.target.value,
                          })
                        }
                        maxLength="15"
                        pattern="^[a-zA-Z\s]*$"
                      />
                    )}
                    <label>
                      <input
                        type="checkbox"
                        checked={editingUser.isAdmin}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            isAdmin: e.target.checked,
                          })
                        }
                      />
                      Administrador
                    </label>
                    <div className="edit-actions">
                      <button type="submit" className="btn-save">
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="btn-cancel"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="user-info">
                      <h4>{user.username}</h4>
                      <p className="user-detail">
                        <strong>Nome:</strong> {user.fullName || "N/A"}
                      </p>
                      <p className="user-detail">
                        <strong>Email:</strong> {user.email || "N/A"}
                      </p>
                      <p className="user-detail">
                        <strong>Cidade:</strong> {user.city || "N/A"},{" "}
                        {user.country || "N/A"}
                      </p>
                      <p className="user-detail">
                        <strong>Gênero:</strong>{" "}
                        {user.gender === "Definir"
                          ? user.customGender || "Definido"
                          : user.gender || "N/A"}
                      </p>
                      <span
                        className={`badge ${user.isAdmin ? "admin" : "user"}`}
                      >
                        {user.isAdmin ? "Administrador" : "Usuário"}
                      </span>
                    </div>
                    <div className="user-actions">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="btn-edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        className="btn-delete"
                      >
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
