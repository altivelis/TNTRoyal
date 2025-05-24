import * as mc from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import { startGame } from "./main";
import { stage } from "./const";
import { roleList } from "./role";

const menu_home = new ui.ActionFormData();
menu_home.title("ホームメニュー")
  .body("ゲームの開始・設定ができます")
  .button("ゲームを開始する")
  .button("設定");

mc.system.afterEvents.scriptEventReceive.subscribe(data=>{
  if(data.id == "tnt:menu"){
    // メニューを開く
    openMenu(data.sourceEntity);
  }
})

function openMenu(player) {
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
 * 
 * @param {mc.Player} player 
 */
export function openStageSelect(player) {
  if(mc.world.getDynamicProperty("status") != 0) return;
  const menu_stage = new ui.ActionFormData();
  menu_stage.title("ステージ選択")
    .body("ステージを選択してください");
  stage.forEach(s=>{
    menu_stage.button(s.name);
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
 * @param {mc.Player} player
 */
export function openRoleSelect(player) {
  if(mc.world.getDynamicProperty("status") != 0) return;
  const menu_role = new ui.ActionFormData();
  menu_role.title("能力選択")
    .body("能力を選択してください");
  roleList.forEach(r=>{
    menu_role.button(r.name);
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