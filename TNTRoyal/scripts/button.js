import * as mc from "@minecraft/server";
import { startGame } from "./main";

mc.world.beforeEvents.playerInteractWithBlock.subscribe(data=>{
  let {isFirstEvent, block, player} = data;
  if(!data.isFirstEvent) return;
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
})