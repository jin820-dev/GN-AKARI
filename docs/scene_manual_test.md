# Scene 手動テストチェックリスト

scene の state 管理や gallery から scene への遷移まわりを変更した後に、このリストを実行してください。現時点ではこれらの確認は手動で行います。自動スモークテストでは、主要な Flask route が表示できることだけを確認します。

## 準備

- Flask アプリをローカルで起動します。
- Portrait Gallery に少なくとも 1 件の画像を用意します。この手順では、その画像を `A` と呼びます。
- scene 画面の Preview select で選べる Preview を少なくとも 1 件用意します。この手順では、その Preview を `B` と呼びます。

## 確認手順

1. `/gallery` を開きます。
2. Portrait Gallery で portrait `A` の `使用する` をクリックします。
3. ブラウザが `/scene` へ移動することを確認します。
4. キャラ1に portrait `A` が使用されていることを確認します。
5. キャラ1設定の Preview select の空 option に `A` が表示されていることを確認します。
6. 右側 Preview の `使用中: キャラ1` ラベルに `A` が表示されていることを確認します。
7. キャラ1設定で Preview `B` を選択します。
8. 使用中のキャラ1画像が Preview `B` に切り替わることを確認します。
9. 右側 Preview の `使用中: キャラ1` ラベルに Preview `B` が表示されていることを確認します。
10. `/gallery` など、別のページへ移動します。
11. もう一度 `/scene` に戻ります。
12. 使用中のキャラ1が引き続き Preview `B` のままであることを確認します。
13. 古い URL query から portrait `A` が再注入されていないことを確認します。
14. キャラ1設定の Preview select を開き、`A` と表示されている空 option を選択します。
15. 使用中のキャラ1が portrait `A` に戻ることを確認します。
16. 実際に表示されている画像、Preview select の表示、右側の `使用中` ラベルが一致していることを確認します。

## 自動スモークテストの実行コマンド

```bash
.venv/bin/python -m unittest discover -s tests
```
