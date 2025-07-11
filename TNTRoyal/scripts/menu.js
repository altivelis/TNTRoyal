/**
 * このファイルはUIメニュー（ホーム・ステージ選択・能力選択・設定・説明）の表示と処理を担当します。
 * プレイヤーが各種メニューを操作する際の画面遷移・設定変更などを実装しています。
 */

import * as mc from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import { startGame } from "./main";
import { stage } from "./const";
import { roleList } from "./role";

mc.system.afterEvents.scriptEventReceive.subscribe(data=>{
  if(data.id == "tnt:menu"){
    // メニューを開く
    openMenu(data.sourceEntity);
  }
})

function openMenu(player) {
  const menu_home = new ui.ActionFormData();
  menu_home.title("ホームメニュー")
    .body("ゲームの開始・設定ができます")
    .button("ゲームを開始する")
    .button("設定");
  menu_home.show(player).then(res=>{
    if(res.canceled) return;
    if(res.selection == 0){
      startGame();
    }
    else if(res.selection == 1){
      // 設定
    }
  })
}

/**
 * ステージ選択メニューを開く
 * プレイヤーがステージを選択できる画面を表示します。
 * @param {mc.Player} player 
 */
export function openStageSelect(player) {
  if(mc.world.getDynamicProperty("status") != 0) return;
  const menu_stage = new ui.ActionFormData();
  menu_stage.title("ステージ選択")
    .body("ステージを選択してください");
  stage.forEach(s=>{
    menu_stage.button(s.name, s.icon);
  })
  menu_stage.show(player).then(res=>{
    if(res.canceled) return;
    if(mc.world.getDynamicProperty("status") != 0) return;
    if(res.selection < stage.length){
      mc.world.sendMessage(`${player.name}がステージ§e${stage[res.selection].name}§rを選択しました`);
      mc.world.setDynamicProperty("stage", res.selection);
      return;
    }
  })
}


/**
 * 能力選択メニューを開く
 * プレイヤーが能力（ロール）を選択できる画面を表示します。
 * @param {mc.Player} player
 */
export function openRoleSelect(player) {
  if(mc.world.getDynamicProperty("status") != 0) return;
  const menu_role = new ui.ActionFormData();
  menu_role.title("能力選択")
    .body("能力を選択してください");
  roleList.forEach(r=>{
    menu_role.button(r.name, r.icon);
  })
  menu_role.show(player).then(res=>{
    if(res.canceled) return;
    if(mc.world.getDynamicProperty("status") != 0) return;
    if(res.selection < roleList.length){
      const role_form = new ui.MessageFormData();
      role_form.title("能力確認")
        .body(
          `§l§e${roleList[res.selection].name}§r\n\n` +
          `§l§cTNT個数§r§l: §a${roleList[res.selection].bomb.init}§r§l/§d${roleList[res.selection].bomb.max}§r\n` +
          `§l§6火力§r§l: §a${roleList[res.selection].power.init}§r§l/§d${roleList[res.selection].power.max}§r\n` +
          `§l§bスピード§r§l: §a${roleList[res.selection].speed.init}§r§l/§d${roleList[res.selection].speed.max}§r\n` +
          `\n§l<<§d特殊アイテム§r§l>>§r\n` +
          `§l§9貫通TNT§r§l: ${roleList[res.selection].blue.init ? "§a所持" : roleList[res.selection].blue.able ? "§e有効" : "§7無効"}§r\n` +
          `§l§cキック§r§l: ${roleList[res.selection].kick.init ? "§a所持" : roleList[res.selection].kick.able ? "§e有効" : "§7無効"}§r\n` +
          `§l§bパンチ§r§l: ${roleList[res.selection].punch.init ? "§a所持" : roleList[res.selection].punch.able ? "§e有効" : "§7無効"}§r\n`
        )
        .button2("選択")
        .button1("キャンセル");
      role_form.show(player).then(res2=>{
        if(res2.canceled) return;
        if(res2.selection == 1){
          player.setDynamicProperty("role", res.selection);
          player.sendMessage(`§a能力を§e${roleList[res.selection].name}§aに設定しました`);
        }else{
          openRoleSelect(player);
        }
      })
      return;
    }
  })
}

/**@type {ui.ModalFormData} */
let menu_setting;

mc.world.afterEvents.worldLoad.subscribe(()=>{
  menu_setting = new ui.ModalFormData();
  menu_setting.title("ゲーム設定")
    .slider("§l§e制限時間", 70, 300, {valueStep: 10, defaultValue: mc.world.getDynamicProperty("time")});
})

/**
 * ゲーム設定メニューを開く
 * 制限時間などのゲーム設定を変更できる画面を表示します。
 * @param {mc.Player} player 
 */
