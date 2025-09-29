from src.spotify_auth import get_spotify_token
from src.spotify_client import SpotifyClient

class PlaylistManager:
    @staticmethod
    def create_playlist(user_id, name, public=True, description=""):
        token = get_spotify_token()
        if not token:
            return None, "Usuário não autenticado no Spotify."
        sp = SpotifyClient(use_auth=True).get_spotify_instance()
        playlist = sp.user_playlist_create(user=user_id, name=name, public=public, description=description)
        return playlist, None

    @staticmethod
    def add_tracks_to_playlist(playlist_id, track_uris):
        token = get_spotify_token()
        if not token:
            return False, "Usuário não autenticado no Spotify."
        sp = SpotifyClient(use_auth=True).get_spotify_instance()
        sp.playlist_add_items(playlist_id, track_uris)
        return True, None

    @staticmethod
    def get_current_user():
        token = get_spotify_token()
        if not token:
            return None
        sp = SpotifyClient(use_auth=True).get_spotify_instance()
        return sp.current_user()
