from typing import List, Optional, Tuple, Any
import logging

from src.spotify_auth import get_spotify_token
from src.spotify_client import SpotifyClient
from src.models import Track

# Configurar logger
logger = logging.getLogger(__name__)


class FavoritesManager:
    """
    Gerenciador de músicas favoritas do usuário no Spotify.
    Gerencia operações CRUD para "Liked Songs" (Saved Tracks).
    """

    # Constantes
    MAX_TRACKS_PER_REQUEST = 50
    MAX_IDS_CHECK = 50

    @staticmethod
    def _parse_tracks_from_response(items: List[dict]) -> List[Track]:
        """
        Converte items da resposta da API em objetos Track.

        Args:
            items: Lista de items retornados pela API

        Returns:
            Lista de Track objects válidos
        """
        tracks: List[Track] = []
        for item in items:
            if (item and isinstance(item, dict) and 'track' in item
                    and item['track']):
                try:
                    track = Track.from_spotify_data(item['track'])
                    tracks.append(track)
                except Exception as e:
                    logger.warning(f"Erro ao processar track: {e}")
                    continue
        return tracks

    @staticmethod
    def _validate_authentication() -> Tuple[Any, Optional[str]]:
        """
        Valida autenticação do usuário e retorna instância do Spotify.

        Returns:
            tuple: (instância do SpotifyClient ou None,
                    mensagem de erro ou None)
        """
        try:
            token = get_spotify_token()
            if not token:
                logger.warning(
                    "Tentativa de acesso sem token de autenticação"
                )
                return None, "Usuário não autenticado no Spotify."

            # SpotifyOAuth gerencia o token internamente
            sp = SpotifyClient(
                use_auth=True
            ).get_spotify_instance()

            if not sp:
                logger.error("Falha ao obter instância do Spotify")
                return None, "Erro ao conectar ao Spotify."

            return sp, None

        except Exception as e:
            logger.error(
                f"Erro na validação de autenticação: {e}",
                exc_info=True
            )
            return None, f"Erro ao conectar ao Spotify: {str(e)}"

    @staticmethod
    def get_saved_tracks(
        limit: int = 50, offset: int = 0
    ) -> Tuple[List[Track], Optional[str]]:
        """
        Obtém músicas favoritas do usuário com paginação.

        Args:
            limit: Número máximo de músicas (padrão: 50, máx: 50)
            offset: Posição inicial para paginação (padrão: 0)

        Returns:
            tuple: (lista de Track objects, mensagem de erro ou None)
        """
        # Validar e limitar parâmetros
        limit = max(1, min(FavoritesManager.MAX_TRACKS_PER_REQUEST, limit))
        offset = max(0, offset)

        logger.info(f"Buscando favoritos: limit={limit}, offset={offset}")

        sp, error = FavoritesManager._validate_authentication()
        if error or sp is None:
            return [], error or "Erro na autenticação"

        try:
            results = sp.current_user_saved_tracks(limit=limit, offset=offset)

            if not results:
                logger.warning("Resposta vazia do Spotify API")
                return [], "Nenhum resultado retornado pela API"

            tracks: List[Track] = []
            if 'items' in results and isinstance(results['items'], list):
                tracks = FavoritesManager._parse_tracks_from_response(
                    results['items']
                )

            logger.info(f"Retornando {len(tracks)} músicas favoritas")
            return tracks, None

        except Exception as e:
            error_msg = f"Erro ao obter favoritos: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return [], error_msg

    @staticmethod
    def get_all_saved_tracks() -> Tuple[List[Track], Optional[str]]:
        """
        Obtém TODAS as músicas favoritas do usuário (paginação automática).
        ⚠️ Pode ser lento para bibliotecas grandes!

        Returns:
            tuple: (lista completa de Track objects, mensagem de erro ou None)
        """
        logger.info("Iniciando busca de TODAS as músicas favoritas")

        sp, error = FavoritesManager._validate_authentication()
        if error or sp is None:
            return [], error or "Erro na autenticação"

        try:
            all_tracks: List[Track] = []
            limit = FavoritesManager.MAX_TRACKS_PER_REQUEST
            offset = 0
            page = 1

            while True:
                logger.debug(f"Buscando página {page} (offset={offset})")

                results = sp.current_user_saved_tracks(
                    limit=limit, offset=offset)

                if not results or 'items' not in results:
                    logger.warning(f"Sem resultados na página {page}")
                    break

                items = results['items']
                if not items or not isinstance(items, list):
                    logger.info(f"Lista vazia na página {page}, finalizando")
                    break

                # Usar método auxiliar para parsing
                page_tracks = FavoritesManager._parse_tracks_from_response(
                    items
                )
                all_tracks.extend(page_tracks)

                # Verificar se há mais páginas
                if len(items) < limit:
                    logger.info(f"Última página alcançada (página {page})")
                    break

                offset += limit
                page += 1

                # Proteção contra loop infinito
                if page > 1000:
                    logger.error("Limite de páginas excedido (proteção)")
                    break

            logger.info(
                f"Total de {len(all_tracks)} músicas favoritas carregadas")
            return all_tracks, None

        except Exception as e:
            error_msg = f"Erro ao obter todos os favoritos: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return [], error_msg

    @staticmethod
    def save_track(track_id: str) -> Tuple[bool, Optional[str]]:
        """
        Adiciona uma música aos favoritos do usuário.

        Args:
            track_id: ID da música no Spotify (não pode ser vazio)

        Returns:
            tuple: (sucesso bool, mensagem de erro ou None)
        """
        if not track_id or not track_id.strip():
            logger.warning("Tentativa de salvar track com ID inválido")
            return False, "ID da música inválido."

        track_id = track_id.strip()
        logger.info(f"Adicionando track aos favoritos: {track_id}")

        sp, error = FavoritesManager._validate_authentication()
        if error or sp is None:
            return False, error or "Erro na autenticação"

        try:
            sp.current_user_saved_tracks_add(tracks=[track_id])
            logger.info(f"Track adicionado com sucesso: {track_id}")
            return True, None

        except Exception as e:
            error_msg = f"Erro ao adicionar aos favoritos: {str(e)}"
            logger.error(f"{error_msg} (track_id: {track_id})", exc_info=True)
            return False, error_msg

    @staticmethod
    def remove_saved_track(track_id: str) -> Tuple[bool, Optional[str]]:
        """
        Remove uma música dos favoritos do usuário.

        Args:
            track_id: ID da música no Spotify (não pode ser vazio)

        Returns:
            tuple: (sucesso bool, mensagem de erro ou None)
        """
        if not track_id or not track_id.strip():
            logger.warning("Tentativa de remover track com ID inválido")
            return False, "ID da música inválido."

        track_id = track_id.strip()
        logger.info(f"Removendo track dos favoritos: {track_id}")

        sp, error = FavoritesManager._validate_authentication()
        if error or sp is None:
            return False, error or "Erro na autenticação"

        try:
            sp.current_user_saved_tracks_delete(tracks=[track_id])
            logger.info(f"Track removido com sucesso: {track_id}")
            return True, None

        except Exception as e:
            error_msg = f"Erro ao remover dos favoritos: {str(e)}"
            logger.error(f"{error_msg} (track_id: {track_id})", exc_info=True)
            return False, error_msg

    @staticmethod
    def check_saved_tracks(
        track_ids: List[str]
    ) -> Tuple[List[bool], Optional[str]]:
        """
        Verifica quais músicas estão salvas nos favoritos.
        Processa em lotes de 50 IDs por vez (limite da API).

        Args:
            track_ids: Lista de IDs das músicas para verificar

        Returns:
            tuple: (lista de booleanos indicando status, erro ou None)
        """
        if not track_ids:
            logger.debug("Lista vazia de track_ids para verificação")
            return [], None

        # Remover IDs vazios ou inválidos
        track_ids = [tid.strip() for tid in track_ids if tid and tid.strip()]

        if not track_ids:
            logger.warning("Todos os track_ids são inválidos")
            return [], "Nenhum ID válido fornecido."

        logger.info(f"Verificando status de {len(track_ids)} tracks")

        sp, error = FavoritesManager._validate_authentication()
        if error or sp is None:
            return [], error or "Erro na autenticação"

        try:
            results_all: List[bool] = []

            # Processar em chunks de 50
            for i in range(0, len(track_ids), FavoritesManager.MAX_IDS_CHECK):
                chunk = track_ids[i:i + FavoritesManager.MAX_IDS_CHECK]
                chunk_number = (i // FavoritesManager.MAX_IDS_CHECK) + 1
                logger.debug(
                    f"Verificando chunk {chunk_number}: {len(chunk)} IDs"
                )

                res = sp.current_user_saved_tracks_contains(chunk)

                if res is not None and isinstance(res, list):
                    results_all.extend(res)
                else:
                    logger.warning(
                        f"Resposta None ou inválida para chunk "
                        f"{chunk_number}"
                    )
                    # Adicionar False para cada ID do chunk
                    results_all.extend([False] * len(chunk))

            logger.info(
                f"Verificação concluída: {sum(results_all)} de "
                f"{len(results_all)} são favoritos"
            )
            return results_all, None

        except Exception as e:
            error_msg = f"Erro ao verificar favoritos: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return [], error_msg

    @staticmethod
    def get_total_saved_tracks() -> Tuple[int, Optional[str]]:
        """
        Obtém o número total de músicas favoritas (sem buscar todas).
        Método eficiente para obter apenas a contagem.

        Returns:
            tuple: (número total de músicas favoritas,
                    mensagem de erro ou None)
        """
        logger.debug("Obtendo total de músicas favoritas")

        sp, error = FavoritesManager._validate_authentication()
        if error or sp is None:
            logger.warning(f"Erro na autenticação ao obter total: {error}")
            return 0, error or "Erro na autenticação"

        try:
            results = sp.current_user_saved_tracks(limit=1)

            if (not results or not isinstance(results, dict)
                    or 'total' not in results):
                logger.warning("Resposta inválida ao obter total")
                return 0, "Resposta inválida da API"

            total = results.get('total', 0)

            logger.info(f"Total de músicas favoritas: {total}")
            return total, None

        except Exception as e:
            error_msg = f"Erro ao obter total de favoritos: {e}"
            logger.error(error_msg, exc_info=True)
            return 0, error_msg

    @staticmethod
    def is_track_saved(track_id: str) -> Tuple[bool, Optional[str]]:
        """
        Verifica se UMA música específica está nos favoritos.
        Método auxiliar conveniente para verificação única.

        Args:
            track_id: ID da música no Spotify

        Returns:
            tuple: (True se está nos favoritos, mensagem de erro ou None)
        """
        if not track_id or not track_id.strip():
            return False, "ID da música inválido"

        results, error = FavoritesManager.check_saved_tracks(
            [track_id.strip()]
        )

        if error:
            return False, error

        if not results:
            return False, "Nenhum resultado retornado"

        return results[0], None
