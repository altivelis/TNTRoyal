import * as mc from "@minecraft/server";
import { startGame } from "./main";
import { openRoleSelect, openSettingMenu, openStageSelect, openWorldDescription } from "./menu";

mc.world.beforeEvents.playerInteractWithBlock.subscribe(data=>{
  let {isFirstEvent, block, player} = data;
  if(!isFirstEvent) return;
  if(`${block.location.x} ${block.location.y} ${block.location.z}` == "-1 -58 8") {
    //スタートボタン
    data.cancel = true;
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
