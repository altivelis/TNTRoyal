import * as mc from "@minecraft/server";
import { startGame } from "./main";

mc.world.beforeEvents.playerInteractWithBlock.subscribe(data=>{
  let {isFirstEvent, block} = data;
  if(!data.isFirstEvent) return;
  if(`${block.location.x} ${block.location.y} ${block.location.z}` == "-1 -58 8") {
    //スタートボタン
    data.cancel = true;
    mc.system.run(()=> {
      startGame();
    })
  }
})