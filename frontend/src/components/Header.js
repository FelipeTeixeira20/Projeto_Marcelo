import React from "react";
import "./Header.css";
import logoHeader from '../assets/logo_header.png';

const Header = () => {
  return (
    <header className="header">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        height: '100%',
        marginLeft: '-8px' // 👈 puxa mais pra esquerda (ajuste fino aqui)
      }}>
        <img
          src={logoHeader}
          alt="Logo Arby"
          style={{
            width: '48px',
            height: '48px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.9))'
          }}
        />
        <h1 style={{
          margin: 0,
          fontSize: '22px',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          height: '100%'
        }}>
          ARBY
        </h1>
      </div>
    </header>
  );
};

export default Header;
