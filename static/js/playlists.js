// ===== SISTEMA DE PLAYLISTS 3D - CONTROLADOR PRINCIPAL =====

import { Playlist3DEffects } from './modules/playlist-3d-effects.js';
import { PlaylistAPI } from './modules/playlist-api.js';
import { Utils } from './modules/utils.js';

// Instância da API
const playlistAPI = new PlaylistAPI();

// ===== INICIALIZAÇÃO =====

document.addEventListener('DOMContentLoaded', () => {
  initPlaylistCards();
});

// ===== FUNÇÃO PRINCIPAL: Inicializa todos os cards =====
function initPlaylistCards() {
  const playlistItems = document.querySelectorAll('.playlists-list li');

  playlistItems.forEach((item, index) => {
    const playlistData = extractPlaylistData(item);
    if (!playlistData) return;

    transformToCard3D(item, playlistData);
    Playlist3DEffects.activateCard(item, index * 150);
  });
}

// ===== FUNÇÃO: Extrai dados da playlist do HTML =====
function extractPlaylistData(item) {
  const coverLink = item.querySelector('.playlist-cover');
  const titleLink = item.querySelector('.playlist-title');
  const trackCountSpan = item.querySelector('span[style*="color"]');
  const imageElement = item.querySelector('.playlist-cover img');
  const editLink = item.querySelector('a.btn-edit');

  if (!coverLink || !titleLink) return null;

  const playlistId = editLink ? editLink.href.split('/').pop() : null;

  return {
    name: titleLink.textContent.trim(),
    imageUrl: imageElement ? imageElement.src : null,
    trackCount: parseInt(trackCountSpan?.textContent.match(/\d+/)?.[0] || '0'),
    viewUrl: coverLink.href,
    playlistId: playlistId,
  };
}

// ===== FUNÇÃO: Transforma item em card 3D =====
function transformToCard3D(item, data) {
  const cardHTML = createCardHTML(data);
  item.innerHTML = cardHTML;

  const card = item.querySelector('.playlist-card-3d');
  setupCardEventListeners(card, data);
}

