import React from 'react';
import './CryptoCard.css';

const CryptoCard = ({ crypto, onClick }) => {
  return (
    <div className="crypto-card" onClick={onClick}>
      <div className="crypto-card-header">
        <h3>{crypto.symbol}</h3>
      </div>
      <div className="crypto-card-body">
        <p className="price">${crypto.price}</p>
      </div>
    </div>
  );
};

export default CryptoCard; 