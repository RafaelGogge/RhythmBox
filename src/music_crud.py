from typing import List, Optional

from .spotify_client import SpotifyClient
from .models import Track, Artist

class MusicCRUD:
    def get_artist_top_tracks(self, artist_id: str, country: str = 'BR') -> List[Track]:
        """Obtém as principais músicas de um artista no Spotify"""
        try:
            sp = self.spotify_public.get_spotify_instance()
            results = sp.artist_top_tracks(artist_id, country=country)
            tracks = []
            if results and 'tracks' in results and isinstance(results['tracks'], list):
                for track in results['tracks']:
                    tracks.append(Track.from_spotify_data(track))
            return tracks
        except Exception as e:
            print(f"Erro ao obter top tracks do artista: {e}")
            return []
    """
    Operações de busca no Spotify
    """
    def __init__(self):
        self.spotify_public = SpotifyClient(use_auth=False)

    def search_tracks(self, query: str, limit: int = 20) -> List[Track]:
        try:
            sp = self.spotify_public.get_spotify_instance()
            results = sp.search(q=query, type='track', limit=limit)
            tracks = []
            if results and 'tracks' in results and 'items' in results['tracks']:
                for track in results['tracks']['items']:
                    t = Track.from_spotify_data(track)
                    print(f"DEBUG: {t.name} | preview_url: {t.preview_url}")
                    tracks.append(t)
            return tracks
        except Exception as e:
            print(f"Erro ao buscar tracks: {e}")
            return []

    def search_artists(self, query: str, limit: int = 10) -> List[Artist]:
        try:
            sp = self.spotify_public.get_spotify_instance()
            results = sp.search(q=query, type='artist', limit=limit)
            artists = []
            if results and 'artists' in results and 'items' in results['artists']:
                for artist in results['artists']['items']:
                    artists.append(Artist.from_spotify_data(artist))
            return artists
        except Exception as e:
            print(f"Erro ao buscar artistas: {e}")
            return []

