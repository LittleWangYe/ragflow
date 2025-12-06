import { DocumentParserType } from '@/constants/knowledge';
import { useFetchKnowledgeList } from '@/hooks/knowledge-hooks';
import { UserOutlined } from '@ant-design/icons';
import { Avatar as AntAvatar, Select } from 'antd';
import React, { useMemo } from 'react';
import styles from './deepinsight-kb-selector.module.less';

interface DeepinsightKbSelectorProps {
  selectedKbs?: string[];
  onChange?: (kbIds: string[]) => void;
}

export function DeepinsightKbSelector({
  selectedKbs = [],
  onChange,
}: DeepinsightKbSelectorProps) {
  const { list: knowledgeList } = useFetchKnowledgeList(true);

  const filteredKnowledgeList = knowledgeList.filter(
    (x) => x.parser_id !== DocumentParserType.Tag,
  );

  const options = useMemo(
    () =>
      filteredKnowledgeList.map((x) => ({
        label: (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AntAvatar size={20} icon={<UserOutlined />} src={x.avatar} />
            <span style={{ flex: 1 }}>{x.name}</span>
          </div>
        ),
        value: x.id,
      })),
    [filteredKnowledgeList],
  );

  // Prepare a list of all ids for "全选"
  const allIds = options.map((o) => o.value as string);

  const popupRender = (menu: React.ReactNode) => {
    return (
      <div style={{ borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            padding: '2px 3px',
            borderBottom: '1px solid #f0f0f0',
            backgroundColor: '#fafafa',
          }}
        >
          <a
            style={{
              fontSize: 12,
              color: 'var(--primary-color, #1677ff)',
              cursor: 'pointer',
            }}
            onClick={() => {
              if (!onChange) return;
              // If all selected -> clear, otherwise select all
              const allSelected = allIds.every((id) =>
                selectedKbs.includes(id),
              );
              onChange(allSelected ? [] : allIds);
            }}
          >
            (全选)
          </a>
        </div>
        {menu}
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }} className={styles.kbSelector}>
      <Select
        mode="multiple"
        placeholder="请选择"
        value={selectedKbs}
        onChange={onChange}
        options={options}
        style={{ width: '100%' }}
        popupRender={popupRender}
        showSearch
        optionFilterProp="label"
        allowClear
        variant="filled"
      />
    </div>
  );
}
