from fastapi import FastAPI

from api.cats_registry_router import router as cats_registry_router

app = FastAPI(title="RocketGPT Core API (Demo)", version="0.1.0")
app.include_router(cats_registry_router)

# Demo smoke (read-only endpoints):
# python -m py_compile main.py api/cats_registry_router.py
# curl http://localhost:8080/cats/registry
# curl http://localhost:8080/cats/police-register
# curl http://localhost:8080/cats/RGPT-CAT-01/definition
# curl http://localhost:8080/cats/RGPT-CAT-01/passport
# curl "http://localhost:8080/cats/resolve?canonical_name=protea/policy-validator"
