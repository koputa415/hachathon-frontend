# T9-2 商品画像のCloudflare CDN配信

## 構成

ブラウザ → Cloudflare `/images/items/{id}/image` → FastAPI `/items/{id}/image` → 非公開Cloud Storage。
Cloudflareは画像だけを配信する。認証・出品・購入APIは既存の接続先を使用する。
既存のAPIレスポンスの`image_path`やDBの画像レコードは変更しない。
バケットの公開やフロントエンドへのGoogle認証情報の配布は不要。

200のJPEG/PNG/WebPだけを1時間キャッシュする。CookieやJWTはオリジンへ送信しない。
404、503、リダイレクト、HTML、空や5MiB超の画像は保存しない。エラーにはno-storeを付ける。
キャッシュキーには設定されたオリジンも含め、接続先変更時の別DB画像の混入を防ぐ。
`X-Image-Cache: HIT / MISS`でキャッシュを確認できる。

## 環境変数

| 設定先 | 名前 | 値 |
| --- | --- | --- |
| フロントのビルド時 | `VITE_API_BASE_URL` | 既存のCloud Run APIのHTTPS URL |
| フロントのビルド時 | `VITE_ITEM_IMAGE_BASE_URL` | 同じCloudflareサイトなら`/images`。別ホストなら`https://CDN_HOST/images` |
| Cloudflare Workerの実行時 | `IMAGE_ORIGIN_BASE_URL` | Cloud Run APIのHTTPS URL。ユーザー情報やクエリは付けない |
| Cloud Run | `ITEM_IMAGES_BUCKET` | 保存先GCSバケット名 |
| Cloud Run | `GOOGLE_CLOUD_PROJECT` | Google CloudプロジェクトID |
| Cloud Run（任意） | `ITEM_IMAGES_ENDPOINT` | 通常は未設定。必要な場合のみStorage APIのHTTPS URL |
| ローカルAPIだけ | `STORAGE_EMULATOR_HOST` | GCS互換サーバーのHTTP URL。本番では設定しない |

`VITE_ITEM_IMAGE_BASE_URL`未設定なら既存のAPI経由の画像URLを維持する。
Vercelからも同じコードを使え、Cloudflareの画像配信先を絶対URLで指定する。
バケット未作成の場合は、先にバックエンドの`cd/docs/item-images.md`の手順で作成・権限付与する。
既に正常稼働するバケットがある場合は再作成しない。

## Cloudflareへの反映

1. バックエンドのT9-1を先に通常の手順で反映する。既存のDB・JWT・Gemini・バケット設定を保持する。
2. Cloudflareの当該Workerのビルド変数へ`VITE_ITEM_IMAGE_BASE_URL=/images`を設定する。既存の`VITE_API_BASE_URL`は正しいCloud Run URLを維持する。
3. 実行時変数`IMAGE_ORIGIN_BASE_URL`へ同じCloud Run URLを設定する。秘密情報ではない。
4. このコードを反映してビルド・デプロイする。`wrangler.jsonc`には画像専用Workerの入口とASSETS binding、`run_worker_first`の画像パスを設定済み。
5. `keep_vars: true`により既存のダッシュボード変数を保持する。ただしビルド変数と実行時変数は別に設定する。

手元から反映する場合（URLは自分の既存API URLを指定）：

```sh
cd /home/koputa415/hackathon-frontend
export VITE_API_BASE_URL=https://YOUR_API_HOST
export VITE_ITEM_IMAGE_BASE_URL=/images
npm run test:cdn
npm run lint
npm run build
npx wrangler deploy --var IMAGE_ORIGIN_BASE_URL:$VITE_API_BASE_URL
```

以後のGit連携ビルドでもCDNを使うには、手順2のビルド変数をCloudflare側にも保存する。
公開URL・既存Worker名はそのまま利用し、別のバケットやWorkerは作らない。

## 本番での完了確認

1. 公開サイトの商品詳細を開く。ブラウザの開発者ツールのNetworkで画像のリクエストを選ぶ。
2. Request URLがCloudflareの`/images/items/{id}/image`で、200・画像のContent-Typeとなることを確認する。
3. 同じURLへもう一度アクセスし`X-Image-Cache: HIT`を確認する。ブラウザのキャッシュは無効化してよい。
4. 詳細を再読み込みし、画像が表示されることを確認する。一覧と再出品の写真引き継ぎも確認する。
5. 存在しない画像の404は`Cache-Control: no-store`となることを確認する。

ローカルでのHITだけで本番完了とは判定しない。CloudflareのCache APIはデータセンター単位であり、
別の地点で最初にアクセスした場合はMISSになり得る。対象のworkers.devでHITが得られない場合は、
Cache APIが機能する独自ドメインを当該Workerへ接続し、画像ベースURLをそのドメインへ変更して再確認する。

## 検証記録

- T9-1：PostgreSQLとGCS互換環境のpytest334件、出品ブラウザ11ケース成功。
- T9-2：CDN単体テスト、Cloudflareローカル実行環境でのキャッシュHIT・CORS・一覧・詳細・再読み込みを確認。
- CDN経由で写真を引き継ぐ再出品を含むGemini補助機能のブラウザ11ケース成功。実Geminiはテスト用応答。
- 本番用`/images`設定でビルドし、Wranglerのdry-run成功。本番の表示とHITは反映後に確認する。

## 参照

- [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
- [Static Assets bindingとrun_worker_first](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Wrangler keep_vars](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloud Storageクライアント](https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.client.Client)
