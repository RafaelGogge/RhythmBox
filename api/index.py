# Vercel Python serverless entrypoint wrapping Flask
# Uses vercel-wsgi to adapt Flask to AWS Lambda-style handler used by Vercel

from vercel_wsgi import handle
from app import app

# Vercel looks for a top-level 'handler' callable
handler = handle(app)
