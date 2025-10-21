from src.cache_manager import CacheManager
import os
import logging
from logging.handlers import RotatingFileHandler
from functools import wraps
from datetime import timedelta, datetime
from flask import (
    Flask, render_template, request, redirect, url_for, session, jsonify
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from flask_talisman import Talisman
from flask_compress import Compress

from src.spotify_auth import (
    get_spotify_auth_url, handle_spotify_callback
)
from src.spotify_client import SpotifyClient
from src.music_crud import MusicCRUD
from src.playlist_manager import PlaylistManager
from src.favorites_manager import FavoritesManager
from src.forms import (
    SearchForm, PaginationForm, TrackIdForm, PlaylistIdForm, PlaylistForm
)

# ============================================
# CONFIGURAÇÃO DE LOGGING AVANÇADO
# ============================================
# Detectar ambiente antes de configurar logging
FLASK_ENV = os.getenv('FLASK_ENV', 'development')
IS_PRODUCTION = FLASK_ENV == 'production'

# Configurar diretório de logs
log_dir = 'logs'
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

# Configuração de logging
log_level = getattr(logging, os.getenv('LOG_LEVEL', 'INFO').upper())
log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

if IS_PRODUCTION:
    # Em produção: Logging em arquivo com rotação
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'rhythmbox.log'),
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(logging.Formatter(log_format))

    # Console logging mínimo
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.WARNING)
    console_handler.setFormatter(logging.Formatter(log_format))

    logging.basicConfig(
        level=log_level,
        handlers=[file_handler, console_handler]
    )
else:
    # Em desenvolvimento: Logging apenas no console
    logging.basicConfig(
        level=log_level,
        format=log_format
    )

logger = logging.getLogger(__name__)

# ============================================
# INICIALIZAÇÃO DO FLASK
# ============================================
app = Flask(__name__)

# ============================================
# CONFIGURAÇÕES DE SEGURANÇA
# ============================================

# Secret Key - OBRIGATÓRIA para produção
app.secret_key = os.getenv('FLASK_SECRET_KEY')
if not app.secret_key:
    raise ValueError(
        "FLASK_SECRET_KEY não está configurada! "
        "Gere uma com: python -c \"import secrets; print(secrets.token_hex(32))\""
    )

# Configurações de sessão segura
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(
    seconds=int(os.getenv('PERMANENT_SESSION_LIFETIME', 3600))
)
app.config['SESSION_COOKIE_SECURE'] = os.getenv(
    'SESSION_COOKIE_SECURE', 'False').lower() == 'true'
app.config['SESSION_COOKIE_HTTPONLY'] = os.getenv(
    'SESSION_COOKIE_HTTPONLY', 'True').lower() == 'true'
app.config['SESSION_COOKIE_SAMESITE'] = os.getenv(
    'SESSION_COOKIE_SAMESITE', 'Lax')

# Segurança adicional para produção
if IS_PRODUCTION:
    app.config['SESSION_COOKIE_SECURE'] = True  # Força HTTPS em produção
    logger.info("🔒 Modo PRODUÇÃO ativado - Segurança reforçada")
else:
    logger.info("⚠️  Modo DESENVOLVIMENTO ativado")

# ============================================
# RATE LIMITING
# ============================================
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=[
        os.getenv('RATELIMIT_DEFAULT', "200 per day"),
        "50 per hour"
    ],
    storage_uri=os.getenv('RATELIMIT_STORAGE_URL', 'memory://'),
    strategy="fixed-window",
    headers_enabled=True
)

logger.info(f"✅ Rate Limiting configurado: {limiter.enabled}")

# ============================================
# CORS (Cross-Origin Resource Sharing)
# ============================================
cors_origins = os.getenv('CORS_ORIGINS', '*')
if cors_origins != '*':
    cors_origins = cors_origins.split(',')

CORS(app, resources={
    r"/api/*": {
        "origins": cors_origins,
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": os.getenv(
            'CORS_ALLOW_CREDENTIALS', 'True'
        ).lower() == 'true'
    }
})

logger.info(f"✅ CORS configurado para: {cors_origins}")

