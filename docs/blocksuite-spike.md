# Blocksuite 独立引库验证结论(spike)

日期:2026-10-28

## 结论

**能独立用。** BlockSuite 是 web components 方案(`<page-editor>` 自定义元素 + lit),
不依赖 AFFiNE,可直接在 Vite + React 中挂载。已验证:

- `npm run build`(tsc + vite)通过,三个包可正常 import/打包。
- 纯 Node 冒烟测试通过:`Schema` + `AffineSchemas` + `DocCollection` 可创建文档、
  生成 `affine:page / surface / note / paragraph` 块树、写入标题、读写段落文本
  (`doc.addBlock('affine:paragraph', { text: new doc.Text('...') })` 回读成功)。
- 组件 `frontend/src/components/editor/BlockSuiteEditor.tsx` 已写好最小挂载封装,
  临时路由 `/spike` 可手动打开确认「能显示、能打字」(本机无浏览器,未做点击级验证)。

## 版本(三包必须对齐)

| 包 | 版本 |
|---|---|
| `@blocksuite/presets` | 0.19.5 |
| `@blocksuite/store` | 0.19.5 |
| `@blocksuite/blocks` | 0.19.5 |

注意:`@blocksuite/store` 的 npm `latest` 是 0.22.4,但 `presets@0.19.5` 内部 pin 的是
`0.19.5`,所以三包统一装 0.19.5(勿单独升级 store)。

## 关键坑(不处理会直接失败)

1. **`@blocksuite/icons` 必须 pin 到 2.1.75。**
   blocksuite 0.19.5 源码里引用了拼写错误的图标名 `CheckBoxCkeckSolidIcon`,
   icons 2.2.x 把它改名成了 `CheckBoxCheckSolidIcon`,导致 Vite 打包报
   `MISSING_EXPORT`。已用 package.json 的 `overrides` 强制:
   ```json
   "overrides": { "@blocksuite/icons": "2.1.75" }
   ```

2. **自定义元素需要手动调 `effects()` 注册。**
   `@blocksuite/blocks/effects` 和 `@blocksuite/presets/effects` 都只导出 `effects()`
   函数、不会自动执行。不调用则 `<page-editor>`、`affine-paragraph` 等标签未注册。
   ```ts
   import { effects as blocksEffects } from '@blocksuite/blocks/effects';
   import { effects as presetsEffects } from '@blocksuite/presets/effects';
   if (!customElements.get('page-editor')) {
     blocksEffects();
     presetsEffects();
   }
   ```

3. **`DocCollection` 必须 `meta.initialize()` 再建文档。**
   不初始化时 `collection.createDoc()` 里 `meta.addDocMeta()` 静默跳过(内部 `docs`
   数组为 null),`getDoc()` 返回 null,`createDefaultDoc()` 会 `doc.load()` 崩。

4. **纯内存编辑不要调 `collection.start()`。**
   `start()` 会启动 doc/awareness 同步引擎,在 Node 里会挂住进程;仅本地内存编辑时
   只需要 `meta.initialize()`。需要持久化/协作时才 `start()` + 数据源。

5. **文本用 `doc.Text` 工厂绑定到文档。**
   `new doc.Text('...')` 而非裸 `new Text('...')`;段落文本通过
   `doc.addBlock('affine:paragraph', { text: new doc.Text('...') }, noteId)` 写入。

## 体积

主 bundle 约 6.5MB(gzip 1.7MB),是 BlockSuite 自身重量级所致。个人工作台可接受,
后续可用动态 `import()` 按模块懒加载拆包。
