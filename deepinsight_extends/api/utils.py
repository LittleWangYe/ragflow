from common.constants import LLMType
from api.db.services.llm_service import TenantLLMService
from deepinsight_extends.api.schemas.deepresearch import ArgOptionsGeneric, LLMConfig, LLMSetting

def get_model_config(
        tenant_id:str, llm_type: LLMType=LLMType.CHAT, llm_id: str=None,
        extra_settings: LLMSetting = None
):
    model_config = TenantLLMService.get_model_config(tenant_id, llm_type, llm_id)
    llm_config = LLMConfig(
        model=model_config["llm_name"],
        base_url=model_config.get("api_base") or None,
        api_key=model_config.get("api_key") or None,
        setting=extra_settings
    )
    llm_factory = model_config.get("llm_factory") or None
    return ArgOptionsGeneric[LLMConfig](type=llm_factory, params=llm_config)
    