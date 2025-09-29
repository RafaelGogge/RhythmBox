import os
from flask import (
    Flask, render_template, request, redirect, url_for, session
)
from src.spotify_auth import (
    get_spotify_auth_url, handle_spotify_callback
)
from src.spotify_client import SpotifyClient
from src.music_crud import MusicCRUD
from src.playlist_manager import PlaylistManager

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'supersecretkey')
crud = MusicCRUD()

# --- Rotas de autenticação Spotify ---


@app.route('/login_spotify')
def login_spotify():
    auth_url = get_spotify_auth_url()
    return redirect(auth_url)


@app.route('/callback')
def callback():
    handle_spotify_callback()
    return redirect(url_for('playlists'))


@app.route('/logout_spotify')
def logout_spotify():
    session.pop('spotify_token_info', None)
    return redirect(url_for('index'))


@app.route('/')
def index():
    return render_template('index.html')

# Listar playlists reais do Spotify


@app.route('/playlists')
def playlists():
    from src.models import Playlist
    user = PlaylistManager.get_current_user()
    if not user:
        return redirect(url_for('login_spotify'))
    sp = SpotifyClient(use_auth=True).get_spotify_instance()
    playlists_response = sp.current_user_playlists()
    playlists_data = playlists_response['items'] if playlists_response else []
    playlists = [Playlist.from_spotify_data(p) for p in playlists_data]
    return render_template('playlists.html', playlists=playlists)

# Exibir músicas de uma playlist


@app.route('/playlists/<playlist_id>/view')
def view_playlist(playlist_id):
    user = PlaylistManager.get_current_user()
    if not user:
        return redirect(url_for('login_spotify'))
    sp = SpotifyClient(use_auth=True).get_spotify_instance()
    playlist = sp.playlist(playlist_id)
    return render_template('playlist/view.html', playlist=playlist)

# Criar playlist


@app.route('/playlists/create', methods=['GET', 'POST'])
def create_playlist():
    user = PlaylistManager.get_current_user()
    if not user:
        return redirect(url_for('login_spotify'))
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        if name:
            # Cria playlist real no Spotify
            playlist, err = PlaylistManager.create_playlist(user['id'], name)
            if err:
                return f"Erro ao criar playlist: {err}", 400
            return redirect(url_for('playlists'))
    return render_template('playlist/create.html')

# Editar playlist real do Spotify (apenas nome)


@app.route('/playlists/edit/<playlist_id>', methods=['GET', 'POST'])
def edit_playlist(playlist_id):
    user = PlaylistManager.get_current_user()
    if not user:
        return redirect(url_for('login_spotify'))
    sp = SpotifyClient(use_auth=True).get_spotify_instance()
    playlist = sp.playlist(playlist_id)
    if request.method == 'POST':
        # Remover música da playlist
        if 'remove_track' in request.form:
            track_uri = request.form.get('remove_track_uri')
            if track_uri:
                sp.playlist_remove_all_occurrences_of_items(
                    playlist_id, [track_uri])
                # Atualiza a playlist após remoção
                playlist = sp.playlist(playlist_id)
        # Editar nome da playlist
        else:
            name = request.form.get('name', '').strip()
            if name:
                sp.playlist_change_details(playlist_id, name=name)
                return redirect(url_for('playlists'))
    return render_template('playlist/edit.html', playlist=playlist)

# Remover playlist real do Spotify (deleta playlist do usuário)


@app.route('/playlists/delete/<playlist_id>', methods=['POST'])
def delete_playlist(playlist_id):
    user = PlaylistManager.get_current_user()
    if not user:
        return redirect(url_for('login_spotify'))
    sp = SpotifyClient(use_auth=True).get_spotify_instance()
    sp.current_user_unfollow_playlist(playlist_id)
    return redirect(url_for('playlists'))

# Rota para adicionar músicas à playlist (usuário deve estar logado no Spotify)


@app.route('/playlists/<playlist_id>/add', methods=['GET', 'POST'])
def add_tracks_to_playlist(playlist_id):
    user = PlaylistManager.get_current_user()
    if not user:
        return redirect(url_for('login_spotify'))
    sp_client = SpotifyClient(use_auth=True).get_spotify_instance()
    playlist = sp_client.playlist(playlist_id)
    search_results = []
    message = None
    busca_realizada = False
    if request.method == 'POST':
        query = request.form.get('search_query', '').strip()
        # modo = request.form.get('modo', 'musica')  # Não utilizado
        if 'search' in request.form:
            busca_realizada = True
            if query:
                music_crud = MusicCRUD()
                search_results = music_crud.search_tracks(query)
        elif 'add_track' in request.form:
            track_uri = request.form.get('track_uri')
            if track_uri:
                ok, err = PlaylistManager.add_tracks_to_playlist(
                    playlist_id, [track_uri]
                )
                if ok:
                    message = 'Música adicionada com sucesso!'
                else:
                    message = f'Erro: {err}'
            # Refaz a busca após adicionar
            if query:
                busca_realizada = True
                music_crud = MusicCRUD()
                search_results = music_crud.search_tracks(query)
    return render_template(
        'playlist/add_tracks.html',
        playlist=playlist,
        search_results=search_results,
        message=message,
        busca_realizada=busca_realizada
    )


@app.route('/buscar', methods=['GET'])
def buscar():
    query = request.args.get('q', '').strip()
    modo = request.args.get('modo', 'musica')
    if not query:
        return render_template('buscar.html', query=query, modo=modo)

    if modo == 'artista':
        artists = crud.search_artists(query, limit=3)
        main_artist = None
        main_artist_tracks = []
        other_tracks = []
        if artists:
            # Considera o primeiro artista retornado como principal
            main_artist = artists[0]
            all_artist_tracks = crud.get_artist_top_tracks(main_artist.id)
            main_artist_tracks = [
                t for t in all_artist_tracks
                if t.artist.lower() == main_artist.name.lower()
            ]
        # Buscar todas as músicas relacionadas ao termo
        all_tracks = crud.search_tracks(query)
        # Recomendações: músicas que não são do artista principal
        other_tracks = [
            t for t in all_tracks
            if not main_artist or t.artist.lower() != main_artist.name.lower()
        ]

        # Converter para dict para garantir preview_url acessível
        from dataclasses import asdict
        main_artist_tracks = [asdict(t) for t in main_artist_tracks]
        other_tracks = [asdict(t) for t in other_tracks]
        return render_template(
            'buscar.html',
            query=query,
            modo=modo,
            main_artist=main_artist,
            main_artist_tracks=main_artist_tracks,
            other_tracks=other_tracks
        )
    else:  # modo == 'musica'
        tracks = crud.search_tracks(query)
        from dataclasses import asdict
        tracks = [asdict(t) for t in tracks]
        return render_template(
            'buscar.html',
            query=query,
            modo=modo,
            other_tracks=tracks
        )


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=3000, debug=True)
