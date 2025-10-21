from typing import List, Optional
import logging

from .spotify_client import SpotifyClient
from .models import Track, Artist
from .cache_manager import (
    cache_result,
    TTL_SEARCH,
    TTL_ARTIST_DETAILS,
    TTL_RELATED_ARTISTS
)

# Configurar logger
logger = logging.getLogger(__name__)


class MusicCRUD:
    """Operações de busca no Spotify"""

    def __init__(self):
        self.spotify_public = SpotifyClient(use_auth=False)

    def get_artist_top_tracks(
        self, artist_id: str, country: str = 'BR'
    ) -> List[Track]:
        """Obtém as principais músicas de um artista no Spotify"""
        try:
            sp = self.spotify_public.get_spotify_instance()
            results = sp.artist_top_tracks(artist_id, country=country)
            tracks = []

            if results:
                tracks_data = results.get('tracks', [])
                if isinstance(tracks_data, list):
                    for track in tracks_data:
                        try:
                            tracks.append(Track.from_spotify_data(track))
                        except Exception as e:
                            logger.warning(f"Erro ao processar track: {e}")
                            continue

            return tracks
        except Exception as e:
            logger.error(
                f"Erro ao obter top tracks do artista: {e}",
                exc_info=True
            )
            return []

    @cache_result('search_tracks', ttl=TTL_SEARCH)
    def search_tracks(self, query: str, limit: int = 20) -> List[Track]:
        """Busca músicas no Spotify por query (com cache de 5 minutos)"""
        try:
            sp = self.spotify_public.get_spotify_instance()
            results = sp.search(q=query, type='track', limit=limit)
            tracks = []

            if results:
                items = results.get('tracks', {}).get('items', [])
                for track in items:
                    try:
                        tracks.append(Track.from_spotify_data(track))
                    except Exception as e:
                        logger.warning(f"Erro ao processar track: {e}")
                        continue

            return tracks
        except Exception as e:
            logger.error(
                f"Erro ao buscar tracks: {e}",
                exc_info=True
            )
            return []

    @cache_result('search_artists', ttl=TTL_SEARCH)
    def search_artists(self, query: str, limit: int = 10) -> List[Artist]:
        """Busca artistas no Spotify por query (com cache de 5 minutos)"""
        try:
            sp = self.spotify_public.get_spotify_instance()
            results = sp.search(q=query, type='artist', limit=limit)
            artists = []

            if results:
                items = results.get('artists', {}).get('items', [])
                for artist in items:
                    try:
                        artists.append(Artist.from_spotify_data(artist))
                    except Exception as e:
                        logger.warning(f"Erro ao processar artista: {e}")
                        continue

            return artists
        except Exception as e:
            logger.error(
                f"Erro ao buscar artistas: {e}",
                exc_info=True
            )
            return []

    @cache_result('related_artists', ttl=TTL_RELATED_ARTISTS)
    def get_related_artists(
        self, artist_id: str, limit: int = 10
    ) -> List[Artist]:
        """
        Obtém artistas relacionados/similares a um artista específico
        (com cache de 1 hora)
        """
        try:
            sp = self.spotify_public.get_spotify_instance()
            results = sp.artist_related_artists(artist_id)
            artists = []

            if results:
                artists_data = results.get('artists', [])
                if isinstance(artists_data, list):
                    for artist in artists_data[:limit]:
                        try:
                            artists.append(Artist.from_spotify_data(artist))
                        except Exception as e:
                            logger.warning(
                                f"Erro ao processar artista: {e}"
                            )
                            continue

            return artists
        except Exception as e:
            logger.error(
                f"Erro ao buscar artistas relacionados: {e}",
                exc_info=True
            )
            return []

    @cache_result('artist_details', ttl=TTL_ARTIST_DETAILS)
    def get_artist_details(self, artist_id: str) -> Optional[Artist]:
        """
        Obtém detalhes completos de um artista
        (com cache de 30 minutos)
        """
        try:
            sp = self.spotify_public.get_spotify_instance()
            artist_data = sp.artist(artist_id)

            if artist_data:
                return Artist.from_spotify_data(artist_data)

            return None
        except Exception as e:
            logger.error(
                f"Erro ao obter detalhes do artista: {e}",
                exc_info=True
            )
            return None
