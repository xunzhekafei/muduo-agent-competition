# 速记模式 — 时间流速记 & 时间树速记 开发文档

> 关联文档：`docs/RECENT.md`（阶段 1 第 1-2 周）
> 语音引擎：FunASR（阿里达摩院开源）
> 目标：形成用户业务逻辑闭环，操作简单直观

---

## 〇、两种速记的定位

```
时间流速记（Timeline）              时间树速记（TimeTree）
─────────────────────              ─────────────────────
适合：课堂实时记录                   适合：复习梳理、知识拆解
输入：录音 + 打字补充                输入：录音 / 上传视频 / 手动添加
输出：时间线 → AI → 结构化笔记       输出：树节点 → AI → 知识树 → 结构化笔记
形态：垂直时间流 + 右侧笔记面板       形态：节点树形图 + 详情面板
```

两种速记共用同一套 FunASR 语音引擎，但前端交互和数据流完全不同。

---

## 一、FunASR 语音引擎集成

### 1.1 为什么换 FunASR

| 对比项 | 浏览器 SpeechRecognition（当前） | FunASR（目标） |
|--------|------------------------------|---------------|
| 中文准确率 | ~80%（依赖浏览器实现） | ~95%（CER 5.2%） |
| 热词支持 | 不支持 | 支持（可配置学科术语） |
| 实时流式 | 受浏览器限制 | WebSocket 原生流式 |
| 跨浏览器 | 仅 Chrome/Edge | 全部浏览器 |
| 离线可用 | 否 | 可本地部署 |

### 1.2 部署方案

在项目后端同机部署 FunASR WebSocket 服务：

```
浏览器 ──WebSocket──→ FunASR Server (:10095) ──→ 返回识别文本
                         │
                    模型: Fun-ASR-Nano-2512
                    显存: ~3GB（GPU）/ CPU 可用
```

**部署命令**（在 backend 同级目录）：
```bash
# 克隆 FunASR 简化部署方案
git clone https://github.com/fengin/Fun-ASR-Nano-2512-Deploy.git funasr-server
cd funasr-server
bash install.sh
python download_model.py
python funasr_wss_server.py --port 10095
```

**项目环境变量**（`.env` 新增）：
```env
FUNASR_WS_URL=ws://localhost:10095
```

### 1.3 前端 WebSocket 语音识别 Hook

新建 `frontend/src/features/quick-notes/hooks/useFunASR.js`，供两种速记共用：

```js
// useFunASR hook — FunASR WebSocket 语音识别
// 用法：
//   const { start, stop, transcript, isListening, error } = useFunASR({ hotwords: ['进程', '线程'] });
//   start() → 开始录音并实时识别
//   stop()  → 停止，返回完整文本

import { useState, useRef, useCallback } from 'react';

const FUNASR_WS_URL = import.meta.env.VITE_FUNASR_WS_URL || 'ws://localhost:10095';

export function useFunASR({ hotwords = [], onSegment } = {}) {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const start = useCallback(async () => {
    setError(null);
    setTranscript('');
    try {
      // 1. 获取麦克风
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. 创建 WebSocket 连接 FunASR
      const ws = new WebSocket(FUNASR_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        // 发送握手配置
        ws.send(JSON.stringify({
          mode: '2pass',
          chunk_size: [5, 10, 5],
          audio_fs: 16000,
          wav_name: 'quicknotes',
          is_speaking: true,
          hotwords: JSON.stringify(
            Object.fromEntries(hotwords.map(w => [w, 30]))
          ),
          itn: true,
        }));
        setIsListening(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.text) {
          setTranscript(prev => prev + data.text);
          onSegment?.({ text: data.text, isFinal: data.is_final });
        }
      };

      ws.onerror = () => setError('语音识别连接失败');
      ws.onclose = () => setIsListening(false);

      // 3. 等待 WebSocket 就绪后开始发送音频
      await new Promise(r => { const check = () => ws.readyState === WebSocket.OPEN ? r() : setTimeout(check, 50); });

      // 4. 使用 AudioContext 重采样到 16kHz 单声道 PCM
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          ws.send(pcm16.buffer);
        }
      };

      mediaRecorderRef.current = { audioCtx, source, processor };
    } catch (err) {
      setError(err.message || '麦克风访问失败');
    }
  }, [hotwords, onSegment]);

  const stop = useCallback(() => {
    // 发送结束信号
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ is_speaking: false }));
    }
    // 清理资源
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.processor.disconnect();
      mediaRecorderRef.current.source.disconnect();
      mediaRecorderRef.current.audioCtx.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setTimeout(() => wsRef.current?.close(), 500);
    setIsListening(false);
  }, []);

  return { start, stop, transcript, isListening, error };
}
```

