import os
import requests
import logging
from typing import TypedDict
from pydantic import RootModel
from deepinsight_extends.api.utils import get_model_config
from api.db.services.knowledgebase_service import KnowledgebaseService

DEEPINSIGHT_API_URL = "DEEPINSIGHT_API_URL"
BASE_URL = os.getenv(DEEPINSIGHT_API_URL, "http://localhost:8888/api/v1").rstrip("/")
API_URL = f"{BASE_URL}/deepinsight/parse"
class _PaperMeta(TypedDict):
    paper_title: str
    author_info: dict
    abstract: str
    keywords: list

def parse_paper_meta(kb_id: str, filename: str, paper: str, tenant_id: str) -> tuple[_PaperMeta, list[tuple[str, str]]]:

    
    llm = get_model_config(tenant_id)
    ok, kb = KnowledgebaseService.get_by_id(kb_id)
    if not ok:
        raise RuntimeError(f"Unkown knowledge base {kb_id}")
    request = dict(filename=filename, paper=paper, llm=llm, kb_id=kb_id, kb_name = kb.name)
    logging.info("Begin reqesting DeepInsight to parse metadata of paper")
    response = requests.post(API_URL, json=RootModel(request).model_dump())
    logging.info(f"Deepinsight parsed and returns {response.status_code}")
    response.raise_for_status()
    body = response.json()
    if "error" in body:
        raise RuntimeError(body["error"])
    return body["meta"], body["sections"]