# ============================================
# RESPONSE COMPRESSION
# ============================================
compress = Compress()
compress.init_app(app)

# Configurações de compressão
app.config['COMPRESS_MIMETYPES'] = [
    'text/html',
    'text/css',
    'text/xml',
    'application/json',
    'application/javascript',
    'text/javascript'
]
app.config['COMPRESS_LEVEL'] = 6  # Nível de compressão (1-9)
app.config['COMPRESS_MIN_SIZE'] = 500  # Comprimir apenas > 500 bytes
app.config['COMPRESS_ALGORITHM'] = 'gzip'  # Algoritmo (gzip ou br)

logger.info("✅ Compressão de respostas habilitada (gzip)")

# ============================================
# SECURITY HEADERS (Talisman)
# ============================================
if IS_PRODUCTION:
    # Talisman para headers de segurança (apenas em produção)
    csp = {
        'default-src': ["'self'"],
        'script-src': [
            "'self'",
            "'unsafe-inline'",
            "https://cdn.tailwindcss.com",
            "https://cdn.jsdelivr.net"
        ],
        'style-src': [
            "'self'",
            "'unsafe-inline'",
            "https://cdn.tailwindcss.com"
        ],
        'img-src': [
            "'self'",
            "data:",
            "https:",
            "https://i.scdn.co",
            "https://mosaic.scdn.co"
        ],
        'font-src': ["'self'", "data:", "https:"],
        'media-src': ["'self'", "https://p.scdn.co"],
        'connect-src': ["'self'", "https://api.spotify.com"]
    }

    Talisman(
        app,
        force_https=True,
        strict_transport_security=True,
        strict_transport_security_max_age=31536000,
        content_security_policy=csp,
        content_security_policy_nonce_in=['script-src'],
        feature_policy={
            'geolocation': "'none'",
            'microphone': "'none'",
            'camera': "'none'"
        }
    )
    logger.info("🔒 Talisman ativado - Headers de segurança configurados")
else:
    logger.info("⚠️  Talisman desabilitado em desenvolvimento")

# ============================================
# CACHE MANAGER
# ============================================

# Inicializar Redis para cache
try:
    import redis
    redis_url = os.getenv(
        'RATELIMIT_STORAGE_URL',
        'redis://localhost:6379'
    )
    # Remover prefixo memory:// se existir (fallback para redis)
    if redis_url.startswith('memory://'):
        redis_url = 'redis://localhost:6379'

    redis_client = redis.from_url(
        redis_url,
        decode_responses=True,
        socket_timeout=2,
        socket_connect_timeout=2
    )
    # Testar conexão
    redis_client.ping()
    app.cache_manager = CacheManager(redis_client)
    logger.info(f"✅ Cache Redis configurado: {redis_url}")

except Exception as e:
    # Cache desabilitado se Redis não disponível
    app.cache_manager = CacheManager(None)
    logger.warning(
        f"⚠️  Redis não disponível - Cache desabilitado: {e}"
    )

# ============================================
# MUSIC CRUD
# ============================================
crud = MusicCRUD()


# Decorator para rotas que requerem autenticação Spotify
def spotify_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = PlaylistManager.get_current_user()
        if not user:
            return redirect(url_for('login_spotify'))
        return f(*args, **kwargs)
    return decorated_function


# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(404)
def not_found_error(error):
    """Handler para erro 404 - Página não encontrada"""
    if request.path.startswith('/api/'):
        return {'error': 'Endpoint não encontrado', 'status': 404}, 404
    return render_template('errors/404.html'), 404


@app.errorhandler(500)
def internal_error(error):
    """Handler para erro 500 - Erro interno do servidor"""
    logger.error(f'Erro interno do servidor: {error}', exc_info=True)
    if request.path.startswith('/api/'):
        return {'error': 'Erro interno do servidor', 'status': 500}, 500
    return render_template('errors/500.html'), 500


@app.errorhandler(429)
def ratelimit_handler(error):
    """Handler para erro 429 - Rate limit excedido"""
    logger.warning(f'Rate limit excedido para {get_remote_address()}')
    if request.path.startswith('/api/'):
        return {
            'error': 'Muitas requisições. Tente novamente mais tarde.',
            'status': 429
        }, 429
    return render_template('errors/429.html'), 429


