# Yv 一家的小岛

3D 小岛漫步小游戏：妈妈鸭在岛上自由探索，爸爸鸭悠闲散步，鸭宝宝追着妈妈跑，小绵羊随机来岛上做客。

**在线体验**：https://sakyalin.github.io/yv_island/

## 玩法

- **移动**：`WASD` / 方向键，或左下角虚拟摇杆（手机触屏可用）
- **视角**：鼠标 / 手指拖拽环绕
- 走到野餐桌旁，桌上有一盘黑巧克力

## 功能特性

- 日夜交替：日出日落、星空、晴朗夜晚的流星雨
- 天气系统：晴 / 多云 / 下雨随机切换，雨夜篝火与路灯亮起
- 小绵羊：每次打开网页约 50% 概率来岛上散步，走累了低头吃草
- 环境音：粉噪音实时合成的海浪声，宁静低缓，默认静音（右上角喇叭开启）
- 小岛生态：森林、棕榈滩、码头、木屋村落、花草岩石随机布局

## 技术栈

- React 19 + TypeScript + Vite
- Three.js 实时渲染（程序化生成所有模型，无外部资源文件）
- Web Audio API 实时合成环境音（无音频文件）
- Tailwind CSS

## 本地开发

```bash
npm install
npm run dev        # 开发服务器 http://localhost:3000
npm run build      # 类型检查 + 构建到 dist/
npm run preview    # 本地预览构建产物
```

## 部署

推送到 `main` 分支后，GitHub Actions 自动构建并部署到 GitHub Pages（见 `.github/workflows/deploy.yml`），无需手动操作。

## License

[MIT](LICENSE)
