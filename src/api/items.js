import { ApiError, apiUrl } from './client.js'
import { authenticatedRequest } from './session.js'

const fieldMessages = {
  title: '商品名は空白以外の1〜100文字で入力してください。',
  description: '説明は空白以外の1〜2000文字で入力してください。',
  category: 'カテゴリを5つの趣味から選んでください。',
  condition: '商品の状態を選んでください。',
  price: '価格は1〜999999999円の整数で入力してください。',
  image: '画像を読み取れませんでした。壊れていないJPEG・PNG・WebP画像を選んでください。',
}

export async function createItem(fields, image, signal) {
  const body = new FormData()
  body.set('item', JSON.stringify(fields))
  body.set('image', image)
  try {
    const item = await authenticatedRequest('/items/with-image', { method: 'POST', body, signal })
    if (!item || !Number.isSafeInteger(item.id) || item.id <= 0 || item.title !== fields.title) {
      throw new ApiError(0, '出品結果を確認できませんでした。重ねて送信する前に保存状況を確認してください。')
    }
    if (item.image_path !== `/items/${item.id}/image`) {
      throw new ApiError(0, '出品画像の応答を確認できませんでした。保存状況を確認してください。')
    }
    return { ...item, imageUrl: apiUrl(item.image_path) }
  } catch (error) {
    if (error.issues?.length) {
      error.fieldErrors = Object.fromEntries(error.issues.map(({ field }) => [field, fieldMessages[field]]))
    }
    throw error
  }
}