@app.errorhandler(403)
def forbidden_error(error):
    """Handler para erro 403 - Acesso negado"""
    if request.path.startswith('/api/'):
        return {'error': 'Acesso negado', 'status': 403}, 403
    return render_template('errors/403.html'), 403


# --- Rotas de autenticação Spotify ---


@app.route('/login_spotify')
def login_spotify():
    auth_url = get_spotify_auth_url()
    return redirect(auth_url)


@app.route('/callback')
def callback():
    handle_spotify_callback()
    # Redireciona para a página de buscar após autenticação bem-sucedida
    return redirect(url_for('buscar'))


@app.route('/logout_spotify')
def logout_spotify():
    session.pop('spotify_token_info', None)
    return redirect(url_for('index'))


@app.route('/')
def index():
    return render_template('index.html')

# Listar playlists reais do Spotify


@app.route('/playlists')
@spotify_login_required
def playlists():
    from src.models import Playlist
    sp = SpotifyClient(use_auth=True).get_spotify_instance()
    playlists_response = sp.current_user_playlists()
    playlists_data = playlists_response['items'] if playlists_response else []
    playlists = [Playlist.from_spotify_data(p) for p in playlists_data]
    return render_template('playlists.html', playlists=playlists)

# Exibir músicas de uma playlist


@app.route('/playlists/<playlist_id>/view')
@spotify_login_required
def view_playlist(playlist_id):
    sp = SpotifyClient(use_auth=True).get_spotify_instance()
    playlist = sp.playlist(playlist_id)
    return render_template('playlist/view.html', playlist=playlist)

# Criar playlist


@app.route('/playlists/create', methods=['GET', 'POST'])
@spotify_login_required
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
@spotify_login_required
def edit_playlist(playlist_id):
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
@spotify_login_required
def delete_playlist(playlist_id):
    sp = SpotifyClient(use_auth=True).get_spotify_instance()
    sp.current_user_unfollow_playlist(playlist_id)
    return redirect(url_for('playlists'))

# Rota para adicionar músicas à playlist (usuário deve estar logado no Spotify)


@app.route('/playlists/<playlist_id>/add', methods=['GET', 'POST'])
@spotify_login_required
def add_tracks_to_playlist(playlist_id):
    sp_client = SpotifyClient(use_auth=True).get_spotify_instance()
    playlist = sp_client.playlist(playlist_id)
    search_results = []
    message = None
    busca_realizada = False
    main_artist = None
    related_artists = []

    if request.method == 'POST':
        query = request.form.get('search_query', '').strip()
        modo = request.form.get('modo', 'musica')

        if 'search' in request.form:
            busca_realizada = True
            if query:
                music_crud = MusicCRUD()

                if modo == 'artista':
                    # Busca por artista com perfil completo
                    artists = music_crud.search_artists(query, limit=10)
                    if artists:
                        main_artist = music_crud.get_artist_details(
                            artists[0].id)
                        if main_artist:
                            main_artist.top_tracks = (
                                music_crud.get_artist_top_tracks(artists[0].id)
                            )
                    related_artists = music_crud.get_related_artists(
                        artists[0].id, limit=12)
                else:
                    # Busca por música
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
                modo = request.form.get('modo', 'musica')

                if modo == 'artista':
                    artists = music_crud.search_artists(query, limit=10)
                    if artists:
                        main_artist = music_crud.get_artist_details(
                            artists[0].id)
                        if main_artist:
                            main_artist.top_tracks = (
                                music_crud.get_artist_top_tracks(
                                    artists[0].id
                                )
                            )
                    related_artists = music_crud.get_related_artists(
                        artists[0].id, limit=12)
                else:
                    search_results = music_crud.search_tracks(query)

    return render_template(
        'playlist/add_tracks.html',
        playlist=playlist,
        search_results=search_results,
        message=message,
        busca_realizada=busca_realizada,
        main_artist=main_artist,
        related_artists=related_artists
    )


