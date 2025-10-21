"""
Forms de validação usando Flask-WTF
"""
from flask_wtf import FlaskForm
from wtforms import StringField, IntegerField, SelectField
from wtforms.validators import (
    DataRequired, Length, Optional, NumberRange, Regexp, ValidationError
)


class PlaylistForm(FlaskForm):
    """Form para criar/editar playlist"""
    name = StringField(
        'Nome da Playlist',
        validators=[
            DataRequired(message='Nome é obrigatório'),
            Length(min=1, max=100, message='Nome deve ter entre 1 e 100 caracteres')
        ]
    )

    description = StringField(
        'Descrição',
        validators=[
            Optional(),
            Length(max=300, message='Descrição muito longa (máximo 300 caracteres)')
        ]
    )


class SearchForm(FlaskForm):
    """Form para busca de músicas/artistas"""
    q = StringField(
        'Buscar',
        validators=[
            DataRequired(message='Digite algo para buscar'),
            Length(min=1, max=200, message='Busca muito longa')
        ]
    )

    modo = SelectField(
        'Modo',
        choices=[('musica', 'Música'), ('artista', 'Artista')],
        default='musica',
        validators=[DataRequired()]
    )


class PaginationForm(FlaskForm):
    """Form para parâmetros de paginação"""
    page = IntegerField(
        'Página',
        validators=[
            Optional(),
            NumberRange(min=1, max=10000, message='Número de página inválido')
        ],
        default=1
    )

    limit = IntegerField(
        'Limite',
        validators=[
            Optional(),
            NumberRange(min=1, max=100,
                        message='Limite deve estar entre 1 e 100')
        ],
        default=20
    )

    sort = SelectField(
        'Ordenar',
        choices=[
            ('default', 'Padrão'),
            ('name-asc', 'Nome A-Z'),
            ('name-desc', 'Nome Z-A'),
            ('artist-asc', 'Artista A-Z'),
            ('artist-desc', 'Artista Z-A')
        ],
        default='default',
        validators=[Optional()]
    )


class TrackIdForm(FlaskForm):
    """Form para validar track ID"""
    track_id = StringField(
        'Track ID',
        validators=[
            DataRequired(message='Track ID é obrigatório'),
            Length(min=10, max=50, message='Track ID inválido'),
            Regexp(r'^[a-zA-Z0-9]+$',
                   message='Track ID contém caracteres inválidos')
        ]
    )


def validate_spotify_id(form, field):
    """Validador customizado para IDs do Spotify"""
    if not field.data:
        return

    # IDs do Spotify têm 22 caracteres alfanuméricos
    if len(field.data) != 22:
        raise ValidationError('ID do Spotify deve ter 22 caracteres')

    if not field.data.isalnum():
        raise ValidationError('ID do Spotify contém caracteres inválidos')


class PlaylistIdForm(FlaskForm):
    """Form para validar playlist ID"""
    playlist_id = StringField(
        'Playlist ID',
        validators=[
            DataRequired(message='Playlist ID é obrigatório'),
            validate_spotify_id
        ]
    )
