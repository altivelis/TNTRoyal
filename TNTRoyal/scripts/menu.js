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
          `初期爆弾数: ${roleList[res.selection].initBomb}\n` +
          `最大爆弾数: ${roleList[res.selection].maxBomb}\n` +
          `初期爆風: ${roleList[res.selection].initPower}\n` +
          `最大爆風: ${roleList[res.selection].maxPower}\n` +
          `初期移動速度: ${roleList[res.selection].initSpeed}\n` +
          `最大移動速度: ${roleList[res.selection].maxSpeed}`
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