export function openSettingMenu(player) {
  if(mc.world.getDynamicProperty("status") != 0) return;
  menu_setting.show(player).then(res=>{
    if(res.canceled) return;
    if(mc.world.getDynamicProperty("status") != 0) return;
    const time = res.formValues[0];
    mc.world.setDynamicProperty("time", time);

    mc.world.sendMessage(
      `§b===ゲーム設定変更===\n` +
      `§e制限時間§r§l: §a${time}秒§r\n` +
      `§b===================`
    )
  })
}

/**
 * ワールド説明メニューを開く
 * ワールドの概要・注意事項・ルール・アイテム説明などを表示します。
 * @param {mc.Player} player
 */
export function openWorldDescription(player) {
  world_description_home.show(player).then(res=>{
    if(res.canceled) return;
    switch(res.selection) {
      case 0:
        // ワールド説明
        world_description_form.show(player).then(res2=>{
          if(res2.canceled) return;
          openWorldDescription(player);
        });
        break;
      case 1:
        // 注意事項
        world_precautions_form.show(player).then(res2=>{
          if(res2.canceled) return;
          openWorldDescription(player);
        });
        break;
      case 2:
        // ロビーの使い方
        world_how_to_use_lobby_form.show(player).then(res2=>{
          if(res2.canceled) return;
          openWorldDescription(player);
        });
        break;
      case 3:
        // ルール説明
        rule_form.show(player).then(res2=>{
          if(res2.canceled) return;
          openWorldDescription(player);
        });
        break;
      case 4:
        // 操作方法
        operation_form.show(player).then(res2=>{
          if(res2.canceled) return;
          openWorldDescription(player);
        });
        break;
      case 5:
        // アイテムの説明
        openItemDescription(player);
        break;
    }
  })
}

function openItemDescription(player) {
  item_description_form.show(player).then(res=>{
    if(res.canceled) return;
    if(res.selection < item_description_list.length){
      let form = new ui.MessageFormData();
      form.title("§l§cTNT Royale§r - アイテムの説明")
        .body(item_description_list[res.selection])
        .button1("§l§aホームに戻る")
        .button2("§l§c閉じる");
      form.show(player).then(res2=>{
        if(res2.canceled) return;
        if(res2.selection == 0) {
          openWorldDescription(player);
        }
        if(res2.selection == 1) {
          openItemDescription(player);
        }
      })
    }
    else {
      openWorldDescription(player);
    }
  })
}

/**@type {ui.ActionFormData} */
let world_description_home;

/**@type {ui.ActionFormData} */
let world_description_form;

/**@type {ui.ActionFormData} */
let world_precautions_form;

/**@type {ui.ActionFormData} */
let world_how_to_use_lobby_form;

/**@type {ui.ActionFormData} */
let rule_form;

/**@type {ui.ActionFormData} */
let operation_form;

/**@type {ui.ActionFormData} */
let item_description_form;

const item_description_list = [
  // TNT
  "§l§cTNT§r\n" +
  "同時に設置できるTNTの数を増やします。",
  // 火力アップ
  "§l§6火力アップ§r\n" +
  "TNTの爆風の届く範囲を広げます。",
  // スピード
  "§l§bスピード§r\n" +
  "プレイヤーの移動速度を上げます。",
  // ブレイズパウダー
  "§l§eブレイズパウダー§r\n" +
  "火力が最大まで上昇します。",
  // 貫通TNT
  "§l§9貫通TNT§r\n" +
  "設置するTNTが青くなり、ブロックを貫通して爆風が届くようになります。",
  // キック
  "§l§3キック§r\n" +
  "設置してあるTNTにぶつかることで、TNTを動かすことができます。\n" +
  "スニークすることで自由な位置で止めることができます。",
  // パンチ
  "§l§dパンチ§r\n" +
  "設置してあるTNTに向いている状態で、アイテムを使用するとTNTを3ブロック先に飛ばすことができます。",
  // ショット
  "§lショット§r\n" +
  "脱落した際に獲得し、外側からTNTを投げ込むために使用します。"
]

