# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## ファイル役割一覧

| パス | 役割 | 主な依存関係 |
| --- | --- | --- |
| `src/theme/tokens.css` | 第0部に沿った色・角丸・余白の共通 CSS 変数。コーラルの用途もコメントで明示する。 | 共通部品の CSS から読み込む。通常画面への適用は後続タスク。 |
| `src/components/Button.jsx` | primary / secondary のボタン。標準の button 属性とイベントを受け取る。 | 共通部品・トークン（API通信なし）。 |
| `src/components/ItemCard.jsx` | 親から渡された商品名・価格文字列・画像・カテゴリ・状態・理由を表示する。 | 共通部品・トークン（API通信なし）。 |
| `src/components/StatusBadge.jsx` | 販売中・売却済み・取引中・下書きの表示。未知の値は「状態未設定」。 | 共通部品・トークン（API通信なし）。 |
| `src/components/Header.jsx` | 未定のアプリ名と、親から渡された操作を表示するヘッダー。 | 共通部品・トークン（API通信なし）。 |
| `src/components/BottomNav.jsx` | 項目・選択状態・遷移処理を親から受け取るナビ。固定配置は画面側で行う。 | 共通部品・トークン（API通信なし）。 |
| `src/components/index.js` | 共通部品の公開エクスポート。 | 共通部品・トークン（API通信なし）。 |
| `src/components/components.css` | トークンを読み込む共通部品のスタイル。 | 共通部品・トークン（API通信なし）。 |
| `src/components/preview/main.jsx` | 仮データと表示確認用のローカル状態のみを持つプレビュー。 | 共通部品・トークン（API通信なし）。 |
| `src/components/preview/preview.css` | 通常画面から分離したプレビューのレイアウト。 | 共通部品・トークン（API通信なし）。 |
| `components-preview.html` | 共通部品プレビューの HTML エントリー。 | 共通部品・トークン（API通信なし）。 |

## 共通部品の確認方法

```sh
npm run dev
```

表示されたローカル URL の `/components-preview.html` を開く。
プライマリ／セカンダリと無効状態、商品カード、状態バッジ、ヘッダー、
下部ナビを仮データで確認できる。ボタン・ナビの操作結果は画面下に表示する。
`npm run build` では通常画面とプレビューの両方をビルドする。

```jsx
import { Button, ItemCard, Header, BottomNav, StatusBadge } from './components'

<Button variant="primary" onClick={handleClick}>つづける</Button>
<Button variant="secondary" disabled>保存</Button>
<ItemCard title="フィルムカメラ" priceLabel="¥12,000" categoryLabel="カメラ" status="available" href="/items/1" />
<StatusBadge status="sold" />
<Header homeHref="/">操作用の部品を children で渡す</Header>
<BottomNav items={[{ id: 'home', label: 'ホーム', href: '/' }]} currentId="home" />
```

価格の整形・API 状態の対応付け・リンク先の決定・業務処理は親の責務。
`ItemCard` の `imageSrc` は画像 URL、`imageAlt` は代替テキスト、`reason` は任意の理由文。
`BottomNav` の `onNavigate(event, item)` は任意。未指定の場合は通常のリンクとして動作する。
コーラルは目玉カードの専用アクセントのため、この汎用部品では使用しない。