@app.route('/buscar', methods=['GET'])
@spotify_login_required
def buscar():
    """Busca músicas ou artistas no Spotify com validação."""
    try:
        # Validar query de busca
        query = request.args.get('q', '').strip()
        modo = request.args.get('modo', 'musica')

        if not query:
            return render_template('buscar.html', query=query, modo=modo)

        # Sanitizar query
        from src.validation_utils import sanitize_search_query
        query = sanitize_search_query(query, max_length=200)

        # Log da busca
        logger.info(
            f"Busca realizada - Query: '{query}', Modo: '{modo}', "
            f"User: {session.get('user_id', 'unknown')}"
        )

        if modo == 'artista':
            artists = crud.search_artists(query, limit=10)
            main_artist = None
            related_artists = []
            main_artist_tracks = []

            if artists:
                # Considera o primeiro artista retornado como principal
                main_artist = artists[0]

                # Busca detalhes completos do artista
                try:
                    main_artist = crud.get_artist_details(
                        main_artist.id
                    ) or main_artist
                except Exception as e:
                    logger.error(
                        f"Erro ao buscar detalhes do artista "
                        f"{main_artist.id}: {e}"
                    )

                # Busca artistas relacionados/similares
                try:
                    related_artists = crud.get_related_artists(
                        main_artist.id, limit=12
                    )
                except Exception as e:
                    logger.error(
                        f"Erro ao buscar artistas relacionados: {e}"
                    )
                    related_artists = []

                # Busca top tracks do artista principal
                try:
                    all_artist_tracks = crud.get_artist_top_tracks(
                        main_artist.id
                    )
                    main_artist_tracks = [
                        t for t in all_artist_tracks
                        if t.artist.lower() == main_artist.name.lower()
                    ]
                except Exception as e:
                    logger.error(
                        f"Erro ao buscar top tracks do artista: {e}"
                    )
                    main_artist_tracks = []

            # Converter para dict para facilitar o acesso no template
            from dataclasses import asdict
            main_artist_tracks = [asdict(t) for t in main_artist_tracks]
            related_artists_dict = [asdict(a) for a in related_artists]

            return render_template(
                'buscar.html',
                query=query,
                modo=modo,
                main_artist=main_artist,
                main_artist_tracks=main_artist_tracks,
                related_artists=related_artists_dict
            )
        else:  # modo == 'musica'
            try:
                tracks = crud.search_tracks(query)
                from dataclasses import asdict
                tracks = [asdict(t) for t in tracks]
            except Exception as e:
                logger.error(f"Erro ao buscar músicas: {e}")
                tracks = []

            return render_template(
                'buscar.html',
                query=query,
                modo=modo,
                other_tracks=tracks
            )

    except Exception as e:
        logger.error(
            f"Erro inesperado na rota /buscar: {e}",
            exc_info=True
        )
        return render_template(
            'buscar.html',
            query='',
            modo='musica',
            error="Erro ao realizar busca. Tente novamente."
        )


# ===== ROTAS DE FAVORITOS =====

