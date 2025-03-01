import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import './Login.css';

const SERVER_URL = window.location.hostname === "192.168.100.26"
  ? "192.168.100.26"
  : window.location.hostname;

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState('');

  useEffect(() => {
    // Verificar se existe um token salvo
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post(`http://${SERVER_URL}:5000/api/auth/login`, {
        username: formData.username,
        password: formData.password
      });

      const { token } = response.data;

      // Salvar o token e o username baseado na opção "lembrar-me"
      if (formData.rememberMe) {
        localStorage.setItem('token', token);
        localStorage.setItem('username', formData.username);
      } else {
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('username', formData.username);
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao fazer login. Tente novamente.');
    }
  };

  return (
    <>
      <Header />
      <div className="login-container">
        <div className="login-modal">
          <h1 className="login-title">Login</h1>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                name="username"
                className="form-input"
                placeholder=" "
                value={formData.username}
                onChange={handleChange}
                required
              />
              <label className="form-label">Usuário</label>
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
              />
              <label className="form-label">Senha</label>
            </div>

            <div className="remember-me">
              <input
                type="checkbox"
                name="rememberMe"
                id="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <label htmlFor="rememberMe">Manter conectado</label>
            </div>

            <button type="submit" className="submit-button">
              Entrar
            </button>

            {error && <div className="error-message">{error}</div>}
          </form>
        </div>
      </div>
    </>
  );
};

export default Login; 