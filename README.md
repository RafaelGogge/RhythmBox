# 🎵 RhythmBox - Gerenciador de Playlists Spotify

## 📋 Visão Geral

RhythmBox é uma aplicação web completa que permite gerenciar suas playlists do Spotify de forma intuitiva e elegante. Com integração direta à API oficial do Spotify, você pode buscar músicas, criar playlists, adicionar faixas e gerenciar sua biblioteca musical através de uma interface moderna e responsiva.

## ✨ Funcionalidades

- 🔍 **Busca Avançada**: Pesquise músicas e artistas com resultados detalhados
- 🎵 **Reprodução de Prévia**: Ouça trechos das músicas diretamente na aplicação
- 📁 **Gerenciamento de Playlists**: Criar, editar, visualizar e excluir playlists
- ➕ **Adicionar Músicas**: Adicione faixas às suas playlists com facilidade
- 🗑️ **Remover Faixas**: Remova músicas específicas das playlists
- 🔐 **Autenticação Spotify**: Login seguro com OAuth2
- 📱 **Interface Responsiva**: Design adaptado para desktop e mobile

## 🛠️ Tecnologias Utilizadas

### Backend

- **Python 3.11+** (Vercel runtime) / 3.13 local
- **Flask 3.0.3** - Framework web para rotas e API
- **Spotipy 2.24.0** - Integração com API do Spotify
- **python-dotenv 1.0.1** - Variáveis de ambiente (uso local)
- **requests 2.32.3** - Requisições HTTP

### Frontend

- **TailwindCSS** - Framework CSS utilitário para estilização
- **JavaScript Vanilla** - Interatividade e manipulação do DOM
- **CSS Custom** - Estilos personalizados e temas

### Estrutura do Projeto

```
website-backend/
├── app.py                 # Aplicação principal Flask
├── requirements.txt       # Dependências Python
├── requirements-dev.txt   # Dependências de desenvolvimento/testes
├── .env.example          # Exemplo de variáveis de ambiente
├── vercel.json            # Configuração de funções/rotas Vercel
├── api/
│   └── index.py           # Entrypoint serverless (Wsgi handler)
├── src/                  # Código fonte modular
│   ├── models.py         # Modelos de dados (Track, Playlist, Artist, Album)
│   ├── music_crud.py     # Operações CRUD de música
│   ├── playlist_manager.py # Gerenciamento de playlists
│   ├── spotify_auth.py   # Autenticação OAuth2
│   └── spotify_client.py # Cliente Spotify
├── templates/            # Templates HTML
│   ├── base.html
│   ├── index.html        # Página inicial
│   ├── buscar.html       # Busca de músicas
│   ├── playlists.html    # Lista de playlists
│   └── playlist/         # Templates específicos de playlist
│       ├── create.html   # Criar playlist
│       ├── edit.html     # Editar playlist
│       ├── view.html     # Visualizar playlist
│       └── add_tracks.html # Adicionar músicas
└── static/              # Arquivos estáticos
    ├── css/             # Estilos CSS
    ├── js/              # Scripts JavaScript
    └── img/             # Imagens e logos
```

## 🚀 Como Utilizar

### 📋 Pré-requisitos

- Python 3.13 ou superior
- Conta no Spotify (gratuita ou premium)
- Credenciais da API do Spotify

### 🔧 Configuração

1. **Clone o repositório**

   ```bash
   git clone <url-do-repositorio>
   cd website-backend
   ```

2. **(Local) Crie e ative um ambiente virtual**

   ```powershell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   ```

3. **Instale as dependências**

   ```powershell
   pip install -r requirements.txt
   ```

4. **Configure as credenciais do Spotify**

   - Acesse o [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Crie uma nova aplicação
   - Configure o redirect URI: `http://127.0.0.1:3000/callback`
   - Copie o `.env.example` para `.env` e preencha:

   ```powershell
   cp .env.example .env
   ```

   ```env
   SPOTIFY_CLIENT_ID=seu_client_id_aqui
   SPOTIFY_CLIENT_SECRET=seu_client_secret_aqui
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
   FLASK_HOST=127.0.0.1
   FLASK_PORT=3000
   FLASK_DEBUG=True
   ```

5. **Execute a aplicação (local)**
   ```powershell
   python app.py
   ```

### 🚀 Deploy na Vercel

1. Instale a Vercel CLI e faça login
   ```powershell
   npm i -g vercel
   vercel login
   ```
2. Crie as variáveis de ambiente no projeto Vercel (Dashboard ou CLI). Nunca suba o arquivo `.env`.
   - SPOTIFY_CLIENT_ID
   - SPOTIFY_CLIENT_SECRET
   - SPOTIFY_REDIRECT_URI → ex.: `https://SEU-PROJETO.vercel.app/callback`
   - FLASK_SECRET_KEY → gere com `python -c "import secrets; print(secrets.token_hex(32))"`
   - FLASK_ENV=production
   - SESSION_COOKIE_SECURE=True
   - (opcional) CORS_ORIGINS
3. Faça o deploy

   ```powershell
   vercel
   vercel deploy --prod
   ```

   Estrutura adicionada para Vercel:

   - `api/index.py` (entrypoint serverless)
   - `vercel.json` (roteamento + runtime python3.11)

   Observação: a Vercel importa o app do Flask (não chama `app.run`). O servidor local é apenas para desenvolvimento.

4. **Acesse no navegador**
   ```
   http://127.0.0.1:3000
   ```

### 📖 Como Usar

1. **Página Inicial**: Clique em "Entrar no Sistema" para começar
2. **Buscar Músicas**: Use a página de busca para encontrar músicas e artistas
3. **Login Spotify**: Faça login com sua conta Spotify quando solicitado
4. **Gerenciar Playlists**:
   - Visualize suas playlists existentes
   - Crie novas playlists
   - Adicione músicas às playlists
   - Edite nomes das playlists
   - Remova músicas específicas
   - Exclua playlists

## 🎯 Rotas Principais

| Rota                     | Método   | Descrição                      |
| ------------------------ | -------- | ------------------------------ |
| `/`                      | GET      | Página inicial                 |
| `/buscar`                | GET      | Busca de músicas e artistas    |
| `/login_spotify`         | GET      | Iniciar autenticação Spotify   |
| `/callback`              | GET      | Callback OAuth2 do Spotify     |
| `/playlists`             | GET      | Listar playlists do usuário    |
| `/playlists/create`      | GET/POST | Criar nova playlist            |
| `/playlists/<id>/view`   | GET      | Visualizar playlist específica |
| `/playlists/edit/<id>`   | GET/POST | Editar playlist                |
| `/playlists/<id>/add`    | GET/POST | Adicionar músicas à playlist   |
| `/playlists/delete/<id>` | POST     | Excluir playlist               |

## 🔐 Segurança e Privacidade

- Autenticação segura via OAuth2 do Spotify
- Tokens de acesso com renovação automática
- Não armazenamos credenciais do usuário
- Variáveis sensíveis em arquivo `.env`
- Escopo limitado às permissões necessárias

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para:

- Reportar bugs
- Sugerir melhorias
- Enviar pull requests
- Melhorar a documentação

## 📞 Suporte

Para dúvidas, sugestões ou problemas:

- Abra uma issue no GitHub
- Entre em contato através do projeto

---

**Desenvolvido por Rafael V. GOgge para amantes da música 🎶**
**Futuras atualizações em breve!**