@app.route('/favoritos')
@spotify_login_required
def favoritos():
    """Exibe a página de músicas favoritas do usuário"""
    # Obter parâmetros de paginação da query string
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    # default | name-asc | name-desc | artist-asc | artist-desc
    sort = request.args.get('sort', 'default')

    # Garantir que page seja >= 1
    page = max(1, page)

    # Se limit for muito alto (>1000) ou quando houver ordenação diferente
    # de 'default', buscar TODAS as músicas
    fetch_all = limit > 1000 or sort != 'default'

    if fetch_all:
        tracks, error = FavoritesManager.get_all_saved_tracks()
        if error:
            return render_template(
                'favoritos.html',
                tracks=[],
                error=error,
                total=0,
                page=1,
                limit=20,
                sort=sort
            )

        # Aplicar ordenação no backend
        def sort_key_name(t):
            return (t.name or '').casefold()

        def sort_key_artist(t):
            return (t.artist or '').casefold()

        if sort == 'name-asc':
            tracks.sort(key=sort_key_name)
        elif sort == 'name-desc':
            tracks.sort(key=sort_key_name, reverse=True)
        elif sort == 'artist-asc':
            tracks.sort(key=sort_key_artist)
        elif sort == 'artist-desc':
            tracks.sort(key=sort_key_artist, reverse=True)

        total_favorites = len(tracks)

    # Se o usuário pediu "todas", não paginar; senão, paginar
    # sobre a lista ordenada
        if limit > 1000:
            return render_template(
                'favoritos.html',
                tracks=tracks,
                error=None,
                total=total_favorites,
                page=1,
                limit=9999,
                sort=sort
            )
        else:
            limit = min(max(20, limit), 100)
            page = max(1, page)
            start = (page - 1) * limit
            end = start + limit
            page_tracks = tracks[start:end]
            return render_template(
                'favoritos.html',
                tracks=page_tracks,
                error=None,
                total=total_favorites,
                page=page,
                limit=limit,
                sort=sort
            )
    else:
        # Paginação normal sem ordenação (padrão: ordem do Spotify)
        limit = min(max(20, limit), 100)
        offset = (page - 1) * limit

        tracks, error = FavoritesManager.get_saved_tracks(
            limit=limit, offset=offset
        )
        total_favorites, total_error = (
            FavoritesManager.get_total_saved_tracks()
        )

        if total_error:
            logger.warning(f"Erro ao obter total de favoritos: {total_error}")
            total_favorites = len(tracks)  # Fallback para o tamanho da página

        if error:
            return render_template(
                'favoritos.html',
                tracks=[],
                error=error,
                total=0,
                page=1,
                limit=limit,
                sort=sort
            )

        return render_template(
            'favoritos.html',
            tracks=tracks,
            error=None,
            total=total_favorites,
            page=page,
            limit=limit,
            sort=sort
        )


@app.route('/api/favoritos')
@spotify_login_required
@limiter.limit("30 per minute")
def api_favoritos():
    """API endpoint para buscar favoritos com paginação via AJAX"""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    sort = request.args.get('sort', 'default')

    page = max(1, page)

    # Se limit for muito alto (>1000), buscar TODAS as músicas
    if limit > 1000 or sort != 'default':
        # Buscar todas as músicas de uma vez para aplicar ordenação global
        tracks, error = FavoritesManager.get_all_saved_tracks()

        if error:
            return {'success': False, 'error': error}, 500

        # Ordenar se necessário
        def sort_key_name(t):
            return (t.name or '').casefold()

        def sort_key_artist(t):
            return (t.artist or '').casefold()

        if sort == 'name-asc':
            tracks.sort(key=sort_key_name)
        elif sort == 'name-desc':
            tracks.sort(key=sort_key_name, reverse=True)
        elif sort == 'artist-asc':
            tracks.sort(key=sort_key_artist)
        elif sort == 'artist-desc':
            tracks.sort(key=sort_key_artist, reverse=True)

        total = len(tracks)

        # Se for "todas", retorna sem paginar
        if limit > 1000:
            tracks_data = [{
                'id': t.id,
                'name': t.name,
                'artist': t.artist,
                'album': t.album,
                'image_url': t.image_url,
                'spotify_url': t.spotify_url
            } for t in tracks]

            return {
                'success': True,
                'tracks': tracks_data,
                'total': total,
                'page': 1,
                'limit': total,
                'total_pages': 1
            }, 200
        else:
            # Paginar resultado ordenado
            limit = min(max(20, limit), 100)
            page = max(1, page)
            start = (page - 1) * limit
            end = start + limit
            paged_tracks = tracks[start:end]

            tracks_data = [{
                'id': t.id,
                'name': t.name,
                'artist': t.artist,
                'album': t.album,
                'image_url': t.image_url,
                'spotify_url': t.spotify_url
            } for t in paged_tracks]

            return {
                'success': True,
                'tracks': tracks_data,
                'total': total,
                'page': page,
                'limit': limit,
                'total_pages': (total + limit - 1) // limit
            }, 200
    else:
        # Paginação normal
        limit = min(max(20, limit), 100)
        offset = (page - 1) * limit

        tracks, error = FavoritesManager.get_saved_tracks(
            limit=limit,
            offset=offset
        )

        if error:
            return {'success': False, 'error': error}, 500

        # Obter total de favoritos
        total, error = FavoritesManager.get_total_saved_tracks()

        if error:
            logger.warning(f"Erro ao obter total de favoritos: {error}")
            total = len(tracks)  # Usar o tamanho da página atual como fallback

        # Converter tracks para dicionários
        tracks_data = []
        for track in tracks:
            tracks_data.append({
                'id': track.id,
                'name': track.name,
                'artist': track.artist,
                'album': track.album,
                'image_url': track.image_url,
                'spotify_url': track.spotify_url
            })

        return {
            'success': True,
            'tracks': tracks_data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit
        }, 200


