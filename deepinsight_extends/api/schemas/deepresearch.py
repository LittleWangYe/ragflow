from enum import Enum
from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field
from pydantic.generics import GenericModel

# 泛型类型变量
T = TypeVar("T")


class ArgOptionsGeneric(GenericModel, Generic[T]):
    """
    通用参数项容器：type 标识参数类型，params 存放具体参数（泛型）
    """
    type: str = Field(..., description="参数项的类型")
    params: T = Field(..., description="具体参数（泛型）")


class EventType(str, Enum):
    error = "error"
    message_chunk = "message_chunk"
    interrupt = "interrupt"
    interrupt_clarification = "interrupt_clarification"
    interrupt_execute_plan_edit = "interrupt_execute_plan_edit"
    interrupt_report_outline_edit = "interrupt_report_outline_edit"
    report_chunk = "report_chunk"
    final_report = "final_report"
    thinking_tool_calls = "thinking_tool_calls"
    thinking_tool_calls_result = "thinking_tool_calls_result"
    thinking_message_chunk = "thinking_message_chunk"
    thinking_report_outline_generating = "thinking_report_outline_generating"
    thinking_step_outline = "thinking_step_outline"
    thinking_step_topic = "thinking_step_topic"
    thinking_step_report_generating = "thinking_step_report_generating"
    expert_review_step_generating = "expert_review_step_generating"
    expert_review_chunk = "expert_review_chunk"
    progress = "progress"


class MessageContentType(str, Enum):
    plain_text = "plain_text"
    tool_call = "tool_call"


class MessageToolCallContent(BaseModel):
    """
    工具调用内容
    """
    index: Optional[int] = Field(None, description="工具调用的索引")
    id: Optional[str] = Field(None, description="工具调用的唯一标识符")
    name: Optional[str] = Field(None, description="工具调用的名称")
    args: Optional[Any] = Field(None, description="工具调用参数")
    result: Optional[Any] = Field(None, description="工具调用结果")


class MessageContent(BaseModel):
    """
    消息内容，包含文本与工具调用列表
    """
    text: Optional[str] = Field(None, description="文本内容")
    tool_calls: Optional[List[MessageToolCallContent]] = Field(
        None, description="工具调用内容列表"
    )


class Message(BaseModel):
    """
    单条消息
    """
    id: Optional[str] = Field(None, description="消息唯一标识符")
    parent_message_id: Optional[str] = Field(None, description="父消息的唯一标识符")
    content: MessageContent = Field(..., description="消息内容")
    content_type: MessageContentType = Field(..., description="消息内容类型")


class LLMSetting(BaseModel):
    temperature: float = Field(0.7, description="采样温度")
    top_p: float = Field(1.0, description="Top-p 采样值")
    frequency_penalty: float = Field(0.0, description="频率惩罚")
    presence_penalty: float = Field(0.0, description="存在惩罚")
    max_tokens: int = Field(65536, description="生成的最大令牌数")


class Metadata(BaseModel):
    """
    元数据：必须字段
    """
    input_tokens: int = Field(..., description="输入令牌数")
    output_tokens: int = Field(..., description="输出令牌数")
    time: float = Field(..., description="处理时间（秒）")


class LLMConfig(BaseModel):
    model: str = Field(..., description='模型名称，例如 "gpt-4"')
    version: Optional[str] = Field(None, description="模型版本")
    base_url: Optional[str] = Field(None, description="模型 API 基础 URL")
    api_key: Optional[str] = Field(None, description="模型 API 密钥")
    setting: Optional[LLMSetting] = Field(None, description="模型生成参数配置")


class RetrievalArgs(BaseModel):
    dialog_id: Optional[str] = Field(None, description="对话 ID")
    dataset_ids: List[str] = Field(default_factory=list, description="数据集 ID 列表")
    document_ids: List[str] = Field(default_factory=list, description="文档 ID 列表")
    page: Optional[int] = Field(1, description="分页页码")
    page_size: Optional[int] = Field(20, description="每页项数")
    similarity_threshold: Optional[float] = Field(0.3, description="相似度阈值")
    vector_similarity_weight: Optional[float] = Field(0.4, description="向量相似度权重")
    top_k: Optional[int] = Field(100, description="检索结果 Top-K")
    top_n: Optional[int] = Field(3, description="检索结果 Top-N")
    rerank_id: Optional[str] = Field(None, description="重排序模型 ID")
    keyword: Optional[bool] = Field(False, description="是否启用关键词匹配")
    highlight: Optional[bool] = Field(False, description="是否启用文本高亮")


class ChatArgs(BaseModel):
    retrieval_options: Optional[List[ArgOptionsGeneric[RetrievalArgs]]] = Field(
        None, description="检索参数选项列表"
    )
    llm_options: Optional[List[ArgOptionsGeneric[LLMConfig]]] = Field(
        None, description="LLM 参数选项列表"
    )


class ConferencePPTGenRequest(BaseModel):
    conversation_id: str = Field(..., description="对话的唯一标识符")
    args: Optional[ChatArgs] = Field(None, description="对话的附加参数")


class PdfGenerateRequest(BaseModel):
    conversation_id: str = Field(..., description="对话的唯一标识符")
    args: Optional[ChatArgs] = Field(None, description="对话的附加参数")


class ChatRequest(BaseModel):
    conversation_id: str = Field(..., description="对话的唯一标识符")
    messages: List[Message] = Field(..., description="对话中的消息列表")
    scene_type: str = Field(..., description='对话场景类型，例如 "deep_research"、"conference_qa"')
    search_type: Optional[List[str]] = Field(None, description='搜索工具类型，例如 "rag_retrival"、"web_search"、"w3_search"')
    write_experts: List[str] = Field(default_factory=list, description="用于编写报告的专家键列表")
    review_experts: List[str] = Field(default_factory=list, description="用于审阅报告的专家键列表")
    args: Optional[ChatArgs] = Field(None, description="对话的附加参数")
    parallel_expert_review_enable: Optional[bool] = Field(False, description="是否启用并行专家审阅")
    expert_review_enable: Optional[bool] = Field(False, description="是否启用专家审阅")
    expert_name: Optional[str] = Field(None, description="单个专家的名称")
    allow_user_clarification: Optional[bool] = Field(None, description="是否允许用户澄清")
    allow_edit_research_brief: Optional[bool] = Field(None, description="是否允许编辑研究简报")
    allow_edit_report_outline: Optional[bool] = Field(None, description="是否允许编辑报告大纲")


class StreamEvent(BaseModel):
    event: EventType = Field(..., description="事件类型")
    run_id: str = Field(..., description="运行的唯一标识符")
    conversation_id: str = Field(..., description="对话的唯一标识符")
    error_code: int = Field(0, description="错误代码")
    error_msg: str = Field("", description="错误消息")
    messages: List[Message] = Field(..., description="事件的消息列表")
    metadata: Optional[Metadata] = Field(None, description="元数据，包括令牌数和处理时间")
