import api from '@/utils/api';
import { downloadFileFromBlob } from '@/utils/file-util';
import { Button, Spin } from 'antd';
import { Download, FileDown, FileText } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DeepinsightGenerationButtonsProps {
  conversationId: string;
  messageId: string;
  messageContent: string;
  onPdfGenerating?: (loading: boolean) => void;
  onPptGenerating?: (loading: boolean) => void;
}

interface PptFile {
  id: string;
  name: string;
  location: string;
  [key: string]: any;
}

export function DeepinsightGenerationButtons({
  conversationId,
  messageId,
  messageContent,
  onPdfGenerating,
  onPptGenerating,
}: DeepinsightGenerationButtonsProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pptLoading, setPptLoading] = useState(false);
  const [pptFile, setPptFile] = useState<PptFile | null>(null);
  const [pptDownloading, setPptDownloading] = useState(false);

  const handleGeneratePdf = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    onPdfGenerating?.(true);

    try {
      const response = await fetch(api.generatePdf, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = '会议洞察报告.pdf';
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="?([^"]+)"?/);
        if (matches) {
          filename = matches[1];
        }
      }

      const blob = await response.blob();
      downloadFileFromBlob(blob, filename);
      toast.success('PDF 下载成功');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('PDF 生成失败，请重试');
    } finally {
      setPdfLoading(false);
      onPdfGenerating?.(false);
    }
  };

  const handleGeneratePpt = async () => {
    if (pptLoading) return;
    setPptLoading(true);
    onPptGenerating?.(true);

    try {
      const response = await fetch(api.generatePpt, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          conversation_id: conversationId,
          message: {
            id: messageId,
            content: messageContent,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.code !== 0) {
        throw new Error(data.message || 'PPT 生成失败');
      }

      setPptFile(data.data);
      toast.success('PPT 已生成');
    } catch (error) {
      console.error('PPT generation failed:', error);
      toast.error('PPT 生成失败，请重试');
    } finally {
      setPptLoading(false);
      onPptGenerating?.(false);
    }
  };

  const handleDownloadPpt = async () => {
    if (!pptFile || pptDownloading) return;
    setPptDownloading(true);

    try {
      // 调用文件下载接口
      const response = await fetch(`${api.getFile}/${pptFile.id}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      downloadFileFromBlob(blob, pptFile.name);
      toast.success('PPT 下载成功');
    } catch (error) {
      console.error('PPT download failed:', error);
      toast.error('PPT 下载失败，请重试');
    } finally {
      setPptDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 mt-3">
      {pptFile && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
          <Spin spinning={pptDownloading} size="small" />
          <span className="flex-1 text-sm text-gray-700 truncate">
            {pptFile.name}
          </span>
          <Button
            type="text"
            size="small"
            icon={<Download size={16} />}
            onClick={handleDownloadPpt}
            disabled={pptDownloading}
            className="flex-shrink-0"
          />
        </div>
      )}
      <div className="flex gap-2">
        <Button
          loading={pdfLoading}
          onClick={handleGeneratePdf}
          icon={<FileDown size={16} />}
          type="primary"
        >
          下载 PDF
        </Button>
        <Button
          loading={pptLoading}
          onClick={handleGeneratePpt}
          icon={<FileText size={16} />}
        >
          生成 PPT
        </Button>
      </div>
    </div>
  );
}
