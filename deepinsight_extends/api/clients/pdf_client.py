import logging
import os
import re
import requests
from io import BytesIO
from urllib.parse import unquote

from deepinsight_extends.api.schemas.deepresearch import PdfGenerateRequest

DEEPINSIGHT_API_URL = "DEEPINSIGHT_API_URL"
BASE_URL = os.getenv(DEEPINSIGHT_API_URL, "http://localhost:8888/api/v1").rstrip("/")
API_URL = f"{BASE_URL}/deepinsight/pdf/generate"

def extract_filename(content_disposition: str)->str:
    if not content_disposition:
        return "default.pdf"
    quoted = re.findall('filename="(.+?)"', content_disposition)
    if quoted:
        return unquote(quoted[0])
    unquoted = re.findall('filename=([^;]+)', content_disposition)
    if unquoted:
        return unquote(unquoted[0])
    
    encoded = re.findall("filename\*=UTF-8''(.+)", content_disposition)
    if encoded:
        return unquote(encoded[0])
    
    return "report.pdf"


def get_pdf_from_deepinsight(request: PdfGenerateRequest):
    try:
        response = requests.post(API_URL, stream=True, json=request.model_dump())
        response.raise_for_status()
        content_disposition = response.headers.get('Content-Disposition', '')
        filename = extract_filename(content_disposition)
        pdf_bytesio = BytesIO(response.content)

        return pdf_bytesio, filename
    except requests.exceptions.RequestException as e:
        logging.info(f"Request deepinsight pdf generating api failed {e}")
