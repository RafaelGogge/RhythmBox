"""
Utilitários para validação e tratamento de erros na aplicação Flask.
Integração com Flask-WTF para validação segura de entradas.
"""

import logging
from functools import wraps
from flask import request, jsonify
from werkzeug.exceptions import BadRequest
from wtforms.validators import ValidationError

logger = logging.getLogger(__name__)


def validate_form(form_class):
    """
    Decorator para validar formulários Flask-WTF automaticamente.

    Args:
        form_class: Classe do formulário WTF a ser validada

    Returns:
        Decorator que valida o formulário antes de executar a função

    Exemplo:
        @app.route('/search')
        @validate_form(SearchForm)
        def search_route(form):
            query = form.query.data
            # ... lógica da rota
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Criar instância do formulário
            if request.method == 'POST':
                form = form_class(formdata=request.form)
            elif request.method == 'GET':
                form = form_class(formdata=request.args)
            else:
                form = form_class()

            # Validar formulário
            if not form.validate():
                logger.warning(
                    f"Validação falhou para {form_class.__name__}: "
                    f"{form.errors}"
                )

                # Retornar erros em formato JSON para requisições API
                if request.is_json or request.path.startswith('/api/'):
                    return jsonify({
                        'success': False,
                        'errors': form.errors
                    }), 400

                # Para outras requisições, levantar BadRequest
                error_messages = []
                for field, errors in form.errors.items():
                    error_messages.extend(errors)
                raise BadRequest('; '.join(error_messages))

            # Passar formulário válido para a função
            return f(form, *args, **kwargs)
        return wrapper
    return decorator


def safe_spotify_call(default_return=None, log_error=True):
    """
    Decorator para envolver chamadas à API do Spotify com tratamento de erro.

    Args:
        default_return: Valor padrão a retornar em caso de erro
        log_error: Se deve logar o erro

    Returns:
        Decorator que captura exceções da API do Spotify

    Exemplo:
        @safe_spotify_call(default_return=[])
        def search_tracks(query):
            return spotify_client.search(query)
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                return f(*args, **kwargs)
            except Exception as e:
                if log_error:
                    logger.error(
                        f"Erro em chamada Spotify ({f.__name__}): {str(e)}",
                        exc_info=True
                    )

                # Retornar valor padrão ou levantar exceção
                if default_return is not None:
                    return default_return
                raise
        return wrapper
    return decorator


def validate_spotify_id(spotify_id, id_type='track'):
    """
    Valida se um ID do Spotify está no formato correto.

    Args:
        spotify_id: ID a ser validado
        id_type: Tipo de ID ('track', 'playlist', 'artist', 'album')

    Returns:
        True se válido

    Raises:
        ValidationError: Se ID for inválido
    """
    import re

    if not spotify_id:
        raise ValidationError(f"ID do {id_type} não pode ser vazio")

    if not isinstance(spotify_id, str):
        raise ValidationError(f"ID do {id_type} deve ser uma string")

    if len(spotify_id) != 22:
        raise ValidationError(
            f"ID do {id_type} deve ter exatamente 22 caracteres"
        )

    # IDs do Spotify contêm apenas caracteres alfanuméricos
    if not re.match(r'^[a-zA-Z0-9]{22}$', spotify_id):
        raise ValidationError(
            f"ID do {id_type} contém caracteres inválidos"
        )

    return True


def sanitize_search_query(query, max_length=200):
    """
    Sanitiza query de busca removendo caracteres perigosos.

    Args:
        query: String de busca a ser sanitizada
        max_length: Tamanho máximo permitido

    Returns:
        Query sanitizada
    """
    if not query:
        return ""

    # Remover caracteres potencialmente perigosos
    import re

    # Remover caracteres de controle
    query = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', query)

    # Limitar tamanho
    query = query[:max_length]

    # Remover espaços extras
    query = ' '.join(query.split())

    return query.strip()


def handle_spotify_error(error, context=""):
    """
    Trata erros específicos da API do Spotify de forma consistente.

    Args:
        error: Exceção capturada
        context: Contexto adicional para log

    Returns:
        Tupla (mensagem_usuario, status_code)
    """
    error_str = str(error).lower()

    # Rate limiting
    if 'rate limit' in error_str or '429' in error_str:
        logger.warning(f"Rate limit atingido {context}: {error}")
        return "Muitas requisições. Aguarde um momento.", 429

    # Token expirado
    if 'token' in error_str and 'expired' in error_str:
        logger.warning(f"Token expirado {context}: {error}")
        return "Sua sessão expirou. Faça login novamente.", 401

    # Não encontrado
    if '404' in error_str or 'not found' in error_str:
        logger.info(f"Recurso não encontrado {context}: {error}")
        return "Conteúdo não encontrado.", 404

    # Erro de autenticação
    if '401' in error_str or 'unauthorized' in error_str:
        logger.warning(f"Erro de autenticação {context}: {error}")
        return "Erro de autenticação. Faça login novamente.", 401

    # Erro genérico
    logger.error(f"Erro inesperado {context}: {error}", exc_info=True)
    return "Erro ao comunicar com o Spotify. Tente novamente.", 500


def validate_pagination_params(page, limit, max_limit=100):
    """
    Valida parâmetros de paginação.

    Args:
        page: Número da página (começa em 1)
        limit: Itens por página
        max_limit: Limite máximo permitido

    Returns:
        Tupla (page, limit) validados

    Raises:
        ValidationError: Se parâmetros forem inválidos
    """
    try:
        page = int(page)
        limit = int(limit)
    except (ValueError, TypeError):
        raise ValidationError("Parâmetros de paginação devem ser números")

    if page < 1:
        raise ValidationError("Número da página deve ser maior que 0")

    if limit < 1:
        raise ValidationError("Limite deve ser maior que 0")

    if limit > max_limit:
        raise ValidationError(f"Limite máximo é {max_limit}")

    return page, limit


def log_request_info(message=""):
    """
    Loga informações úteis sobre a requisição atual.

    Args:
        message: Mensagem adicional para o log
    """
    logger.info(
        f"{message} | "
        f"Método: {request.method} | "
        f"Path: {request.path} | "
        f"IP: {request.remote_addr} | "
        f"User-Agent: {request.headers.get('User-Agent', 'Unknown')}"
    )


def safe_json_response(data, status_code=200):
    """
    Cria uma resposta JSON segura tratando possíveis erros.

    Args:
        data: Dados a serem serializados
        status_code: Código HTTP da resposta

    Returns:
        Response JSON
    """
    try:
        return jsonify(data), status_code
    except Exception as e:
        logger.error(f"Erro ao serializar JSON: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Erro ao processar resposta'
        }), 500