### 1.4 降级方案

如果 FunASR 服务未启动，自动降级为浏览器 SpeechRecognition：

```js
// 在 useFunASR.js 中检测 FunASR 可用性
const checkFunASR = async () => {
  try {
    const ws = new WebSocket(FUNASR_WS_URL);
    await new Promise((r, reject) => {
      ws.onopen = r;
      ws.onerror = reject;
      setTimeout(reject, 2000);
    });
    ws.close();
    return true;
  } catch {
    return false;
  }
};
// 不可用时 → fallback 到 useSpeechRecognition hook
```

---

## 二、时间流速记（Timeline Quick Notes）

### 2.1 用户业务逻辑闭环

```
┌─────────────────────────────────────────────────────────┐
│                    时间流速记 完整闭环                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ① 开始学习                                              │
│     ↓                                                   │
│  ② 录音中（FunASR 实时转写）+ 打字补充                     │
│     ↓                                                   │
│  ③ 结束学习                                              │
│     ↓                                                   │
│  ④ AI 生成结构化笔记（时间线 → LLM 整合）                  │
│     ↓                                                   │
│  ⑤ 预览 + 编辑 + 标记标签                                 │
│     ↓                                                   │
│  ⑥ 保存到我的笔记（note_type="quick_timeline"）           │
│     ↓                                                   │
│  ⑦ 在"我的笔记"→"课堂速记"中查看                          │
│     ↓                                                   │
│  ⑧ 进入思考/记忆/费曼 → 学习闭环完成                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 页面操作流程（用户视角）

| 步骤 | 用户操作 | 界面变化 |
|------|---------|---------|
| 1 | 打开速记入口 → 点击「时间流速记」 | 进入"未开始"状态，中间显示引导页 |
| 2 | 点击「开始学习」 | 计时器启动，页面左侧时间流就绪，底部出现输入框和录音按钮 |
| 3 | 点击麦克风按钮 | 开始录音，按钮变红脉冲，FunASR 实时转写文字出现在时间线（蓝色气泡 + "语音识别中..."） |
| 4 | 打字补充 | 输入框打字 → 回车发送 → 时间线出现白色气泡 |
| 5 | 点击「结束学习」 | 录音停止，时间线显示"学习结束 · 总时长 XX:XX" |
| 6 | 点击「AI 生成笔记」 | 进度条走动 → 右侧面板出现 AI 整理的结构化笔记（标题、段落、列表） |
| 7 | 标记标签 | 点击笔记段落 → 选"重点/考点/不理解"等标签 |
| 8 | 点击「保存到我的笔记」 | 弹出文件夹选择器 → 选课程 → 保存 → toast 提示，可跳转查看 |

### 2.3 当前状态 → 目标改动

| 项目 | 当前状态 | 改动内容 |
|------|---------|---------|
| 语音识别 | 浏览器 SpeechRecognition | 替换为 FunASR WebSocket（`useFunASR` hook） |
| 转写文字实时显示 | 已有 `live_transcript` 类型 | 保持，改数据源为 FunASR 回调 |
| 热词支持 | 无 | 从当前课程/笔记标题提取关键词作为热词 |
| 错误处理 | 基本 | 增加 FunASR 不可用时的降级提示 |
| AI 生成 | 调 `/notes/ai-generate` | 保持，优化 prompt 适应 FunASR 更准确的输入 |

### 2.4 前端改动清单

改动的核心文件是 `QuickNotes.jsx`（当前已是重写版，基于 MediaRecorder + SpeechRecognition），需要：

1. 将 `startSpeechRecognition/stopSpeechRecognition` 替换为 `useFunASR` hook 的 `start/stop`
2. 时间线 `live_transcript` 条目的数据源从 SpeechRecognition.onresult 改为 FunASR onSegment 回调
3. 增加热词：从 `noteName` 中提取关键词传给 FunASR
4. FunASR 不可用时降级提示 + 回退 SpeechRecognition
5. 其余逻辑不变（录音控制、手动输入、AI 整合、保存、标签）

---

## 三、时间树速记（TimeTree Quick Notes）

### 3.1 用户业务逻辑闭环

```
┌─────────────────────────────────────────────────────────┐
│                    时间树速记 完整闭环                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ① 输入主题（根节点标题）                                  │
│     ↓                                                   │
│  ② 选择输入方式：                                         │
│     ├─ A. 实时录音 → FunASR 转写 → AI 拆解为树节点         │
│     ├─ B. 上传视频 → 提取音频 → FunASR → AI 拆解           │
│     └─ C. 手动添加节点（点击 "+" 输入标题）                 │
│     ↓                                                   │
│  ③ AI 生成知识树（各节点详细内容）                          │
│     ↓                                                   │
│  ④ 用户检查/编辑节点内容                                   │
│     ↓                                                   │
│  ⑤ 导出到我的笔记（整棵树转为结构化笔记）                    │
│     ↓                                                   │
│  ⑥ 在"我的笔记"→"课堂速记"中查看                           │
│     ↓                                                   │
│  ⑦ 进入思考/记忆/费曼 → 学习闭环完成                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 页面操作流程（用户视角）

