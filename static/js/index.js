// Importa o módulo TubesCursor de forma dinâmica
import('https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js')
    .then((module) => {
        const TubesCursor = module.default;

        // Verifica se o canvas existe antes de inicializar
        const canvasElement = document.getElementById('canvas');
        if (!canvasElement) {
            console.warn('Canvas não encontrado, efeito 3D não será carregado.');
            return;
        }

        // Inicializa o efeito 3D no canvas
        const app = TubesCursor(canvasElement, {
            tubes: {
                colors: ["#f967fb", "#1db954", "#6958d5"], // Rosa, Verde Spotify, Roxo
                lights: {
                    intensity: 200,
                    colors: ["#1db954", "#fe8a2e", "#ff008a", "#60aed5"] // Verde Spotify, Laranja, Rosa, Azul
                }
            }
        });

        // Função para gerar cores aleatórias
        function randomColors(count) {
            return new Array(count)
                .fill(0)
                .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
        }

        // Muda as cores ao clicar em qualquer lugar da tela
        document.body.addEventListener('click', () => {
            const colors = randomColors(3);
            const lightsColors = randomColors(4);
            app.tubes.setColors(colors);
            app.tubes.setLightsColors(lightsColors);
        });
    })
    .catch((error) => {
        console.warn('Efeito 3D não pôde ser carregado:', error);
    });

// Funcionalidade do botão de entrada - Login com Spotify
document.addEventListener('DOMContentLoaded', function () {
    const enterBtn = document.getElementById('enter-btn');
    if (enterBtn) {
        enterBtn.addEventListener('click', function () {
            enterBtn.disabled = true;
            enterBtn.textContent = 'Conectando ao Spotify...';
            setTimeout(() => {
                window.location.href = '/login_spotify';
            }, 600);
        });
    }
});
