import * as ui from "@minecraft/server-ui";

const patchNoteTexts = [
  {
    version: "1.0.0",
    text: "基本的な機能の実装"
  },
  {
    version: "1.0.1",
    text: "・他のプレイヤーがどの能力を使用しているのかが分かりやすくなりました。\n" +
          "・開始時に自分の場所に矢印が出るようになりました。\n" +
          "・能力選択画面のアイコンがモチーフとしているモブの顔になりました。\n" +
          "・ゲーム設定で変更できる項目が増えました。（能力の許可、みそボンの有無）\n" +
          "・ゲーム開始とゲーム設定の変更はホストのみができるようになりました。\n" +
          "・参加人数が1人の状態でスタートしても、ゲームが終了しないようになりました。（1人で練習したいといった要望があったため）\n" +
          "・ランダムでステージを決めることができるようになりました。\n" +
          "・ブロックの端に乗ったとき、強制的に下に降ろされるように変更しました。"
  },
  {
    version: "1.0.2",
    text: "§cホストの情報が消えてしまい、ゲームが始められない問題を修正しました。"
  },
  {
    version: "1.0.3",
    text: "・新能力「クモ」を追加しました。\n" +
          "・新アイテム「鈍足」を追加しました。\n" +
          "・TNT個数管理の処理方法を見直しました。\n" +
          "・「パンチ」アイテムの持ち方を斧と同じように変更しました。\n" +
          "・ステージ名を日本語表記に変更しました。\n" +
          "・パッチノートを表示するボタンを追加しました。"
  },
  {
    version: "1.0.4",
    text: "・新ステージ「エンド要塞」を追加しました。\n" +
          "・新能力「エンダーマン」を追加しました。\n" +
          "・プレイヤーがワールドを抜けた際に発生する可能性のあった不具合を修正しました。\n" +
          "・パッチノートのボタンの順番が特定条件下において逆転してしまう不具合を修正しました。"
  }
].reverse(); // 最新のパッチノートが一番上に来るようにする

/**
 * パッチノートを開く
 * @param {mc.Player} player 
 */
export function openPatchNoteForm(player) {
  const form1 = new ui.ActionFormData()
    .title("§l§eパッチノート§r");
  patchNoteTexts.forEach(note=>{
    form1.button(`§lv${note.version}`);
  });

  form1.show(player).then(res => {
    if (res.canceled) return;

    const selectedNote = patchNoteTexts[res.selection];
    const form2 = new ui.ActionFormData()
      .title(`§l§eパッチノート v${selectedNote.version}§r`)
      .body(selectedNote.text)
      .button("閉じる");
    form2.show(player).then(res2 => {
      if (res2.canceled) return;
      // 再度パッチノートを開くためのフォームを表示
      openPatchNoteForm(player);
    })
  });
}