import base64
import html
import json
import logging
import os
from io import BytesIO
from typing import TypedDict, Callable

import requests

from api.db.services.knowledgebase_service import KnowledgebaseService


class MockParser:
    """Only to prevent attribute error from calling `pdf_parser.remove_tag`."""
    def remove_tag(self, *_args, **_kwargs) -> None:
        """No Any action"""


DEEPINSIGHT_API_URL = "DEEPINSIGHT_API_URL"
BASE_URL = os.getenv(DEEPINSIGHT_API_URL, "http://localhost:8888/api/v1").rstrip("/")
PARSE_URL = f"{BASE_URL}/deepinsight/paper/parse/binary"
GET_CONF_URL = f"{BASE_URL}/deepinsight/paper/conference_meta"
BUCKET_NAME = "parsed-paper-images"


class _PaperMeta(TypedDict):
    """See `deepinsight.service.schemas.paper_extract.ExtractPaperMetaResponse` for details."""
    title: str
    author_info: dict
    abstract: str
    keywords: list
    topic: str | None


class _PaperParseResult(_PaperMeta):
    sections: list[list[str]]
    """Actually is list[tuple[content, title]]."""
    error: str | None


class _PaperDetail(TypedDict):
    title: str
    authors: str
    abstract: str
    sections: list[tuple[str, str]]
    tables: list  # always empty


class _ConferenceMetaResult(TypedDict):
    error: str | None
    id: int | None
    fullname: str | None


def parse_paper_deepinsight(kb_id: str,
                            filename: str, binary: bytes | BytesIO | None,
                            from_page: int, to_page: int,
                            callback: Callable[[float, str], None] | None) -> _PaperDetail:
    if not callback:
        callback = _mute_callback
    if binary is None:
        with open(filename, mode="rb") as f:
            binary = f.read()
    if not isinstance(binary, bytes):
        binary = binary.read()
    binary: bytes

    ok, kb = KnowledgebaseService.get_by_id(kb_id)
    if not ok:
        raise RuntimeError(f"Unknown knowledge base of id {kb_id!r}")

    callback(0.1, "Begin parsing this paper with DeepInsight paper parse service.")
    conference_id = _get_or_create_conference_id(kb_id, kb.name, callback)

    parse_args = dict(
        filename=filename,
        binary=base64.b64encode(binary).decode("utf8"),
        conference_id=conference_id,
        external_kb_id=kb_id,
        from_page=from_page,
        to_page=to_page,
    )
    response = requests.post(PARSE_URL, json=parse_args)
    if response.status_code != 200:
        logging.error(f"DeepInsight failed to parse paper with status={response.status_code}: "
                      f"{response.content.decode('utf8')}")
        raise RuntimeError("DeepInsight failed to parse paper with an Exception. Paper parse failed.")
    body: _PaperParseResult = response.json()

    if "error" in body:
        raise RuntimeError(body["error"])
    sections: list[tuple[str, str]] = [tuple(line) for line in body.pop("sections")]  # type: ignore
    body: _PaperMeta
    _log_parse_result(body, callback)
    return _PaperDetail(
        title=body["title"],
        authors=json.dumps(body["author_info"], ensure_ascii=False, indent=2),
        abstract=body["abstract"],
        sections=sections,
        tables=[],
    )

def _get_or_create_conference_id(kb_id: str, kb_name: str, callback: Callable[[float, str], None]) -> int:
    response = requests.post(GET_CONF_URL, json=dict(kb_id=kb_id, kb_name=kb_name))
    if response.status_code != 200:
        logging.error(f"DeepInsight failed to find a conference with status={response.status_code}: "
                      f"{response.content.decode('utf8')}")
        raise RuntimeError("DeepInsight failed to find a conference with an Exception. Paper parse failed.")
    body: _ConferenceMetaResult = response.json()
    if "error" in body:
        raise RuntimeError(body["error"])
    conf_id = body["id"]
    conf_name = body.get("fullname")
    callback(0.2, f"This knowledge base belongs to conference {conf_name}. Starts to parse this paper.")
    return conf_id


def _mute_callback(*args):
    pass


def _log_parse_result(body: _PaperMeta, callback: Callable[[float, str], None]) -> None:
    if callback is not _mute_callback:
        msgs = [" Paper information:",
                f"Title: {html.escape(body['title'])}",
                f"Abstract: {html.escape(body['abstract'])}"]
        authors = body["author_info"]
        first_author = [authors["first_author"]] if authors.get("first_author") else []
        all_authors = (first_author + authors.get("co_first_authors", []) + authors.get("middle_authors", []) +
                       authors.get("last_authors", []))
        corresponding = authors.get("corresponding_authors") or []
        if not (all_authors or corresponding):
            msgs.append("Authors: no info.")
        else:
            msgs.append("Authors:")
            for author in all_authors:
                msgs.append(_author_html(author, False))
            for author in corresponding:
                msgs.append(_author_html(author, True))
        extra_msg = "\n".join(msgs)
    else:
        extra_msg = ""
    callback(0.8, "End to parse this paper with DeepInsight paper parse service." + extra_msg)


def _author_html(author: dict, corresponding_flag: bool) -> str:
    name = author.get("name") or "[anonymous]"
    extra = [author.get(k) for k in ("email", "affiliation") if author.get(k)]
    if corresponding_flag:
        extra.append("Corresponding")
    if extra:
        return f"- {name} ({', '.join(extra)})"
    return f"- {name}"