@app.route('/favoritos/add/<track_id>', methods=['POST'])
@spotify_login_required
@limiter.limit("20 per minute")
def add_favorite(track_id):
    """Adiciona uma música aos favoritos com validação."""
    try:
        # Validar track_id
        from src.validation_utils import validate_spotify_id
        from wtforms.validators import ValidationError

        try:
            validate_spotify_id(track_id, id_type='track')
        except ValidationError as e:
            logger.warning(
                f"Track ID inválido recebido: {track_id} - {str(e)}"
            )
            return {
                'success': False,
                'message': f'ID de música inválido: {str(e)}'
            }, 400

        # Log da operação
        logger.info(
            f"Adicionando música aos favoritos - "
            f"Track ID: {track_id}, User: {session.get('user_id')}"
        )

        # Executar operação
        success, error = FavoritesManager.save_track(track_id)

        if success:
            logger.info(
                f"Música {track_id} adicionada aos favoritos com sucesso"
            )
            return {
                'success': True,
                'message': 'Música adicionada aos favoritos!'
            }, 200
        else:
            logger.warning(
                f"Falha ao adicionar música {track_id}: {error}"
            )
            return {'success': False, 'message': error}, 400

    except Exception as e:
        logger.error(
            f"Erro inesperado ao adicionar favorito: {e}",
            exc_info=True
        )
        return {
            'success': False,
            'message': 'Erro ao adicionar favorito. Tente novamente.'
        }, 500


@app.route('/favoritar', methods=['POST'])
@spotify_login_required
@limiter.limit("20 per minute")
def favoritar():
    """Adiciona uma música aos favoritos (via JSON body)"""
    data = request.get_json()

    if not data or 'track_id' not in data:
        return {
            'success': False,
            'message': 'ID da música não fornecido'
        }, 400

    track_id = data['track_id']
    success, error = FavoritesManager.save_track(track_id)

    if success:
        return {
            'success': True,
            'message': 'Música adicionada aos favoritos!'
        }, 200
    else:
        return {'success': False, 'message': error}, 400


@app.route('/favoritos/remove/<track_id>', methods=['POST'])
@spotify_login_required
@limiter.limit("20 per minute")
def remove_favorite(track_id):
    """Remove uma música dos favoritos com validação."""
    try:
        # Validar track_id
        from src.validation_utils import validate_spotify_id
        from wtforms.validators import ValidationError

        try:
            validate_spotify_id(track_id, id_type='track')
        except ValidationError as e:
            logger.warning(
                f"Track ID inválido ao remover: {track_id} - {str(e)}"
            )
            return {
                'success': False,
                'message': f'ID de música inválido: {str(e)}'
            }, 400

        # Log da operação
        logger.info(
            f"Removendo música dos favoritos - "
            f"Track ID: {track_id}, User: {session.get('user_id')}"
        )

        # Executar operação
        success, error = FavoritesManager.remove_saved_track(track_id)

        if success:
            logger.info(
                f"Música {track_id} removida dos favoritos com sucesso"
            )
            return {
                'success': True,
                'message': 'Música removida dos favoritos!'
            }, 200
        else:
            logger.warning(
                f"Falha ao remover música {track_id}: {error}"
            )
            return {'success': False, 'message': error}, 400

    except Exception as e:
        logger.error(
            f"Erro inesperado ao remover favorito: {e}",
            exc_info=True
        )
        return {
            'success': False,
            'message': 'Erro ao remover favorito. Tente novamente.'
        }, 500


