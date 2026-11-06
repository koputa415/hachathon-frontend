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
| `src/pages/Home.jsx` | 公開APIの商品一覧・追加読み込み・空とエラー表示・最新出品への導線。 | items API・ItemCard・Button。 |
| `src/pages/Home.css` | ホーム専用目玉カード。コーラルを3用途に限定する。 | theme のトークン。 |
| `src/pages/ItemDetail.jsx` | 商品IDごとのAPI取得・再試行・404表示。購入入口は既存の認証導線を維持。 | items API・ItemCard・Button。 |
| `src/pages/ListingForm.jsx` | 認証必須の商品・画像入力、ファイル検証、実出品送信、保存完了とエラー表示。 | items API・ItemCard・Button・theme。 |
| `src/utils/itemPresentation.js` | APIの商品を共通カードの表示項目へ整形する純粋関数。 | ItemCard・Home・ItemDetail。 |
| `src/api/hobbyClusters.js` | APIからカテゴリ一覧を取得・応答検証する。 | カテゴリ用フック。 |
| `src/hooks/useHobbyClusters.js` | カテゴリの読込・失敗・再試行を共通管理する。 | 出品・一覧画面。 |
| `src/pages/pages.css` | 画面のカード配置・フォーム・余白の共通スタイル。 | theme のトークン。 |
| `src/pages/Login.jsx` | トークンと共通Buttonによる登録・ログイン。入力パスワードを保持しない。 | hooksの認証操作。 |
| `src/api/client.js` | 環境別のAPI接続・Bearerヘッダー・安全なエラー表示。 | VITE_API_BASE_URL。 |
| `src/api/items.js` | 画像と商品をmultipartで出品し、検証エラーを項目別に表示する。 | 認証付きAPIクライアント。 |
| `src/api/auth.js` | 登録・ログイン・本人情報APIと応答の検証。 | APIクライアント。 |
| `src/api/session.js` | タブ内トークン保持・本人確認・期限切れ・401・古い応答の排除。 | 認証API。 |
| `src/hooks/useHashRoute.js` | URLの変更を購読し、ログアウト等の遷移を一貫して扱う。 | App。 |
| `src/hooks/useAuth.js` | 認証状態の購読と復元・操作を画面に渡す。 | session。 |
| `src/utils/authRedirect.js` | 内部画面だけを許可するログイン後の戻り先。 | App・Login。 |
| `.env.production` | 本番ビルドの公開API接続先。秘密値は置かず環境変数で上書き可能。 | Vite。 |
| `scripts/check-auth-api.mjs` | 公開OpenAPIに登録・ログイン・本人確認があることをGETだけで確認する。 | 本番反映前チェック。 |
| `.env.example` | 秘密値を含まないAPI設定名の見本。 | Vite。 |
| `tests/items.e2e.cjs` | 実出品から一覧・詳細・再読み込み・ページング・空とエラー表示まで検証。 | 実API・分離DB・Playwright。 |
| `tests/listing.e2e.cjs` | 実APIの画像付き出品・画像再取得・入力とサーバーエラー・二重送信抑止・401のブラウザーテスト。 | Playwright・分離DB・GCSエミュレーター。 |
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
| `/#/` | DB由来の商品一覧と最新出品への導線 |
| `/#/items/<商品ID>` | DBから取得した商品の詳細。存在しなければ404表示 |
| `/#/listing` | ログイン後の出品フォーム。商品と画像をAPIに保存する |
| `/#/login` | 登録・ログイン画面 |

現在の元コードには3画面がなかったため、T1-3 では仮データの3画面を新規作成した。
アプリ名は未定のプレースホルダー。T3-2で出品、T3-3で一覧・詳細をAPIへ接続済み。購入処理は後続タスク。
共通の Header / BottomNav に加え、各画面で Button / ItemCard を使用する。
コーラルの参照は `src/pages/Home.css` の目玉カード上部ライン・チップ・CTA のみ。

## T2-3 登録・ログインと状態の保持

### API の接続先