mc.world.afterEvents.worldLoad.subscribe(()=>{
  world_description_home = new ui.ActionFormData()
    .title("§l§cTNT Royale")
    .body("ようこそ、§l§cTNT Royale§rへ!\n")
    .button("§l§aワールド説明")
    .button("§l§c注意事項")
    .button("§l§dロビーの使い方")
    .button("§l§bルール説明")
    .button("§l§e操作方法")
    .button("§l§6アイテムの説明");

  world_description_form = new ui.ActionFormData()
    .title("§l§cTNT Royale§r - ワールド説明")
    .body("このワールドは大人気ゲーム「ボンバーマン」をMinecraftで遊べるように再現したマップです。\n" +
          "友達とみんなでワイワイ楽しんでいただけると嬉しいです。\n" +
          "・プレイ人数：2~4人\n" +
          "・プレイ時間：1~3分")
    .button("§l§aホームに戻る");

  world_precautions_form = new ui.ActionFormData()
    .title("§l§cTNT Royale§r - 注意事項")
    .body("§l§bゲーム開始前の注意事項§r\n" +
          "ゲームを始める前にすべてのプレイヤーが以下の設定を行ってください。\n" +
          "正常にゲームをプレイするために必要な設定です。\n" +
          "・§eこのワールドに付属しているリソースパックのダウンロード§r\n" +
          "・設定->操作設定->オートジャンプ §eオフ§r\n" +
          "・設定->ビデオ->視野 §e60~90度§r\n" +
          "\n" +
          "§l§cワールド利用の注意事項§r\n" +
          "このワールドデータ及びアドオン/リソースパックはaltivelisが著作権を有しております。\n" +
          "§c§l無断転載・再配布・改変したワールドの配布§rを禁止します。§r\n" +
          "ファイルの閲覧・引用・改変は自由に行っていただいて構いませんが、それによって生じたいかなる問題についても私は責任を負いかねます。"
    )
    .button("§l§aホームに戻る");

  world_how_to_use_lobby_form = new ui.ActionFormData()
    .title("§l§cTNT Royale§r - ロビーの使い方")
    .body("§l§bロビーの使い方§r\n" +
          "ロビーにある看板を使って様々な操作ができます。\n" +
          "・§l§aスタート§r\n" +
          "    ゲームを開始します。\n" +
          "・§l§7観戦者切り替え§r\n" +
          "    参加者と観戦者を切り替えます。\n" +
          "・§l§5ゲーム設定§r\n" +
          "    ゲームの設定を変更します。\n" +
          "・§l§e能力選択§r\n" +
          "    自分の初期/上限ステータスや使用可能アイテム等を変更します。\n" +
          "・§l§bステージ選択§r\n" +
          "    ゲームのステージを選択します。\n" +
          "\n" +
          "§lアスレチック§r\n" +
          "参加者の準備ができるまで、ロビーのアスレチックで遊ぶことができます。\n" +
          "かなり高難易度ですが、クリアすると…?")
    .button("§l§aホームに戻る");

  rule_form = new ui.ActionFormData()
    .title("§l§cTNT Royale§r - ルール説明")
    .body("§l§bルール説明§r\n" +
          "このゲームは、TNTを使って相手を倒すゲームです。\n" +
          "ブロックを壊してアイテムを入手し、最後の1人になることを目指します。\n" +
          "§l§eゲームの流れ§r\n" +
          "・参加者はステージの4隅に配置されます。\n" +
          "・ゲーム開始後、TNTを設置してブロックを壊します。\n" +
          "・ブロックを壊すと一定確率で自分を強化するアイテムがドロップします。\n" +
          "・アイテムを取ると同時にTNTを置くことができる数、爆風が届く範囲、移動速度などが強化されます。\n" +
          "・中には特殊な能力やアクションができるようになるアイテムもあります。\n" +
          "・自分のステータスは画面右で確認することができます。\n" +
          "・脱落すると外側に飛ばされ、外からTNTを投げ込んで他のプレイヤーに攻撃することができます。\n" +
          "・投げ込んだTNTで他のプレイヤーを倒すと、復活することができます。\n" +
          "・制限時間が1分を切ると、復活ができなくなり、外側から金床が降ってきてステージが狭まります。\n" +
          "・最後の1人になったプレイヤーが勝利となります。"
    )
    .button("§l§aホームに戻る");
    
  operation_form = new ui.ActionFormData()
    .title("§l§cTNT Royale§r - 操作方法")
    .body("§l§b操作方法§r\n" +
          "移動: §eWASDキーまたは左スティック§r\n" +
          "・TNTを置く: §eジャンプ§r\n" +
          "・特殊アイテムの使用: §eインベントリのアイテムを使用§r\n" +
          "・(キック時)TNTを止める: §eスニーク§r\n"
    )
    .button("§l§aホームに戻る");
  
  item_description_form = new ui.ActionFormData()
    .title("§l§cTNT Royale§r - アイテムの説明")
    .button("§l§cTNT", "textures/blocks/tnt_side.png")
    .button("§l§6火力アップ", "textures/gui/newgui/mob_effects/fire_resistance_effect.png")
    .button("§l§bスピード", "textures/gui/newgui/mob_effects/speed_effect.png")
    .button("§l§eブレイズパウダー", "textures/items/blaze_powder.png")
    .button("§l§9貫通TNT", "textures/altivelis/blue_tnt_texture_side")
    .button("§l§3キック", "textures/items/rabbit_foot.png")
    .button("§l§dパンチ", "textures/items/gold_axe.png")
    .button("§lショット", "textures/items/bow_pulling_2.png")
    .button("§l§aホームに戻る");
})
