# Timelane

Electronベースのガントチャートアプリケーション。プロジェクトのタスクを視覚的に管理できます。

## 主な機能

- プロジェクト・タスクの階層管理
- ガントチャート表示（週/月表示切替）
- ダークモード対応
- タスクの複製・ドラッグ操作
- データのJSON保存/読み込み
- Excel出力

## インストール

[Releases](https://github.com/ichyy-n/timelane/releases) ページから最新版をダウンロードしてください。

- **macOS**: `.dmg` ファイルをダウンロードしてインストール

## 開発

```bash
npm install
npm run dev          # Vite開発サーバー起動
npm run electron-dev # Electron開発モード（要: npm run dev 同時起動）
```

## ビルド

```bash
npm run build:electron  # Vite build + electron-builder
```

## 技術スタック

- Electron 41
- React 19 + Vite 8
- ExcelJS