# --- API para listar todos os artistas favoritos do usuário ---
@app.route('/api/favoritos/artistas')
@spotify_login_required
@limiter.limit("10 per minute")
def api_favoritos_artistas():
    # Busca todos os favoritos (apenas artistas)
    tracks, error = FavoritesManager.get_all_saved_tracks()
    if error:
        return {'success': False, 'error': error}, 500

    # Extrai todos os artistas únicos
    artists_set = set()
    import re
    for track in tracks:
        # Separar artistas por delimitadores comuns: , & feat. ft. with
        separators = r'[,&]|\sfeat\.?\s|\sft\.?\s|\swith\s'
        for artist in re.split(separators, track.artist):
            clean_artist = artist.strip()
            if clean_artist:
                artists_set.add(clean_artist)
    artists = sorted(artists_set, key=lambda x: x.lower())
    return {'success': True, 'artists': artists}, 200


# Rota para suprimir aviso do Chrome DevTools
@app.route('/.well-known/appspecific/com.chrome.devtools.json')
def devtools_config():
    return '', 204


# ============================================
# HEALTH CHECK ENDPOINT
# ============================================
@app.route('/health')
def health_check():
    """Endpoint para verificar saúde da aplicação"""
    try:
        # Verificar conexão com Spotify
        sp_client = SpotifyClient(use_auth=False)
        ok, msg = sp_client.test_connection()

        # Verificar cache
        cache_stats = app.cache_manager.get_stats()

        return {
            'status': 'healthy' if ok else 'degraded',
            'timestamp': datetime.utcnow().isoformat(),
            'environment': FLASK_ENV,
            'spotify_connection': 'ok' if ok else 'error',
            'cache': cache_stats,
            'message': msg
        }, 200 if ok else 503
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)
        }, 503


@app.route('/api/cache/stats')
@spotify_login_required
def cache_stats():
    """Endpoint para visualizar estatísticas do cache (apenas admin)"""
    try:
        stats = app.cache_manager.get_stats()
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
    except Exception as e:
        logger.error(f"Erro ao obter stats de cache: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro ao obter estatísticas'
        }), 500


@app.route('/api/cache/clear', methods=['POST'])
@spotify_login_required
@limiter.limit("5 per hour")
def cache_clear():
    """Endpoint para limpar cache (apenas admin, rate limited)"""
    try:
        # TODO: Adicionar verificação de admin
        pattern = request.json.get('pattern', 'rhythmbox:*')

        if pattern == '*':
            # Limpar todo o cache
            success = app.cache_manager.clear_all()
            message = 'Todo o cache foi limpo'
        else:
            # Limpar padrão específico
            deleted = app.cache_manager.delete_pattern(pattern)
            success = deleted > 0
            message = f'{deleted} chaves removidas'

        logger.info(
            f"Cache limpo - Pattern: {pattern}, "
            f"User: {session.get('user_id')}"
        )

        return jsonify({
            'success': success,
            'message': message
        }), 200
    except Exception as e:
        logger.error(f"Erro ao limpar cache: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro ao limpar cache'
        }), 500


# ============================================
# CONFIGURAÇÃO DO SERVIDOR
# ============================================
if __name__ == '__main__':
    # Carregar configurações do ambiente
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    port = int(os.getenv('FLASK_PORT', 3000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

    # Validar configuração de produção
    if IS_PRODUCTION:
        if debug:
            raise ValueError(
                "❌ ERRO: DEBUG MODE não pode estar ativo em produção!"
            )
        logger.warning(
            "⚠️  ATENÇÃO: Você está usando o servidor de desenvolvimento Flask.\n"
            "   Para produção, use Gunicorn ou uWSGI:\n"
            "   gunicorn --bind 0.0.0.0:8000 --workers 4 app:app"
        )

    # Log de inicialização
    logger.info(f"🚀 Iniciando RhythmBox")
    logger.info(f"   Ambiente: {FLASK_ENV}")
    logger.info(f"   Host: {host}:{port}")
    logger.info(f"   Debug: {debug}")

    if not debug:
        logger.info(f"   Logs: Modo produção ativado")

    # Iniciar servidor
    app.run(host=host, port=port, debug=debug)
