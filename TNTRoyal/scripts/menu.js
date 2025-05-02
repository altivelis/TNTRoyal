import * as mc from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import { getCenter, myTimeout, setField } from "./lib";
import { stage, startGame } from "./main";

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