| 步骤 | 用户操作 | 界面变化 |
|------|---------|---------|
| 1 | 速记入口 → 点击「时间树速记」 | 进入树形图画布，根节点显示"输入主题" |
| 2 | 双击根节点 → 输入标题（如"操作系统进程管理"） | 根节点文字更新 |
| 3 | 选择输入方式：点击「录音输入」或「上传视频」或点击 "+" 手动添加 | 录音：录音中，按钮红脉冲；视频：选文件→上传进度 |
| 4a | **录音输入**：说话 → FunASR 实时转写 → 每识别出一段完整语义，自动生成一个子节点 | 子节点逐个出现在根节点下方，连线自动绘制 |
| 4b | **视频输入**：上传视频 → 显示进度 → 提取音频 → FunASR → AI 分析内容 → 批量生成树节点 | 进度条 → 完成后节点一次性展开 |
| 4c | **手动输入**：点击节点旁的 "+" → 输入标题 → 回车 | 新子节点出现 |
| 5 | 点击任意节点 → 右侧编辑面板打开 | 面板显示：AI 摘要 + 用户笔记 + 标签 |
| 6 | 点击「AI 填充内容」 | AI 为所有节点生成详细解释 |
| 7 | 点击「导出笔记」 | 弹出文件夹选择器 → 选课程 → 整棵树递归拼为 Markdown → 保存 |

### 3.3 当前状态 → 目标改动

| 项目 | 当前状态 | 改动内容 |
|------|---------|---------|
| 树节点数据 | 全 Mock（`MOCK_NODES` 12 个固定节点） | 删掉，改为用户动态创建 |
| 节点内容 | 全 Mock（`EXPORT_DETAILS` 写死内容） | 改为 AI 生成 + 用户手动编辑 |
| "录音"功能 | 无 | 接入 `useFunASR` hook，实时转写后 AI 提取关键概念生成节点 |
| 视频上传 | 无 | 新增上传入口，后端提取音频 → FunASR → AI 拆解生成树 |
| 树操作 | 只有查看 | 增加：添加子节点、重命名、删除、拖拽移动 |
| 保存 | 只保存根节点 title | 改为保存整棵树（节点 + 关系 + 内容）到后端 |
| AI 整合 | 无 | 「AI 填充内容」按钮 → 调 `/notes/ai-generate` 为每个节点生成说明 |
| 后端存储 | 用 notes 表，metadata 存 parentId | 保持，完善 metadata 字段设计 |

### 3.4 后端设计

#### 数据存储方案（不改表结构）

利用现有 `notes` 表，`note_type="quick_timetree"`，通过 `metadata` JSON 字段存树结构：

```json
// 根节点 note 的 metadata
{
  "isTimeTreeRoot": true,
  "treeTitle": "操作系统进程管理"
}

// 子节点 note 的 metadata  
{
  "isTimeTreeNode": true,
  "parentId": "note_root_xxx",     // 父节点 note_id
  "treeRootId": "note_root_xxx",   // 根节点 note_id
  "position": 0                     // 兄弟间排序
}
```

每个节点的标题 = `note.title`，每个节点的详细内容 = `note_blocks` 中的 paragraph。

#### 新增接口

