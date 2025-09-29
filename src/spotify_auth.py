from flask import session, redirect, url_for, request
from spotipy.oauth2 import SpotifyOAuth
import os

def get_spotify_oauth():
    return SpotifyOAuth(
        client_id=os.getenv('SPOTIFY_CLIENT_ID'),
        client_secret=os.getenv('SPOTIFY_CLIENT_SECRET'),
        redirect_uri=os.getenv('SPOTIFY_REDIRECT_URI'),
        scope="playlist-modify-public playlist-modify-private user-library-read user-library-modify user-read-private"
    )

def get_spotify_auth_url():
    sp_oauth = get_spotify_oauth()
    return sp_oauth.get_authorize_url()

def handle_spotify_callback():
    sp_oauth = get_spotify_oauth()
    code = request.args.get('code')
    token_info = sp_oauth.get_access_token(code, as_dict=True)
    session['spotify_token_info'] = token_info
    return token_info

def get_spotify_token():
    token_info = session.get('spotify_token_info')
    if not token_info:
        return None
    sp_oauth = get_spotify_oauth()
    if sp_oauth.is_token_expired(token_info):
        token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
        session['spotify_token_info'] = token_info
    return token_info['access_token']
