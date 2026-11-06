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
| `src/pages/ListingForm.jsx` | 認証後の入力フォームと入力内容のプレビュー。実際の出品はしない。 | ItemCard・Button。 |
| `src/pages/demoData.js` | 5趣味クラスタの表示確認用商品データ。 | 画面側のみ。 |
| `src/pages/pages.css` | 画面のカード配置・フォーム・余白の共通スタイル。 | theme のトークン。 |
| `src/pages/Login.jsx` | トークンと共通Buttonによる登録・ログイン。入力パスワードを保持しない。 | hooksの認証操作。 |
| `src/api/client.js` | 環境別のAPI接続・Bearerヘッダー・安全なエラー表示。 | VITE_API_BASE_URL。 |
| `src/api/auth.js` | 登録・ログイン・本人情報APIと応答の検証。 | APIクライアント。 |
| `src/api/session.js` | タブ内トークン保持・本人確認・期限切れ・401・古い応答の排除。 | 認証API。 |
| `src/hooks/useHashRoute.js` | URLの変更を購読し、ログアウト等の遷移を一貫して扱う。 | App。 |
| `src/hooks/useAuth.js` | 認証状態の購読と復元・操作を画面に渡す。 | session。 |
| `src/utils/authRedirect.js` | 内部画面だけを許可するログイン後の戻り先。 | App・Login。 |
| `.env.example` | 秘密値を含まないAPI設定名の見本。 | Vite。 |
| `tests/auth.e2e.cjs` | 実APIでの登録・ログイン・再読み込み・保護導線と異常系のブラウザーテスト。 | Playwright（開発依存）。 |

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
| `/#/listing` | ログイン後の出品フォーム。入力チェック後にプレビュー表示。実際の出品なし |
| `/#/login` | 登録・ログイン画面 |

現在の元コードには3画面がなかったため、T1-3 では仮データの3画面を新規作成した。
アプリ名は未定のプレースホルダー。購入・出品・推薦の API 連携はこのタスクでは行わない。
共通の Header / BottomNav に加え、各画面で Button / ItemCard を使用する。
コーラルの参照は `src/pages/Home.css` の目玉カード上部ライン・チップ・CTA のみ。

## T2-3 登録・ログインと状態の保持

### API の接続先

T2-2 のバックエンド（登録・ログイン・本人確認API）を起動する。
本番DBを使う場合は、T2-2の所有者列等の移行とJWTシークレット設定を先に済ませる。
設定名の見本は `.env.example`。値は自分の環境の `.env.local` に設定する。

- `VITE_API_BASE_URL`: フロントエンドから見たAPIの基底URL。未設定時は `/api`。
- `API_PROXY_TARGET`: 開発用Viteの `/api` の接続先。既定は `http://127.0.0.1:8001`。
- 本番ビルドでは `VITE_API_BASE_URL` にバックエンドの HTTPS URL を設定する（末尾スラッシュは任意）。Viteの開発用プロキシは本番には含まれない。
- JWTシークレットやDBパスワードをフロントエンドの環境変数に入れない。

例：ローカルAPIを8012で動かす場合、`.env.local` に `API_PROXY_TARGET=http://127.0.0.1:8012` を設定して `npm run dev`。
バックエンドを別オリジンに直接指定する場合は、フロントエンドのオリジンをバックエンドのCORS許可元に設定する。

### 動作

- 同じ画面でログイン／新規登録を切り替える。成功後は元の出品画面・商品詳細へ戻る。
- ホームと商品閲覧は公開。出品フォームは保護し、未ログインの購入ボタンもログインへ誘導する。
- 購入・出品は引き続きサンプル表示。サーバーへの実購入・出品APIは呼ばない。
- JWTと期限だけを **sessionStorage** に保持する。同じタブの再読み込みで復元し、タブを閉じると保持は終了する。
- 再読み込み時は必ず `/auth/me` に照会し、本人確認前・通信失敗時に保護画面を表示しない。保存した表示名等を認証の根拠にしない。
- 通信失敗では保存情報を残して再試行できる。有効期限や保護APIの401では保持情報を破棄して再ログインへ誘導する。
- ログアウトは当タブの保持情報と画面上の本人情報を消す。JWTのサーバー側の有効期限はT2-1/T2-2の設定に従う。
- 遅れて届く前のログイン状態の応答を捨て、別アカウントの画面へ表示しない。
- パスワードはフォーム送信時だけAPIへ渡す。保持・ログ出力せず、送信後に入力欄を消す。
- ログイン後の戻り先は許可した内部ハッシュだけを使い、外部URLを拒否する。

### ブラウザーテスト

統合テストは実行コード `src/` の外に分けるため `tests/` に配置する。
ローカルの使い捨てDBを指すT2-2 APIとフロントエンドを起動して実行する。
テストは新規登録を実行するため、本番DBへ向けないこと。

```sh
npm ci
npx playwright install chromium
AUTH_E2E_ALLOW_REGISTRATION=1 AUTH_E2E_BASE_URL=http://localhost:5181 npm run test:auth
```

ループバックURLだけを許可し、登録実行の設定がある場合だけテストする。
Chromiumの代わりに導入済みブラウザーを使う場合は `PLAYWRIGHT_CHANNEL=msedge` 等を指定できる。
画像と結果は既定で `test-results/auth/`（Git除外）、`AUTH_E2E_OUTPUT_DIR` で変更可能。
登録・ログイン・本人情報の成功系は実APIで検証する。
通信失敗・401・期限短縮はブラウザーのネットワーク差し替えで確認する。秘密値は結果へ記録しない。

参照：[React公式 useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)、
[Vite公式 proxy](https://vite.dev/config/server-options.html#server-proxy)、
[OWASP Storage APIs](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#storage-apis)。