| 接口 | 用途 |
|------|------|
| `GET /notes?note_type=quick_timetree&tag=tree_{rootId}` | 获取一棵树的所有节点 |
| `POST /quick-notes/timetree/ai-build` | 从文本（转写结果）用 AI 生成树结构 |
| `POST /quick-notes/timetree/ai-fill` | 为所有节点 AI 生成详细内容 |
| `POST /quick-notes/timetree/export` | 将整棵树导出为结构化笔记 |

#### 视频处理流程

```
用户上传视频文件
    ↓
POST /resource-notes/upload  （复用现有接口，存到 temp_uploads）
    ↓
Worker: ffmpeg 提取音频 → temp_uploads/xxx.wav
    ↓
Worker: 调 FunASR 转写 → 全文文本
    ↓
Worker: 调 /quick-notes/timetree/ai-build → 生成树结构 JSON
    ↓
返回：树节点列表 [{title, parentId, content}, ...]
    ↓
前端渲染为树形图
```

**ffmpeg 提取音频命令**：
```bash
ffmpeg -i input.mp4 -vn -ar 16000 -ac 1 -f wav output.wav
```

### 3.5 前端改动清单

重写 `TimeTreeNotes.jsx`（当前 355 行，全 Mock）：

| # | 改动 | 说明 |
|---|------|------|
| 1 | 删 `MOCK_NODES` / `EXPORT_DETAILS` | 所有 Mock 数据 |
| 2 | 接入 `useFunASR` | 录音 → 实时转写 → AI 提取关键词 → 自动生成子节点 |
| 3 | 新增「上传视频」按钮 | 上传 → 后端提取音频 → FunASR → AI 拆解 → 批量生成节点 |
| 4 | 新增「添加子节点」功能 | 节点旁 "+" 按钮 → 输入标题 → `create_note(note_type="quick_timetree")` |
| 5 | 新增「AI 填充内容」按钮 | 调后端为所有节点生成详细说明 |
| 6 | 新增「重命名/删除」 | 双击标题编辑、右键删除（递归） |
| 7 | 保存/加载 | 从后端获取树数据 → 渲染；改动后保存 |
| 8 | 导出优化 | 递归遍历树 → 按层级生成 Markdown → `create_note(note_type="manual")` |

---

## 四、GitHub 开发流程

### 开发模型

```
leader-g1-mty（主分支，只合不直接改）
    │
    ├── 你拉取最新代码
    │
    ├── 创建个人分支 feature/xxx
    │
    ├── 在个人分支上开发 + 提交
    │
    └── 提交 PR → leader-g1-mty → 合并
```

### 完整操作指令

#### 第 1 步：拉取主分支最新代码

```bash
# 切到本地 mty 分支（以mty为例）
git checkout mty

# 拉取远程 leader-g1-mty 最新代码
git pull origin leader-g1-mty
```


#### 第 2 步：正常开发 + 提交

```bash
# 开发完成后，一次性添加全部改动
git add .
git commit -m "feat: 速记模式接入 FunASR 语音识别 + 时间树 AI 生成"

# 推送到远程个人分支
git push origin feature/quick-notes-funasr
```

#### 第 3 步：提交 Pull Request

1. 打开 GitHub 仓库页面：`https://github.com/dousiying/Muduo-notes-v1`
2. 点击「Pull requests」→「New pull request」
3. **base** 选择 `leader-g1-mty`
4. **compare** 选择你的分支（如 `mty`）
5. 标题写清楚改动内容：`速记模式: FunASR语音识别 + 时间树AI生成`
6. 描述中列出改动的文件和功能点
7. 点击「Create pull request」
8. 在群里发 PR 链接，通知其他人 review



#### 第 5 步：合并后更新本地

```bash
# PR 合并后，切回本地分支拉取最新
git checkout mty
git pull origin leader-g1-mty
```

### 可能遇到的问题

**Q：开发到一半 leader-g1-mty 有更新怎么办？**

```bash
# 在个人分支上
git fetch origin leader-g1-mty
git merge origin/leader-g1-mty
# 有冲突就解决冲突，然后继续开发
```

**Q：PR 有冲突怎么办？**

```bash
# 在本地个人分支上
git fetch origin leader-g1-mty
git merge origin/leader-g1-mty
# 解决冲突
git add .
git commit -m "merge: 解决与 leader-g1-mty 的冲突"
git push origin feature/xxx
# PR 会自动更新
```

**Q：commit 写错了想改？**

```bash
# 改最后一次提交的信息
git commit --amend -m "新的提交信息"
git push --force-with-lease origin feature/xxx
```
