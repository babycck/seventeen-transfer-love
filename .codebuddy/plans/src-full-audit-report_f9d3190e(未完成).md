---
name: src-full-audit-report
overview: 对 SEVENTEEN 项目 src/ 全量代码进行只读审计，覆盖安全、功能正确性、代码质量、性能四个维度，输出结构化审计报告，不修改代码。
todos:
  - id: map-codebase
    content: 使用 [subagent:code-explorer] 扫描 src 全目录并梳理模块依赖
    status: pending
  - id: security-audit
    content: 审计 DOM 安全、escHtml 覆盖、API Key 与 localStorage 安全
    status: pending
    dependencies:
      - map-codebase
  - id: functional-audit
    content: 审计状态管理、存档迁移、游戏流程与 1v1 模式正确性
    status: pending
    dependencies:
      - map-codebase
  - id: quality-audit
    content: 审计代码重复、耦合、命名、循环依赖与约定遵守
    status: pending
    dependencies:
      - map-codebase
  - id: performance-audit
    content: 审计渲染、AI 调用、动画、剧情压缩与存储性能
    status: pending
    dependencies:
      - map-codebase
  - id: write-report
    content: 汇总结果并生成结构化审计报告
    status: pending
    dependencies:
      - security-audit
      - functional-audit
      - quality-audit
      - performance-audit
  - id: present-report
    content: 向用户展示报告摘要并等待确认修复计划
    status: pending
    dependencies:
      - write-report
---

## 审计范围

覆盖整个 `src/` 目录（含 `skeleton/`、`ui/`、`modals/`、`prompts/` 子目录），不对代码做任何修改。

## 审计维度

1. 安全性：XSS、输入转义、DOM 插入、API Key/存档存储、eval/alert/confirm 禁用
2. 功能正确性：状态管理、存档迁移、游戏流程分支、1v1 模式、日记/朋友圈/剧场逻辑
3. 代码质量：重复代码、模块耦合、命名规范、文件大小、循环依赖、约定遵守情况
4. 性能：AI 调用、DOM 渲染、打字机/动画、剧情压缩、localStorage 读写

## 交付物

一份结构化 Markdown 审计报告，包含问题清单、严重程度、影响范围、修复建议；待用户确认后再制定修复计划。

## 审计方法

- 静态代码分析为主，结合项目约定（`var`、字符串 `+` 拼接、禁用模板字符串、`escHtml` 强制转义、`showToast/showConfirmModal` 替代原生弹窗）
- 使用 [subagent:code-explorer] 对关键模块进行跨文件扫描和依赖梳理
- 不引入新工具或依赖，不修改源码，不提交 git

## 报告结构

1. 执行摘要（问题总数、高优先级数量、核心风险）
2. 安全审计（DOM 插入点、escHtml 覆盖、API Key 处理、存储安全）
3. 功能审计（状态机、迁移逻辑、1v1 分支、存档/重置）
4. 质量审计（重复/耦合、大文件、命名、循环依赖）
5. 性能审计（渲染热点、AI 调用、压缩机制）
6. 附录：文件清单与优先级建议

## 输出路径

`d:/SEVENTEEN/audit-report.md`

## 使用的扩展

### SubAgent

- **code-explorer**
- 用途：扫描 `src/` 全目录，定位 DOM 插入、状态管理、AI 调用、1v1 逻辑等关键代码片段，整理模块依赖和重复模式
- 预期成果：输出关键文件索引、风险点位置、依赖关系摘要，作为审计报告的依据