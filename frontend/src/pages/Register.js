import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import CryptoBackground from "../components/CryptoBackground"; // Assuming you want the same background
import "./Register.css"; // We will create this CSS file next

const SERVER_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    username: "", // This is the IDusuario
    password: "",
    confirmPassword: "",
    email: "", // Add email to state
    birthDate: "",
    country: "",
    city: "",
    gender: "Masculino", // Default value
    customGender: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear customGender if gender is changed from 'Definir'
    if (name === "gender" && value !== "Definir") {
      setFormData((prev) => ({ ...prev, customGender: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (
      formData.gender === "Definir" &&
      (!formData.customGender ||
        formData.customGender.length > 15 ||
        !/^[a-zA-Z\s]*$/.test(formData.customGender))
    ) {
      setError(
        'Para gênero "Definir", especifique um valor com até 15 caracteres (apenas letras e espaços).'
      );
      return;
    }

    // Basic validation for birthDate (must be in the past)
    if (new Date(formData.birthDate) >= new Date()) {
      setError("Data de nascimento deve ser no passado.");
      return;
    }

    try {
      const payload = {
        fullName: formData.fullName,
        username: formData.username,
        password: formData.password,
        email: formData.email, // Add email to payload
        birthDate: formData.birthDate,
        country: formData.country,
        city: formData.city,
        gender: formData.gender,
      };
      if (formData.gender === "Definir") {
        payload.customGender = formData.customGender;
      }

      await axios.post(`//${SERVER_URL}/api/auth/register`, payload);

      setSuccess(
        "Usuário registrado com sucesso! Você será redirecionado para o login."
      );
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erro ao registrar. Verifique os dados e tente novamente."
      );
    }
  };

  return (
    <>
      <Header />
      <CryptoBackground />
      <div className="register-container">
        <div className="register-modal">
          <h1 className="register-title">Criar Conta</h1>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                name="fullName"
                className="form-input"
                placeholder=" "
                value={formData.fullName}
                onChange={handleChange}
                required
                minLength="2"
              />
              <label className="form-label">Nome Completo</label>
            </div>

            <div className="form-group">
              <input
                type="text"
                name="username"
                className="form-input"
                placeholder=" "
                value={formData.username}
                onChange={handleChange}
                required
                minLength="2"
              />
              <label className="form-label">ID de Usuário (para login)</label>
            </div>

            <div className="form-group">
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder=" "
                value={formData.email}
                onChange={handleChange}
                required
              />
              <label className="form-label">Email</label>
            </div>

            <div className="form-group">
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder=" "
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
              />
              <label className="form-label">Senha</label>
            </div>

            <div className="form-group">
              <input
                type="password"
                name="confirmPassword"
                className="form-input"
                placeholder=" "
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength="6"
              />
              <label className="form-label">Confirmar Senha</label>
            </div>

            <div className="form-group">
              <input
                type="date"
                name="birthDate"
                className="form-input"
                placeholder=" "
                value={formData.birthDate}
                onChange={handleChange}
                required
                max={new Date().toISOString().split("T")[0]} // Não permitir datas futuras
              />
              <label className="form-label active">Data de Nascimento</label>
            </div>

            <div className="form-group">
              <input
                type="text"
                name="country"
                className="form-input"
                placeholder=" "
                value={formData.country}
                onChange={handleChange}
                required
              />
              <label className="form-label">País</label>
            </div>

            <div className="form-group">
              <input
                type="text"
                name="city"
                className="form-input"
                placeholder=" "
                value={formData.city}
                onChange={handleChange}
                required
              />
              <label className="form-label">Cidade</label>
            </div>

            <div className="form-group">
              <select
                name="gender"
                className="form-input"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Definir">Definir</option>
              </select>
              <label className="form-label active">Gênero</label>
            </div>

            {formData.gender === "Definir" && (
              <div className="form-group">
                <input
                  type="text"
                  name="customGender"
                  className="form-input"
                  placeholder=" "
                  value={formData.customGender}
                  onChange={handleChange}
                  required
                  maxLength="15"
                  pattern="^[a-zA-Z\s]*$"
                  title="Apenas letras e espaços são permitidos."
                />
                <label className="form-label">
                  Qual Gênero/Como se Define?
                </label>
              </div>
            )}

            <button type="submit" className="submit-button">
              Cadastrar
            </button>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
          </form>
        </div>
      </div>
    </>
  );
};

export default Register;
