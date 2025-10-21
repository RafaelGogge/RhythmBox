"""
Sistema de cache com Redis para otimização de performance.
Implementa cache inteligente para resultados do Spotify API.
"""

import json
import logging
import hashlib
from functools import wraps
from typing import Any, Optional, Callable
from datetime import timedelta

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Gerenciador de cache Redis com suporte a TTL e invalidação.
    """

    def __init__(self, redis_client=None):
        """
        Inicializa o gerenciador de cache.

        Args:
            redis_client: Cliente Redis (opcional, usa conexão padrão)
        """
        self.redis = redis_client
        self._enabled = redis_client is not None

        if self._enabled:
            logger.info("✅ Cache Redis habilitado")
        else:
            logger.warning(
                "⚠️  Cache Redis desabilitado - "
                "performance pode ser afetada"
            )

    @property
    def enabled(self) -> bool:
        """Retorna se o cache está habilitado e funcional."""
        if not self._enabled:
            return False

        try:
            # Testa conexão com Redis
            self.redis.ping()
            return True
        except Exception as e:
            logger.error(f"Redis não disponível: {e}")
            return False

    def _generate_key(
        self,
        prefix: str,
        *args,
        **kwargs
    ) -> str:
        """
        Gera chave única para cache baseada em argumentos.

        Args:
            prefix: Prefixo da chave (ex: 'search', 'artist')
            args: Argumentos posicionais
            kwargs: Argumentos nomeados

        Returns:
            Chave única para o cache
        """
        # Criar string única dos argumentos
        key_parts = [str(arg) for arg in args]
        key_parts.extend([f"{k}={v}" for k, v in sorted(kwargs.items())])
        key_string = "|".join(key_parts)

        # Hash para chaves curtas e seguras
        key_hash = hashlib.md5(key_string.encode()).hexdigest()[:16]

        return f"rhythmbox:{prefix}:{key_hash}"

    def get(self, key: str) -> Optional[Any]:
        """
        Recupera valor do cache.

        Args:
            key: Chave do cache

        Returns:
            Valor desserializado ou None se não encontrado
        """
        if not self.enabled:
            return None

        try:
            value = self.redis.get(key)
            if value:
                logger.debug(f"✅ Cache HIT: {key}")
                return json.loads(value)

            logger.debug(f"❌ Cache MISS: {key}")
            return None

        except Exception as e:
            logger.error(f"Erro ao ler cache {key}: {e}")
            return None

    def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Armazena valor no cache.

        Args:
            key: Chave do cache
            value: Valor a ser armazenado (será serializado)
            ttl: Tempo de vida em segundos (None = sem expiração)

        Returns:
            True se armazenado com sucesso
        """
        if not self.enabled:
            return False

        try:
            serialized = json.dumps(value, default=str)

            if ttl:
                self.redis.setex(key, ttl, serialized)
            else:
                self.redis.set(key, serialized)

            logger.debug(f"💾 Cache SET: {key} (TTL: {ttl}s)")
            return True

        except Exception as e:
            logger.error(f"Erro ao salvar cache {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """
        Remove valor do cache.

        Args:
            key: Chave do cache

        Returns:
            True se removido com sucesso
        """
        if not self.enabled:
            return False

        try:
            self.redis.delete(key)
            logger.debug(f"🗑️  Cache DELETE: {key}")
            return True

        except Exception as e:
            logger.error(f"Erro ao deletar cache {key}: {e}")
            return False

    def delete_pattern(self, pattern: str) -> int:
        """
        Remove todas as chaves que correspondem ao padrão.

        Args:
            pattern: Padrão de chave (ex: 'rhythmbox:search:*')

        Returns:
            Número de chaves removidas
        """
        if not self.enabled:
            return 0

        try:
            keys = self.redis.keys(pattern)
            if keys:
                deleted = self.redis.delete(*keys)
                logger.info(f"🗑️  Cache DELETE pattern {pattern}: {deleted}")
                return deleted
            return 0

        except Exception as e:
            logger.error(f"Erro ao deletar pattern {pattern}: {e}")
            return 0

    def clear_all(self) -> bool:
        """
        Limpa todo o cache da aplicação.

        Returns:
            True se limpo com sucesso
        """
        if not self.enabled:
            return False

        try:
            self.redis.flushdb()
            logger.warning("🗑️  TODO cache limpo")
            return True

        except Exception as e:
            logger.error(f"Erro ao limpar cache: {e}")
            return False

    def get_stats(self) -> dict:
        """
        Retorna estatísticas do cache.

        Returns:
            Dict com estatísticas (keys, memory, hits, misses)
        """
        if not self.enabled:
            return {
                'enabled': False,
                'message': 'Redis não disponível'
            }

        try:
            info = self.redis.info('stats')
            keyspace = self.redis.info('keyspace')

            # Total de chaves da aplicação
            app_keys = len(self.redis.keys('rhythmbox:*'))

            return {
                'enabled': True,
                'total_keys': app_keys,
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'hit_rate': self._calculate_hit_rate(info),
                'memory_used': info.get('used_memory_human', 'N/A'),
                'connected_clients': info.get('connected_clients', 0)
            }

        except Exception as e:
            logger.error(f"Erro ao obter stats: {e}")
            return {'enabled': False, 'error': str(e)}

    @staticmethod
    def _calculate_hit_rate(info: dict) -> float:
        """Calcula taxa de hit do cache."""
        hits = info.get('keyspace_hits', 0)
        misses = info.get('keyspace_misses', 0)

        if hits + misses == 0:
            return 0.0

        return round((hits / (hits + misses)) * 100, 2)


def cache_result(
    prefix: str,
    ttl: int = 300,
    key_func: Optional[Callable] = None
):
    """
    Decorator para cachear resultados de funções.

    Args:
        prefix: Prefixo da chave de cache
        ttl: Tempo de vida em segundos (padrão: 5 minutos)
        key_func: Função customizada para gerar chave (opcional)

    Exemplo:
        @cache_result('search_tracks', ttl=300)
        def search_tracks(query, limit=10):
            return spotify.search(query, limit=limit)
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Obter instância do cache manager
            from flask import current_app
            cache_manager = getattr(
                current_app,
                'cache_manager',
                None
            )

            if not cache_manager or not cache_manager.enabled:
                # Cache desabilitado, executar função normalmente
                return f(*args, **kwargs)

            # Gerar chave de cache
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = cache_manager._generate_key(
                    prefix,
                    *args,
                    **kwargs
                )

            # Tentar recuperar do cache
            cached = cache_manager.get(cache_key)
            if cached is not None:
                return cached

            # Executar função e cachear resultado
            result = f(*args, **kwargs)

            if result is not None:
                cache_manager.set(cache_key, result, ttl=ttl)

            return result

        return wrapper
    return decorator


def invalidate_cache(pattern: str):
    """
    Decorator para invalidar cache após execução de função.

    Args:
        pattern: Padrão de chave a invalidar (ex: 'rhythmbox:playlists:*')

    Exemplo:
        @invalidate_cache('rhythmbox:playlists:*')
        def create_playlist(name):
            # Criar playlist
            return playlist
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            result = f(*args, **kwargs)

            # Invalidar cache após execução bem-sucedida
            from flask import current_app
            cache_manager = getattr(
                current_app,
                'cache_manager',
                None
            )

            if cache_manager and cache_manager.enabled:
                cache_manager.delete_pattern(pattern)

            return result

        return wrapper
    return decorator


# TTL padrões recomendados (em segundos)
TTL_SEARCH = 300        # 5 minutos - buscas
TTL_ARTIST_DETAILS = 1800   # 30 minutos - detalhes de artista
TTL_TRACK_DETAILS = 1800    # 30 minutos - detalhes de track
TTL_PLAYLIST = 600      # 10 minutos - playlists
TTL_FAVORITES = 120     # 2 minutos - favoritos (muda frequente)
TTL_USER_PROFILE = 3600     # 1 hora - perfil do usuário
TTL_RELATED_ARTISTS = 3600  # 1 hora - artistas relacionados
