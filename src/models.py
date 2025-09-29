from dataclasses import dataclass
from typing import Optional

@dataclass
class Album:
    """Modelo para representar um álbum"""
    id: str
    name: str
    artist: str
    total_tracks: int
    spotify_url: str
    image_url: Optional[str] = None


    @classmethod
    def from_spotify_data(cls, album_data):
        return cls(
            id=album_data['id'],
            name=album_data['name'],
            artist=', '.join([artist['name'] for artist in album_data['artists']]),
            total_tracks=album_data['total_tracks'],
            spotify_url=album_data['external_urls']['spotify'],
            image_url=album_data['images'][0]['url'] if album_data.get('images') else None
        )
from dataclasses import dataclass
from typing import List, Optional
import json

@dataclass


@dataclass
class Track:
    """Modelo para representar uma música"""
    id: str
    name: str
    artist: str
    album: str
    spotify_url: str
    image_url: Optional[str] = None
    preview_url: Optional[str] = None

    @classmethod
    def from_spotify_data(cls, track_data):
        return cls(
            id=track_data['id'],
            name=track_data['name'],
            artist=', '.join([artist['name'] for artist in track_data['artists']]),
            album=track_data['album']['name'],
            spotify_url=track_data['external_urls']['spotify'],
            image_url=track_data['album']['images'][0]['url'] if track_data['album']['images'] else None,
            preview_url=track_data.get('preview_url')
        )

@dataclass
class Playlist:
    """Modelo para representar uma playlist"""
    id: str
    name: str
    total_tracks: int
    image_url: Optional[str] = None

    @classmethod
    def from_spotify_data(cls, playlist_data):
        return cls(
            id=playlist_data['id'],
            name=playlist_data['name'],
            total_tracks=playlist_data['tracks']['total'],
            image_url=playlist_data['images'][0]['url'] if playlist_data.get('images') else None
        )

@dataclass
class Artist:
    """Modelo para representar um artista"""
    id: str
    name: str
    image_url: Optional[str] = None

    @classmethod
    def from_spotify_data(cls, artist_data):
        return cls(
            id=artist_data['id'],
            name=artist_data['name'],
            image_url=artist_data['images'][0]['url'] if artist_data.get('images') else None
        )