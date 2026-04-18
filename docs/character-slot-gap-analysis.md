# Character Slot Gap Analysis

## 1. 目的

- character1 / character2 の実装差分を整理する
- slot 化に向けた統一ポイントを明確にする
- 動的スロット化前に解消すべき項目を洗い出す

---

## 2. 現状まとめ

- slot 定義（characterSlotDefs）導入済み
- last selected portrait は helper 化済み
- source 正規化は共通化済み
- state build / restore は slot ベースに整理済み

👉 基本的な state 処理は slot ベースに移行済み

---

## 3. 差分一覧

### 3.1 state / key 差分

| 項目 | char1 | char2 | 状態 | 備考 |
|---|---|---|---|---|
| enabled default | 有効 | 無効 | 差分あり | 意図的仕様 |
| cache_key | あり | character2_cache_key | 差分あり | prefix違い |
| portrait_filename | あり | character2_portrait_filename | 差分あり | prefix違い |
| last_selected_portrait | あり | character2_last_selected_portrait | parity済み | helper化済 |

---

### 3.2 UI / DOM 差分

| 項目 | 差分 | 状態 | 備考 |
|---|---|---|---|
| id / name | character1_* / character2_* | 差分あり | slot化時に抽象化対象 |
| select option | portrait は optionに存在しない | 共通 | datasetで保持 |
| ラベル表示 | 空option書き換え | 共通 | 特殊仕様 |

---

### 3.3 処理ロジック差分

| 項目 | 状態 | 備考 |
|---|---|---|
| normalize | 共通化済み | slot化完了 |
| state build | 共通化済み | slot化完了 |
| state restore | 共通化済み | slot化完了 |
| preview更新 | 概ね共通 | 再確認 |
| イベント処理 | 一部slot非対応 | 要整理 |

---

### 3.4 残課題

- appendCharacterState(formData) が slot 非対応
- commitInitialPortraitSelection が char1/char2 分岐あり
- 一部 event handler に slot 分岐が残る
- layout key prefix が slot 固定（将来拡張に弱い）

---

## 4. 次にやるべきこと

優先度順:

### 高
- appendCharacterState の slot 化
- event handler の slot 統一

### 中
- layout key prefix の抽象化
- state key の内部抽象化（外部互換維持）

### 低
- HTML id / name の完全統一（大規模変更）

---

## 5. 動的スロット化に向けた前提

- slot は配列で管理する
- state は slot ごとの構造を持つ
- UI は slot 数に依存しない構造へ

---

## 6. 結論

- 現状は「2スロット固定の疑似スロット構造」
- 動的化は十分現実的な状態
- ただし event / UI 周りの整理が必要

---

## 7. 次の実装ブランチ計画

### feature/character-slot-next

対象:

- appendCharacterState の slot 化
- event handler の slot 統一

スコープ:

- src/static/js/scene.js のみ
- HTML/CSS は触らない
- state key は変更しない

完了条件:

- characterSlots.forEach で state append が完結する
- slot === 1 / 2 分岐がさらに減る