// ===== FUNÇÃO: Cria HTML do card =====
function createCardHTML(data) {
  return `
    <div class="playlist-card-3d" data-active="false">
      <div class="card-3d-content">
        <!-- FRENTE DO CARD -->
        <div class="card-3d-front">
          <div class="card-3d-image">
            ${data.imageUrl
      ? `<img src="${data.imageUrl}" alt="${Utils.escapeHtml(data.name)}" loading="lazy" />`
      : '<div class="music-icon-placeholder">♪</div>'
    }
          </div>
          <div class="card-3d-pattern"></div>
          <div class="card-3d-watermark"></div>
          <div class="card-3d-frame">
            <div class="card-3d-title">${Utils.escapeHtml(data.name)}</div>
            <div class="card-3d-track-count">
              ${data.trackCount} música${data.trackCount !== 1 ? 's' : ''}
            </div>
          </div>
          
          <!-- Menu de Opções (Overlay) -->
          <div class="card-options-menu" style="display: none;">
            <div class="options-menu-backdrop"></div>
            <div class="options-menu-content">
              <h4>Opções</h4>
              <button class="option-btn option-view" data-action="view">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                <span>Exibir Playlist</span>
              </button>
              <button class="option-btn option-config" data-action="config">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                </svg>
                <span>Configurações</span>
              </button>
              <button class="option-btn option-close" data-action="close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
                <span>Fechar</span>
              </button>
            </div>
          </div>
          
          <div class="card-3d-spotlight">
            <div class="card-3d-refraction"></div>
            <div class="card-3d-refraction"></div>
          </div>
          <div class="card-3d-glare"></div>
          <div class="card-3d-emboss"></div>
        </div>
        
        <!-- VERSO DO CARD -->
        <div class="card-3d-back">
          <div class="card-3d-back-bg">
            ${data.imageUrl ? `<img src="${data.imageUrl}" alt="${Utils.escapeHtml(data.name)} (verso)" />` : ''}
          </div>
          <div class="card-3d-back-content">
            <div class="back-options">
              ${createBackOptionButtons(data.playlistId)}
            </div>
            <button class="back-flip-btn" data-action="flip-back">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ===== FUNÇÃO: Cria botões de opção do verso =====
function createBackOptionButtons(playlistId) {
  const options = [
    { action: 'edit', icon: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z', title: 'Editar Playlist', desc: 'Alterar nome e gerenciar músicas' },
    { action: 'add', icon: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z', title: 'Adicionar Músicas', desc: 'Buscar e adicionar novas músicas' },
    { action: 'delete', icon: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z', title: 'Remover Playlist', desc: 'Excluir do visual (não do Spotify)' }
  ];

  return options.map(opt => `
        <button class="back-option-btn" data-action="${opt.action}" data-playlist-id="${playlistId}">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="${opt.icon}"/>
            </svg>
            <div class="option-text">
                <span class="option-title">${opt.title}</span>
                <span class="option-description">${opt.desc}</span>
            </div>
        </button>
    `).join('');
}

// ===== FUNÇÃO: Configura event listeners do card =====
function setupCardEventListeners(card, data) {
  const cardFront = card.querySelector('.card-3d-front');
  const cardContent = card.querySelector('.card-3d-content');
  const optionsMenu = card.querySelector('.card-options-menu');
  const optionButtons = card.querySelectorAll('.option-btn');
  const menuBackdrop = card.querySelector('.options-menu-backdrop');
  const backOptionButtons = card.querySelectorAll('.back-option-btn');
  const backFlipBtn = card.querySelector('.back-flip-btn');

  // Click no card frontal
  cardFront.addEventListener('click', (e) => {
    if (e.target.closest('.card-options-menu')) return;
    e.stopPropagation();

    Playlist3DEffects.resetCardPosition(card);
    card.classList.add('menu-open');

    setTimeout(() => {
      Playlist3DEffects.showOptionsMenu(optionsMenu, card);
    }, 300);
  });

  // Botões do menu frontal
  optionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleFrontMenuAction(btn.dataset.action, data, optionsMenu, card, cardContent);
    });
  });

  // Botões do verso
  backOptionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleBackMenuAction(btn.dataset.action, btn.dataset.playlistId, data.name);
    });
  });

  // Botão de voltar do verso
  if (backFlipBtn) {
    backFlipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      Playlist3DEffects.flipCard(cardContent);
    });
  }

  // Backdrop fecha menu
  menuBackdrop.addEventListener('click', (e) => {
    e.stopPropagation();
    Playlist3DEffects.hideOptionsMenu(optionsMenu, card);
  });

  // Parallax no hover
  card.addEventListener('pointermove', (e) => {
    if (!cardContent.classList.contains('flipped') &&
      optionsMenu.style.display === 'none' &&
      !card.classList.contains('menu-open')) {
      Playlist3DEffects.updateCardPointer(card, e);
    }
  });

  // Reset ao sair
  card.addEventListener('pointerleave', () => {
    if (!card.classList.contains('menu-open')) {
      Playlist3DEffects.resetCardPosition(card);
    }
  });
}

// ===== FUNÇÕES DE AÇÕES =====

function handleFrontMenuAction(action, data, menu, card, cardContent) {
  switch (action) {
    case 'view':
      playlistAPI.navigateToView(data.viewUrl);
      break;
    case 'config':
      Playlist3DEffects.hideOptionsMenu(menu, card);
      setTimeout(() => Playlist3DEffects.flipCard(cardContent), 300);
      break;
    case 'close':
      Playlist3DEffects.hideOptionsMenu(menu, card);
      break;
  }
}

function handleBackMenuAction(action, playlistId, playlistName) {
  switch (action) {
    case 'edit':
      playlistAPI.navigateToEdit(playlistId);
      break;
    case 'add':
      playlistAPI.navigateToAdd(playlistId);
      break;
    case 'delete':
      showDeleteConfirmationModal(playlistId, playlistName);
      break;
  }
}

// ===== FUNÇÃO: Modal de confirmação para remover playlist =====
function showDeleteConfirmationModal(playlistId, playlistName) {
  const modalHTML = createDeleteModalHTML(playlistName);
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('deleteModal');
  const cancelBtn = document.getElementById('cancelDelete');
  const confirmBtn = document.getElementById('confirmDelete');

  setTimeout(() => modal.classList.add('active'), 10);

  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  };

  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  confirmBtn.addEventListener('click', () => {
    playlistAPI.deletePlaylist(playlistId);
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

function createDeleteModalHTML(playlistName) {
  return `
    <div class="delete-modal-overlay" id="deleteModal">
      <div class="delete-modal-container">
        <div class="delete-modal-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <h3 class="delete-modal-title">Remover Playlist?</h3>
        <p class="delete-modal-playlist-name">"${Utils.escapeHtml(playlistName)}"</p>
        <div class="delete-modal-message">
          <p>Esta ação removerá a playlist apenas desta visualização.</p>
          <p class="delete-modal-warning">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
              <path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
            </svg>
            Por segurança, a playlist não será excluída do Spotify. Para remover definitivamente, use o aplicativo do Spotify.
          </p>
        </div>
        <div class="delete-modal-actions">
          <button class="delete-modal-btn delete-modal-cancel" id="cancelDelete">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
            Cancelar
          </button>
          <button class="delete-modal-btn delete-modal-confirm" id="confirmDelete">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
            Sim, Remover
          </button>
        </div>
      </div>
    </div>
  `;
}

// ===== EXPORTA PARA DEBUG (OPCIONAL) =====
window.PlaylistCards = {
  init: initPlaylistCards,
  extractData: extractPlaylistData,
};
