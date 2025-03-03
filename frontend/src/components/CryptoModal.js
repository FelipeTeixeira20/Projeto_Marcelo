import React from 'react';
import './CryptoModal.css';

const CryptoModal = ({ crypto, onClose }) => {
  if (!crypto) return null;

  // Função melhorada para formatar números
  const formatNumber = (value, decimals = 4) => {
    if (!value) return '0.00';
    const number = parseFloat(value);
    if (isNaN(number)) return '0.00';
    
    // Para valores muito grandes, usa notação K/M/B
    if (number > 1000000000) return (number / 1000000000).toFixed(2) + 'B';
    if (number > 1000000) return (number / 1000000).toFixed(2) + 'M';
    if (number > 1000) return (number / 1000).toFixed(2) + 'K';
    
    return number.toFixed(decimals);
  };

  // Pega o preço mais recente disponível
  const currentPrice = crypto.lastPrice || crypto.price || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <div className="modal-header">
          <h2>{crypto.symbol}</h2>
          <p className="current-price">
            ${crypto.lastPrice || crypto.price}
          </p>
        </div>

        <div className="modal-info-grid">
          <div className="info-box">
            <label>24h High</label>
            <span>${crypto.highPrice}</span>
          </div>
          <div className="info-box">
            <label>24h Low</label>
            <span>${crypto.lowPrice}</span>
          </div>
          <div className="info-box">
            <label>24h Volume</label>
            <span>${crypto.volume}</span>
          </div>
          <div className="info-box">
            <label>24h Amount</label>
            <span>${crypto.amount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoModal; 