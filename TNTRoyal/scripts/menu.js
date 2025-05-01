import * as mc from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import { getCenter, myTimeout, setField } from "./lib";
import { stage } from "./main";

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
      if(mc.world.getDynamicProperty("status") != 0) return;
      // ゲームを開始する
      let member = mc.world.getPlayers();
      let tpmember = mc.world.getPlayers();
      if(tpmember.length > 4) return;
      tpmember.length = 4;
      //ランダムに並び替え
      for (let i = tpmember.length - 1; i >= 0; i--) {
        let rand = Math.floor(Math.random() * (i + 1));
        // 配列の要素の順番を入れ替える
        let tmpStorage = tpmember[i];
        tpmember[i] = tpmember[rand];
        tpmember[rand] = tmpStorage;
      }
      let index = mc.world.getDynamicProperty("stage");
      setField(mc.world.getDimension("overworld"), stage[index].start, stage[index].end, stage[index].block);
      mc.world.sendMessage(`ゲームを開始します`);
      mc.world.sendMessage(`ステージ: ${stage[index].name}`);
      mc.world.getPlayers().forEach(player=>{
        player.camera.fade({fadeColor: {red:0, green:0, blue:0}, fadeTime:{fadeInTime: 1, fadeOutTime: 1, holdTime: 0}});
      })
      myTimeout(20, ()=>{
        //プレイヤーをテレポート
        if(tpmember[0] != undefined) tpmember[0].teleport({x: stage[index].start.x+0.5, y: stage[index].start.y, z: stage[index].start.z+0.5}, {rotation:{x:0, y:0}});
        if(tpmember[1] != undefined) tpmember[1].teleport({x: stage[index].end.x+0.5, y: stage[index].start.y, z: stage[index].start.z+0.5}, {rotation:{x:0, y:0}});
        if(tpmember[2] != undefined) tpmember[2].teleport({x: stage[index].start.x+0.5, y: stage[index].start.y, z: stage[index].end.z+0.5}, {rotation:{x:0, y:0}});
        if(tpmember[3] != undefined) tpmember[3].teleport({x: stage[index].end.x+0.5, y: stage[index].start.y, z: stage[index].end.z+0.5}, {rotation:{x:0, y:0}});
        //プレイヤー初期化
        member.forEach(player=>{
          player.addTag("player");
          mc.world.scoreboard.getObjective("bomb").setScore(player, 1);
          mc.world.scoreboard.getObjective("power").setScore(player, 2);
          mc.world.scoreboard.getObjective("speed").setScore(player, 0);
          player.getComponent(mc.EntityInventoryComponent.componentId).container.clearAll();
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Camera, false);
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, false);
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, false);
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
          let center = getCenter(stage[index].start, stage[index].end);
          player.camera.setCamera("minecraft:free", {location: {...center, y:center.y+12, z:center.z-3}, facingLocation: center});
        })
        mc.world.setDynamicProperty("status", 1);
        myTimeout(20, ()=>{
          myTimeout(20, ()=>{
            mc.world.getPlayers().forEach(player=>{
              player.onScreenDisplay.setTitle("3");
            })
            myTimeout(20, ()=>{
              mc.world.getPlayers().forEach(player=>{
                player.onScreenDisplay.setTitle("2");
              })
              myTimeout(20, ()=>{
                mc.world.getPlayers().forEach(player=>{
                  player.onScreenDisplay.setTitle("1");
                })
                myTimeout(20, ()=>{
                  mc.world.setDynamicProperty("status", 2);
                  mc.world.getPlayers().forEach(player=>{
                    player.onScreenDisplay.setTitle("GO!");
                  })
                  member.forEach(player=>{
                    player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, true);
                  })
                })
              })
            })
          })
        })
      })
    }
    else if(res.selection == 1){
      // 設定
    }
  })
}