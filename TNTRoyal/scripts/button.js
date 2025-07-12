/**
 * このファイルはロビーの各ボタン（スタート・観戦・ステージ選択・能力選択・設定・説明）の処理を担当します。
 * プレイヤーが特定座標のブロックを操作した際に、対応するメニューや機能を呼び出します。
 */

import * as mc from "@minecraft/server";
import { startGame } from "./main";
import { openRoleSelect, openSettingMenu, openStageSelect, openWorldDescription } from "./menu";

/**
 * ロビー内の各ボタン座標に応じて、対応する処理を実行します。
 * - スタートボタン: ゲーム開始
 * - 観戦ボタン: 観戦モード切替
 * - ステージ選択: ステージ選択メニュー表示
 * - 能力選択: 能力選択メニュー表示
 * - 設定: 設定メニュー表示
 * - ワールド説明: ワールド説明メニュー表示
 */
mc.world.beforeEvents.playerInteractWithBlock.subscribe(data=>{
  let {isFirstEvent, block, player} = data;
  if(!isFirstEvent) return;
  if(`${block.location.x} ${block.location.y} ${block.location.z}` == "-1 -58 8") {
    //スタートボタン
    data.cancel = true;
    if(!player.hasTag("host")) {
      player.sendMessage("§cホストのみがゲームを開始できます。");
      return;
    }
    mc.system.run(()=> {
      startGame();
    })
  }
  if(`${block.location.x} ${block.location.y} ${block.location.z}` == "1 -58 8") {
    //観戦ボタン
    data.cancel = true;
    mc.system.run(()=> {
      if(player.hasTag("spectator")) {
        player.removeTag("spectator");
        player.sendMessage("§a観戦モードを解除しました。");
      }
      else {
        player.addTag("spectator");
        player.sendMessage("§a観戦モードになりました。");
      }
    })
  }
  if(`${block.location.x} ${block.location.y} ${block.location.z}` == "-5 -58 8") {
    //ステージ選択ボタン
    data.cancel = true;
    mc.system.run(()=>{
      openStageSelect(player);
    })
  }
  if(`${block.location.x} ${block.location.y} ${block.location.z}` == "3 -58 8") {
    //能力選択ボタン
    data.cancel = true;
    mc.system.run(()=>{
      openRoleSelect(player);
    })
  }
  if(`${block.location.x} ${block.location.y} ${block.location.z}` == "-3 -58 8") {
    //設定メニューボタン
    data.cancel = true;
    if(!player.hasTag("host")) {
      player.sendMessage("§cホストのみが設定を変更できます。");
      return;
    }
    mc.system.run(()=>{
      openSettingMenu(player);
    })
  }
  if(`${block.location.x} ${block.location.y} ${block.location.z}` == "-1 -59 3") {
    //ワールド説明メニュー
    data.cancel = true;
    mc.system.run(()=>{
      openWorldDescription(player);
    })
  }
})
