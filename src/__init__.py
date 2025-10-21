"""
Pacote src - Módulos de integração com Spotify
"""

from .spotify_client import SpotifyClient
from .spotify_auth import get_spotify_token
from .music_crud import MusicCRUD
from .favorites_manager import FavoritesManager
from .playlist_manager import PlaylistManager

__all__ = [
    'SpotifyClient',
    'get_spotify_token',
    'MusicCRUD',
    'FavoritesManager',
    'PlaylistManager',
]
