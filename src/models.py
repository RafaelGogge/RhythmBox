import json
from typing import List, Optional
from dataclasses import dataclass


@dataclass
class Album:
    """Modelo para representar um álbum"""
    id: str
    name: str
    artist: str
    total_tracks: int
    spotify_url: str
    image_url: Optional[str] = None
    release_date: Optional[str] = None

    @classmethod
    def from_spotify_data(cls, album_data):
        # Tratar external_urls que pode não existir
        spotify_url = album_data.get('external_urls', {}).get('spotify', '')

        # Garantir image_url retorna '' quando não há imagens
        images = album_data.get('images', [])
        image_url = images[0]['url'] if images else ''

        return cls(
            id=album_data['id'],
            name=album_data['name'],
            artist=', '.join([artist['name']
                             for artist in album_data.get('artists', [])]),
            total_tracks=album_data.get('total_tracks', 0),
            spotify_url=spotify_url,
            image_url=image_url,
            release_date=album_data.get('release_date')
        )


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
        # Garantir image_url retorna '' quando não há imagens
        album_images = track_data.get('album', {}).get('images', [])
        image_url = album_images[0]['url'] if album_images else ''

        return cls(
            id=track_data['id'],
            name=track_data['name'],
            artist=', '.join([artist['name']
                             for artist in track_data.get('artists', [])]),
            album=track_data.get('album', {}).get('name', ''),
            spotify_url=track_data.get('external_urls', {}).get(
                'spotify', ''
            ),
            image_url=image_url,
            preview_url=track_data.get('preview_url')
        )


@dataclass
class Playlist:
    """Modelo para representar uma playlist"""
    id: str
    name: str
    total_tracks: int
    image_url: Optional[str] = None
    description: Optional[str] = None

    @classmethod
    def from_spotify_data(cls, playlist_data):
        # Garantir image_url retorna '' quando não há imagens
        images = playlist_data.get('images', [])
        image_url = images[0]['url'] if images else ''

        return cls(
            id=playlist_data['id'],
            name=playlist_data['name'],
            total_tracks=playlist_data.get('tracks', {}).get('total', 0),
            image_url=image_url,
            description=playlist_data.get('description')
        )


@dataclass
class Artist:
    """Modelo para representar um artista"""
    id: str
    name: str
    image_url: Optional[str] = None
    genres: Optional[List[str]] = None
    popularity: Optional[int] = None
    followers: Optional[int] = None
    spotify_url: Optional[str] = None
    top_tracks: Optional[List['Track']] = None

    @classmethod
    def from_spotify_data(cls, artist_data):
        # Garantir image_url retorna '' quando não há imagens
        images = artist_data.get('images', [])
        image_url = images[0]['url'] if images else ''

        return cls(
            id=artist_data['id'],
            name=artist_data['name'],
            image_url=image_url,
            genres=artist_data.get('genres', []),
            popularity=artist_data.get('popularity', 0),
            followers=artist_data.get('followers', {}).get('total', 0),
            spotify_url=artist_data.get('external_urls', {}).get('spotify')
        )
