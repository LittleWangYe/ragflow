# 导航栏快速切换优化方案

## 问题分析
当用户在登录后的导航栏快速点击菜单按钮切换页面时，会出现以下问题：
- 菜单按钮的选中状态立即更新
- 但目标路由页面因为有API请求而加载较慢
- 导致菜单显示的页面和实际加载的页面内容不同步

## 优化方案

### 1. **Segmented 组件增强** (`src/components/ui/segmented.tsx`)
   - 添加 `isLoading` 属性：在导航进行中禁用菜单按钮
   - 添加 `disabled` 属性：支持禁用状态
   - 视觉反馈：加载中时显示透明度降低的效果（opacity-50）
   - 点击防护：在加载或禁用状态下忽略点击事件

### 2. **导航锁定 Hook** (`src/hooks/use-navigation-lock.ts`)
   创建 `useNavigationLock` hook 用于：
   - 追踪导航过程中的状态（isNavigating）
   - 自动检测路由变化完成
   - 延迟解锁（150ms）以确保页面组件已挂载
   - 超时保护（3秒）防止永久锁定

   关键功能：
   - `startNavigation(path)` - 启动导航锁定
   - `isNavigating` - 当前导航状态
   - 自动监听路由变化，路由匹配时自动解锁

### 3. **导航栏集成** (`src/layouts/next-header.tsx`)
   - 导入使用 `useNavigationLock` hook
   - 在菜单项点击时调用 `startNavigation()`
   - 将 `isNavigating` 状态传递给 Segmented 的 `isLoading` 属性
   - 防止重复导航到同一路径

## 交互流程

```
用户点击菜单按钮
  ↓
触发 handleChange 事件
  ↓
检查是否已在目标路径（若是则返回）
  ↓
调用 startNavigation(path) 启动锁定
  ↓
Segmented 进入加载状态（菜单禁用）
  ↓
执行导航 navigate(path)
  ↓
路由变化，页面开始加载
  ↓
路由完全变化（pathname + search 匹配目标路径）
  ↓
延迟 150ms 确保页面组件挂载
  ↓
自动解除菜单锁定
  ↓
菜单恢复可点击状态
```

## 用户体验改进

✅ **防止快速切换导致的混乱**
- 在页面加载完成前禁用菜单点击
- 避免多个API请求同时发起导致冲突

✅ **视觉反馈**
- 菜单在加载中显示半透明状态
- 用户能明确感知系统正在加载

✅ **自动解锁**
- 无需手动干预
- 页面加载完成后自动恢复菜单可用性

✅ **容错机制**
- 超时保护：3秒后强制解锁防止永久卡死
- 路由检测：精准检测路由变化完成

## 核心代码变更

### Segmented 组件新增属性
```tsx
interface SegmentedProps {
  // ... 其他属性
  isLoading?: boolean;  // 新增：加载状态
}

// 使用示例
<Segmented
  isLoading={isNavigating}  // 传入导航状态
  {...otherProps}
/>
```

### useNavigationLock Hook 使用
```tsx
const { isNavigating, startNavigation } = useNavigationLock();

const handleChange = (path: SegmentedValue) => {
  if (currentFullPath === path) return;  // 防止重复导航
  
  startNavigation(path);  // 启动导航锁定
  navigate(path);         // 执行导航
};
```

## 文件修改清单

1. ✅ `/src/components/ui/segmented.tsx` - 增强组件功能
2. ✅ `/src/hooks/use-navigation-lock.ts` - 新增导航锁定 hook
3. ✅ `/src/layouts/next-header.tsx` - 集成导航锁定逻辑
