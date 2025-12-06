import { IconFontFill } from '@/components/icon-font';
import { RAGFlowAvatar } from '@/components/ragflow-avatar';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Segmented, SegmentedValue } from '@/components/ui/segmented';
import { LanguageList, LanguageMap, ThemeEnum } from '@/constants/common';
import { useFetchChatAppList } from '@/hooks/chat-hooks';
import { useChangeLanguage } from '@/hooks/logic-hooks';
import { useNavigatePage } from '@/hooks/logic-hooks/navigate-hooks';
import { useNavigateWithFromState } from '@/hooks/route-hook';
import { useFetchUserInfo } from '@/hooks/user-setting-hooks';
import { Routes } from '@/routes';
import { generateChatMenuItems } from '@/utils/chat-menu';
import { camelCase } from 'lodash';
import {
  ChevronDown,
  CircleHelp,
  // Cpu,
  // File,
  // House,
  Library,
  MessageSquareText,
  Moon,
  // Search,
  Sun,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'umi';
import { BellButton } from './bell-button';

const handleDocHelpCLick = () => {
  window.open('https://ragflow.io/docs/dev/category/guides', 'target');
};

export function Header() {
  const { t } = useTranslation();
  const { pathname, search } = useLocation(); // 👈 关键：获取 search
  const navigate = useNavigateWithFromState();
  const { navigateToOldProfile } = useNavigatePage();

  const changeLanguage = useChangeLanguage();
  const { setTheme, theme } = useTheme();

  const {
    data: { language = 'English', avatar, nickname },
  } = useFetchUserInfo();

  // Get dialog list from local storage first, then from API
  const { data: apiDialogList = [] } = useFetchChatAppList();
  const [localDialogList, setLocalDialogList] = useState<any[]>([]);

  // Load from localStorage or fallback to API
  useEffect(() => {
    const storedDialogs = localStorage.getItem('defaultDialogs');
    if (storedDialogs) {
      try {
        setLocalDialogList(JSON.parse(storedDialogs));
      } catch (e) {
        console.error('Failed to parse stored dialogs:', e);
        setLocalDialogList(apiDialogList);
      }
    } else if (apiDialogList && apiDialogList.length > 0) {
      setLocalDialogList(apiDialogList);
    }
  }, [apiDialogList]);

  const dialogList = localDialogList;

  const handleItemClick = (key: string) => () => {
    changeLanguage(key);
  };

  const items = LanguageList.map((x) => ({
    key: x,
    label: <span>{LanguageMap[x as keyof typeof LanguageMap]}</span>,
  }));

  const onThemeClick = useCallback(() => {
    setTheme(theme === ThemeEnum.Dark ? ThemeEnum.Light : ThemeEnum.Dark);
  }, [setTheme, theme]);

  // Static menu items
  const staticTags = useMemo(
    () => [
      // { path: Routes.Root, name: t('header.Root'), icon: House },
      { path: Routes.Datasets, name: t('header.dataset'), icon: Library },
      // { path: Routes.Searches, name: t('header.search'), icon: Search },
      // { path: Routes.Agents, name: t('header.flow'), icon: Cpu },
      // { path: Routes.Files, name: t('header.fileManager'), icon: File },
      // { path: Routes.Chats, name: t('header.chat'), icon: File },
    ],
    [t],
  );

  // Generate dynamic chat menu items (with query params)
  const chatMenuItems = useMemo(
    () => generateChatMenuItems(dialogList, MessageSquareText),
    [dialogList],
  );

  const tagsData = useMemo(() => {
    return [...staticTags, ...chatMenuItems];
  }, [staticTags, chatMenuItems]);

  // 🔑 构造当前完整路径（含 query）
  const currentFullPath = useMemo(() => pathname + search, [pathname, search]);

  // 🔑 精准匹配当前激活路径（支持带 query 的路径）
  const currentPath = useMemo(() => {
    // 1. 优先完全匹配（path + query）
    const exactMatch = tagsData.find((tag) => tag.path === currentFullPath);
    if (exactMatch) return exactMatch.path;

    // 2. 如果没匹配上，尝试仅匹配 pathname（兜底：用户直接访问 /chat/id）
    const pathOnlyMatch = tagsData.find((tag) => {
      try {
        // 安全解析 tag.path（可能含 query）
        const url = new URL(tag.path, 'https://dummy.base');
        return url.pathname === pathname;
      } catch {
        // 如果不是合法 URL（如 '/'），直接字符串比较
        return tag.path === pathname;
      }
    });
    if (pathOnlyMatch) return pathOnlyMatch.path;

    // 3. 默认 fallback 到第一个菜单项
    return tagsData.length > 0 ? tagsData[0].path : Routes.Root;
  }, [currentFullPath, pathname, tagsData]);

  // 构建 Segmented options
  const options = useMemo(() => {
    return tagsData.map((tag) => {
      const HeaderIcon = tag.icon as
        | React.ComponentType<{ className?: string }>
        | undefined;

      return {
        label:
          tag.path === Routes.Root && HeaderIcon ? (
            <HeaderIcon className="size-6" />
          ) : (
            <span>{tag.name}</span>
          ),
        value: tag.path, // ✅ 完整路径（含 query）
      };
    });
  }, [tagsData, t]);

  const handleChange = (path: SegmentedValue) => {
    navigate(path as string); // umi 支持带 query 的路径字符串
  };

  const handleLogoClick = useCallback(() => {
    navigate(Routes.Root);
  }, [navigate]);

  return (
    <section className="py-5 px-10 flex justify-between items-center ">
      <div className="flex items-center gap-4">
        <img
          src={'/logo.svg'}
          alt="logo"
          className="size-10 mr-[12] cursor-pointer"
          onClick={handleLogoClick}
        />
      </div>

      {/* 🔑 关键：加 key 强制刷新 Segmented */}
      <Segmented
        key={`segmented-menu-${tagsData.length}-${currentPath}`}
        rounded="xxxl"
        sizeType="xl"
        buttonSize="xl"
        options={options}
        value={currentPath}
        onChange={handleChange}
        activeClassName="text-bg-base bg-metallic-gradient border-b-[#00BEB4] border-b-2"
      />

      <div className="flex items-center gap-5 text-text-badge">
        <a
          target="_blank"
          href="https://discord.com/invite/NjYzJD3GM3"
          rel="noreferrer"
        >
          <IconFontFill name="a-DiscordIconSVGVectorIcon"></IconFontFill>
        </a>
        <a
          target="_blank"
          href="https://github.com/infiniflow/ragflow"
          rel="noreferrer"
        >
          <IconFontFill name="GitHub"></IconFontFill>
        </a>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="flex items-center gap-1">
              {t(`common.${camelCase(language)}`)}
              <ChevronDown className="size-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {items.map((x) => (
              <DropdownMenuItem key={x.key} onClick={handleItemClick(x.key)}>
                {x.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant={'ghost'} onClick={handleDocHelpCLick}>
          <CircleHelp />
        </Button>
        <Button variant={'ghost'} onClick={onThemeClick}>
          {theme === 'light' ? <Sun /> : <Moon />}
        </Button>
        <BellButton></BellButton>
        <div className="relative">
          <RAGFlowAvatar
            name={nickname}
            avatar={avatar}
            isPerson
            className="size-8 cursor-pointer"
            onClick={navigateToOldProfile}
          ></RAGFlowAvatar>
        </div>
      </div>
    </section>
  );
}