T2-2 のバックエンド（登録・ログイン・本人確認API）を起動する。
本番DBを使う場合は、T2-2の所有者列等の移行とJWTシークレット設定を先に済ませる。
設定名の見本は `.env.example`。値は自分の環境の `.env.local` に設定する。

- `VITE_API_BASE_URL`: フロントエンドから見たAPIの基底URL。未設定時は `/api`。
- `API_PROXY_TARGET`: 開発用Viteの `/api` の接続先。既定は `http://127.0.0.1:8001`。
- 本番ビルドは `.env.production` の公開Cloud Run URLを使う。Cloudflare等のビルド環境で `VITE_API_BASE_URL` を設定すると上書きできる。Viteの開発用プロキシは本番には含まれない。未設定・相対URLでは公開ビルドを止める。
- JWTシークレットやDBパスワードをフロントエンドの環境変数に入れない。

例：ローカルAPIを8012で動かす場合、`.env.local` に `API_PROXY_TARGET=http://127.0.0.1:8012` を設定して `npm run dev`。
バックエンドを別オリジンに直接指定する場合は、フロントエンドのオリジンをバックエンドのCORS許可元に設定する。

### 動作

- 同じ画面でログイン／新規登録を切り替える。成功後は元の出品画面・商品詳細へ戻る。
- ホームと商品閲覧は公開。出品フォームは保護し、未ログインの購入ボタンもログインへ誘導する。
- 購入は引き続きサンプル表示。T3-2以降の出品フォームは実APIへ商品と画像を保存する。
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

## 公開サイトの認証接続

Cloudflareは静的アセットの配信であり、Vite開発サーバーの `/api` プロキシは存在しない。
`.env.production` には公開Cloud Run URLだけを設定する。秘密情報は含めない。

公開前に次を実行する。このチェックはGETのみで、登録や本番DBへの書き込みをしない。

```sh
npm run check:auth-api
npm run build
```

公開ビルドのAPI接続先はコミット済みの `.env.production` またはビルド環境の `VITE_API_BASE_URL` から取得する。
ローカルだけの設定ファイルはGit経由のCloudflareビルドに渡らない。`/api` のまま公開すると、
ログインPOSTが静的配信先で405となる。再発防止のため、相対URLではビルドを止める。
Cloud Runの認証APIが公開済みであることを上記チェックで確認した後、Cloudflareへ反映する。
対象Google Cloudプロジェクトは `uttc-c10-oki-hashimoto-21b40e`。
本番DBの状態確認・バックアップ・移行前に、新しいコードを公開へ反映しない。

## T3-2 画像付き出品

出品フォームは商品名・説明・カテゴリ（5趣味）・状態・価格・画像1枚を入力し、
`POST /items/with-image` へ `item`（商品JSON文字列）と `image`（ファイル）をmultipart送信する。
Bearer JWTは認証セッションから送信直前に取得し、画面にトークンを渡さない。
画像はJPEG・PNG・WebP、5MB以下。選択直後にプレビューし、API側でも実体・容量・画素数を検証する。
既存のJSON `POST /items` は維持されている。

- 出品中は入力とボタンを無効化し、重複submitも抑止する。
- 成功時だけ商品番号・保存済み画像・商品の内容を表示する。
- 入力エラーは項目別の理由を表示し、保存先の障害・通信失敗は完了扱いにしない。入力内容は再試行まで保持する。
- 401では保持したログイン情報を破棄し、出品画面へ戻れるログイン導線を表示する。
- ホームの商品一覧・詳細は引き続き仮データで、今回の保存結果はそこへ自動追加しない。

画像保存にはバックエンドのT3-2対応版が必要。
公開環境では非公開のCloud Storageバケットを用意し、
Cloud Runへ `ITEM_IMAGES_BUCKET` と `GOOGLE_CLOUD_PROJECT` を設定する。
Cloud Run実行サービスアカウントに当該バケットの画像作成・取得・削除権限を付ける。
フロントにStorage認証情報を置かず、画像はAPIの `/items/{id}/image` 経由で表示する。
バックエンドの `cd/docs/item-images.md` に設定・API・確認手順を記載した。
T3-2実装後にユーザーがCloud Storageを設定済み。今回のT3-3ではバケット・権限・本番環境を変更しない。

