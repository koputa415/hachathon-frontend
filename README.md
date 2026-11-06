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
| `src/theme/tokens.css` | 第0部に沿った色・角丸・余白の共通 CSS 変数。コーラルの用途もコメントで明示する。 | 共通部品の CSS から読み込む。Home・ItemDetail・ListingForm と共通部品から参照する。 |
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
| `src/App.jsx` | ハッシュ URL に応じた画面切り替えと、共通ヘッダー・下部ナビ。 | pages・components。 |
| `src/App.css` | アプリ全体の配置とスキップリンク。 | theme のトークン。 |
| `src/index.css` | トークンを読み込む全体の基本スタイル。 | theme のトークン。 |
| `src/pages/Home.jsx` | 仮商品一覧と理由付きの未体験趣味の目玉カード。 | ItemCard・Button。 |
| `src/pages/Home.css` | ホーム専用目玉カード。コーラルを3用途に限定する。 | theme のトークン。 |
| `src/pages/ItemDetail.jsx` | 仮商品の詳細・状態・購入ボタンの表示確認。 | ItemCard・Button。 |
| `src/pages/ListingForm.jsx` | 入力フォームと入力内容のプレビュー。実際の出品はしない。 | ItemCard・Button。 |
| `src/pages/ChatHistory.jsx` | 元の App.jsx のチャット履歴取得を維持する画面。 | 既存の /chats API・Button。 |
| `src/pages/demoData.js` | 5趣味クラスタの表示確認用商品データ。 | 画面側のみ。 |
| `src/pages/pages.css` | 画面のカード配置・フォーム・余白の共通スタイル。 | theme のトークン。 |

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

## T1-3 の画面確認

`npm run dev` のローカル URL で以下を開く。

| URL | 画面 |
| --- | --- |
| `/#/` | ホーム（仮データの商品5件と、理由付きの「まだ知らない趣味」目玉カード） |
| `/#/items/1` | 販売中の商品詳細 |
| `/#/items/2` | 売却済みの商品詳細（購入ボタン無効） |
| `/#/listing` | 出品フォーム。入力チェック後にプレビュー表示。実際の出品なし |
| `/#/chat-history` | 既存のチャット履歴画面。従来の取得 API を使用 |

現在の元コードには3画面がなかったため、T1-3 では仮データの3画面を新規作成した。
アプリ名は未定のプレースホルダー。購入・出品・推薦の API 連携はこのタスクでは行わない。
共通の Header / BottomNav に加え、各画面で Button / ItemCard を使用する。
コーラルの参照は `src/pages/Home.css` の目玉カード上部ライン・チップ・CTA のみ。
