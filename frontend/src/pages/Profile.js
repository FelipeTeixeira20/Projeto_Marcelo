import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import CryptoBackground from "../components/CryptoBackground";
import axios from "axios";
import "./Profile.css";

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.get(
          `http://${window.location.hostname}:5000/api/users/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUserData(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
        setError("Erro ao carregar dados do usuário");
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading)
    return (
      <Layout>
        <div className="profile-management">
          <div className="loading">Carregando...</div>
        </div>
      </Layout>
    );

  if (error)
    return (
      <Layout>
        <div className="profile-management">
          <div className="error">{error}</div>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <CryptoBackground />
      <div className="profile-management">
        <h2>Perfil do Usuário</h2>

        <div className="profile-container">
          <div className="profile-header">
            <div className="profile-avatar">
              {userData?.username?.charAt(0).toUpperCase()}
            </div>
            <h3>{userData?.username}</h3>
          </div>

          <div className="profile-info">
            <div className="info-group">
              <label>Nome de Usuário</label>
              <div className="info-value">{userData?.username}</div>
            </div>

            <div className="info-group">
              <label>Nome Completo</label>
              <div className="info-value">
                {userData?.fullName || "Não informado"}
              </div>
            </div>

            <div className="info-group">
              <label>Email</label>
              <div className="info-value">
                {userData?.email || "Não informado"}
              </div>
            </div>

            <div className="info-group">
              <label>Data de Nascimento</label>
              <div className="info-value">
                {userData?.birthDate
                  ? new Date(userData.birthDate).toLocaleDateString("pt-BR")
                  : "Não informada"}
              </div>
            </div>

            <div className="info-group">
              <label>País</label>
              <div className="info-value">
                {userData?.country || "Não informado"}
              </div>
            </div>

            <div className="info-group">
              <label>Cidade</label>
              <div className="info-value">
                {userData?.city || "Não informada"}
              </div>
            </div>

            <div className="info-group">
              <label>Gênero</label>
              <div className="info-value">
                {userData?.gender === "Definir"
                  ? userData?.customGender || "Definido (não especificado)"
                  : userData?.gender || "Não informado"}
              </div>
            </div>

            <div className="info-group">
              <label>Tipo de Conta</label>
              <div className="info-value">
                <span
                  className={`badge ${userData?.isAdmin ? "admin" : "user"}`}
                >
                  {userData?.isAdmin ? "Administrador" : "Usuário"}
                </span>
              </div>
            </div>

            <div className="info-group">
              <label>Membro desde</label>
              <div className="info-value">
                {new Date(userData?.createdAt).toLocaleDateString("pt-BR")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