### 出品ブラウザーテスト

T3-2対応API・分離したPostgreSQL・GCSエミュレーターへ接続したローカルフロントを用意して実行する。

```sh
LISTING_E2E_ALLOW_WRITES=1 LISTING_E2E_BASE_URL=http://localhost:5181 npm run test:listing
```

テストは実際に登録・出品するため、ローカルURLと明示的な書き込み許可の両方を必須とする。
`PLAYWRIGHT_CHANNEL=msedge` 等でブラウザを切り替え可能。
結果・スクリーンショットは `test-results/listing/`（Git除外）に保存し、`LISTING_E2E_OUTPUT_DIR` で変更できる。
実APIでの出品201、入力422、画像の再取得、障害表示、二重submit抑止、401導線、375px幅を検証する。
サーバー障害・通信失敗・401のみネットワーク差し替えで再現する。
実GCSのIAM・本番バケットへのアップロードはローカルエミュレーターの検証には含まれない。

## T3-3 商品一覧と商品詳細

- ホームは公開 `GET /items?limit=24` から新しい出品順に表示する。
- 「もっと見る」は応答の `next_cursor` を `before_id` として送り、残りの商品を追加する。
- 商品リンクは `/#/items/<ID>` を開き、公開 `GET /items/<ID>` から詳細を取得する。
- 画像は `image_path` がある場合だけ既存の画像APIから表示する。画像なしの商品も一覧・詳細へ表示する。
- ブラウザの再読み込みでも改めてGETし、固定の商品や前回の保存データには置き換えない。
- 読み込み中・空の一覧・通信失敗と再試行・商品404を表示する。
- ホーム上部の導線は取得した最新出品を使う。過去の仮データにあった固定の趣味嗜好や商品IDに依存しない。

`src/pages/demoData.js` を削除し、5趣味の選択肢だけを `src/utils/hobbyCategories.js` に移した。
商品名・説明・カテゴリ・状態・価格・画像はAPIに由来する。
販売ステータスの変更と購入処理は後続タスクで、現段階の出品は既存の販売中表示を使う。
コンポーネント専用の `components-preview.html` では引き続き仮データを利用できる。

### 検証

取得APIを追加したバックエンドのT3-3対応版と、使い捨てDB・GCSエミュレーターを用意する。
既存の認証・出品APIの入出力は維持している。公開反映はバックエンド、フロントの順に行う。

```sh
ITEMS_E2E_ALLOW_WRITES=1 ITEMS_E2E_BASE_URL=http://localhost:5182 npm run test:items
```

テストは実際に登録・ページング用商品25件・ブラウザからの画像付き出品を行うため、
通常のプレビューとは別の使い捨てDBを使う。`ITEMS_E2E_OUTPUT_DIR` で結果と画像の出力先を指定できる。
成功系は実APIで、空の一覧・通信失敗・サーバー障害だけをブラウザ側で差し替える。
既存の `npm run test:auth` は固定IDを使わず、実APIで閲覧用フィクスチャを作成する。
ローカル検証では一覧→詳細→再読み込み・画像表示・追加読み込み・未ログイン閲覧・404と再試行を確認済み。
バックエンドの認証・出品・画像・取得を含むpytestは146件成功。


## T3-2 カテゴリをAPIから取得

出品カテゴリは `GET /hobby-clusters` の選択肢をそのまま表示し、出品者が選ぶ。
「その他」も同じ選択肢。画面にはカテゴリの一覧を直書きしない。
取得中や失敗時は送信できず、再試行できる。入力済みの商品情報は保持する。
バックエンドのカテゴリ管理追加を先に反映する必要がある。

検証：出品ブラウザテストはカテゴリ取得障害・再試行・API由来の追加選択肢・その他の画像付き保存も対象にする。
