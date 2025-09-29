import spotipy
from spotipy.oauth2 import SpotifyOAuth, SpotifyClientCredentials
import os
from dotenv import load_dotenv

load_dotenv()

class SpotifyClient:
    """
    Cliente para interagir com a Spotify Web API
    
    Suporta dois modos:
    - use_auth=False: Apenas busca pública (sem autenticação)
    - use_auth=True: Operações que precisam de autenticação do usuário
    """
    
    def __init__(self, use_auth=False):
        self.client_id = os.getenv('SPOTIFY_CLIENT_ID')
        self.client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')
        self.redirect_uri = os.getenv('SPOTIFY_REDIRECT_URI')
        
        # Validação de credenciais
        if not self.client_id or not self.client_secret:
            raise ValueError("SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET devem ser definidos no .env")
        
        if use_auth:
            # Para operações que precisam de autenticação do usuário
            self.sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
                client_id=self.client_id,
                client_secret=self.client_secret,
                redirect_uri=self.redirect_uri,
                scope="playlist-modify-public playlist-modify-private user-library-read user-library-modify user-read-private"
            ))
        else:
            # Para busca geral (sem autenticação)
            self.sp = spotipy.Spotify(client_credentials_manager=SpotifyClientCredentials(
                client_id=self.client_id,
                client_secret=self.client_secret
            ))
    
    def get_spotify_instance(self):
        """Retorna a instância do Spotify configurada"""
        return self.sp
    
    def test_connection(self):
        """Testa a conexão com a API do Spotify"""
        try:
            # Tenta buscar uma música para testar
            result = self.sp.search(q='test', type='track', limit=1)
            return True, "Conexão com Spotify OK!"
        except Exception as e:
            return False, f"Erro na conexão: {str(e)}"