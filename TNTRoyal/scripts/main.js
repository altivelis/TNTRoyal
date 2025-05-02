import * as mc from "@minecraft/server";
import { getCenter, explode_block, explode_particle, clearField, myTimeout, setField } from "./lib.js";
import "./menu.js";

export const roby = {x:0.5, y:-58.5, z:0.5};
export const stage = [
  {
    name: "village",
    start: {x:-6, y:-59, z:-69},
    end: {x:6, y:-59, z:-59},
    block: "minecraft:brick_block",
  }
]

export const breakable_block = [
  "minecraft:brick_block",
]

export const through_block = [
  "minecraft:air",
]


mc.system.afterEvents.scriptEventReceive.subscribe(data=>{
  if(data.id == "tnt:init"){
    mc.world.setDynamicProperty("stage", 0);
    mc.world.setDynamicProperty("status", 0);
  }
  if(data.id == "tnt:set_camera"){
    //data.sourceEntity.camera.setCamera("minecraft:fixed_boom", {rotation: {x: 75, y: 90}, entityOffset: {x:0, y:10, z:-5}});
    let index = mc.world.getDynamicProperty("stage");
    let center = getCenter(stage[index].start, stage[index].end);
    data.sourceEntity.camera.setCamera("minecraft:free", {location: {...center, y:center.y+12, z:center.z-3}, facingLocation: center})
    data.sourceEntity.teleport(data.sourceEntity.location, {rotation: {x:0, y:0}});
    data.sourceEntity.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Camera, false);
  }
  if(data.id == "tnt:clear_camera"){
    data.sourceEntity.camera.clear();
    data.sourceEntity.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Camera, true);
  }
  if(data.id == "tnt:set_permission"){
    if(data.sourceEntity instanceof mc.Player){
      data.sourceEntity.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, false);
      data.sourceEntity.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, false);
    }
  }
  if(data.id == "tnt:clear_permission"){
    if(data.sourceEntity instanceof mc.Player){
      data.sourceEntity.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, true);
      data.sourceEntity.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, true);
    }
  }
})

mc.system.runInterval(()=>{
  mc.world.getDimension("overworld").getEntities({type: "minecraft:tnt"}).forEach(tnt=>{
    if(tnt.getDynamicProperty("pos") == undefined) return;
    tnt.teleport(tnt.getDynamicProperty("pos"));
  })
  mc.world.getPlayers().forEach(player=>{
    if(!mc.world.scoreboard.getObjective("bomb").getParticipants().includes(player.scoreboardIdentity)) {
      mc.world.scoreboard.getObjective("bomb").setScore(player, 1);
    }
    if(!mc.world.scoreboard.getObjective("power").getParticipants().includes(player.scoreboardIdentity)) {
      mc.world.scoreboard.getObjective("power").setScore(player, 2);
    }
    if(!mc.world.scoreboard.getObjective("speed").getParticipants().includes(player.scoreboardIdentity)) {
      mc.world.scoreboard.getObjective("speed").setScore(player, 0);
    }
    if(mc.world.getDynamicProperty("status") == 2) {
      //終了判定
      if(mc.world.getPlayers({tags:["player"], excludeTags:["dead"]}).length <= 1) {
        endGame();
      }
      //移動速度
      let moveComp = player.getComponent(mc.EntityMovementComponent.componentId);
      moveComp.setCurrentValue(moveComp.defaultValue + 0.01 * mc.world.scoreboard.getObjective("speed").getScore(player));

      //ステータス表示
      if(player.hasTag("player")){
        player.onScreenDisplay.setActionBar(
          `TNT個数: ${mc.world.scoreboard.getObjective("bomb").getScore(player)} ` +
          `火力: ${mc.world.scoreboard.getObjective("power").getScore(player)} ` +
          `スピード: ${mc.world.scoreboard.getObjective("speed").getScore(player)}`
        )
      }
    }

    //アイテム取得
    let item = player.dimension.getEntities({location:{x:Math.floor(player.location.x), y:Math.floor(player.location.y), z:Math.floor(player.location.z)}, volume:{x:0, y:0, z:0}, type: "altivelis:marker"});
    if(item.length > 0) {
      item.forEach(entity => {
        switch(entity.getTags()[0]){
          case "bomb":
            if(mc.world.scoreboard.getObjective("bomb").getScore(player) < 8) {
              mc.world.scoreboard.getObjective("bomb").addScore(player, 1);
            }
            break;
          case "power":
            if(mc.world.scoreboard.getObjective("power").getScore(player) < 8) {
              mc.world.scoreboard.getObjective("power").addScore(player, 1);
            }
            break;
          case "speed":
            if(mc.world.scoreboard.getObjective("speed").getScore(player) < 8) {
              mc.world.scoreboard.getObjective("speed").addScore(player, 1);
            }
            break;
        }
        entity.remove();
      })
    }
  })

  //パーティクル
  mc.world.getDimension("overworld").getEntities({type: "altivelis:marker"}).forEach(marker=>{0
    switch(marker.getTags()[0]){
      case "bomb":
        marker.dimension.spawnParticle("altivelis:tnt_particle", marker.location);
        break;
      case "power":
        marker.dimension.spawnParticle("altivelis:power_particle", marker.location);
        break;
      case "speed":
        marker.dimension.spawnParticle("altivelis:speed_particle", marker.location);
        break;
    }
  })
})

//ゲーム開始処理
export function startGame(){
  if(mc.world.getDynamicProperty("status") != 0) return;
  // ゲームを開始する
  let member = mc.world.getPlayers();
  let tpmember = member.concat();
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
    player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Hide, [mc.HudElement.Health, mc.HudElement.Hotbar, mc.HudElement.Hunger, mc.HudElement.ProgressBar]);
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
          player.onScreenDisplay.setTitle("§l§a3", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 0});
          player.playSound("random.wood_click", {location: player.location, volume: 10});
        })
        myTimeout(20, ()=>{
          mc.world.getPlayers().forEach(player=>{
            player.onScreenDisplay.setTitle("§l§a2", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 0});
            player.playSound("random.wood_click", {location: player.location, volume: 10});
          })
          myTimeout(20, ()=>{
            mc.world.getPlayers().forEach(player=>{
              player.onScreenDisplay.setTitle("§l§a1", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 0});
              player.playSound("random.wood_click", {location: player.location, volume: 10});
            })
            myTimeout(20, ()=>{
              mc.world.setDynamicProperty("status", 2);
              mc.world.getPlayers().forEach(player=>{
                player.onScreenDisplay.setTitle("§l§bGO!", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 0});
                player.playSound("mob.wither.spawn", {location: player.location, volume: 10});
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

//終了処理
function endGame(){
  mc.world.setDynamicProperty("status", 3);
  let member = mc.world.getPlayers({tags:["player"]});
  let winner = member.filter(player=>{return player.hasTag("dead") == false})[0];
  if(winner != undefined) {
    winner.teleport(winner.location, {facingLocation: {...winner.location, y: winner.location.y+5, z: winner.location.z-2}});
    winner.dimension.playSound("random.totem", {location: winner.location, volume: 10});
    mc.world.sendMessage(`${winner.nameTag}の勝利!`);
    mc.world.getPlayers().forEach(player=>{
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
      player.camera.setCamera("minecraft:free", {location: {...winner.location, y:winner.location.y+5, z:winner.location.z-1}, facingLocation: winner.location, easeOptions: {easeTime:1, easeType: mc.EasingType.OutCirc}});
      player.onScreenDisplay.setTitle("§l§bWINNER\n\n\n", {fadeInDuration: 10, stayDuration: 20, fadeOutDuration: 10});
      player.onScreenDisplay.updateSubtitle(winner.nameTag)
    })
  }
  myTimeout(40, ()=>{
    member.forEach(player=>{
      player.removeTag("player");
      player.removeTag("dead");
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Camera, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, true);
      player.getComponent(mc.EntityInventoryComponent.componentId).container.clearAll();
      player.camera.clear();
      player.teleport(roby);
      player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Reset, [mc.HudElement.Health, mc.HudElement.Hotbar, mc.HudElement.Hunger, mc.HudElement.ProgressBar]);
    })
    mc.world.getDimension("overworld").getEntities({type: "altivelis:marker"}).forEach(entity=>{
      entity.remove();
    })
    clearField(mc.world.getDimension("overworld"), stage[mc.world.getDynamicProperty("stage")].start, stage[mc.world.getDynamicProperty("stage")].end);
    mc.world.setDynamicProperty("status", 0);
  })
}


//爆発処理
mc.world.beforeEvents.explosion.subscribe(data=>{
  data.cancel = true;
  let pos = data.source.location;
  let owner = data.source?.owner;
  let power = data.source.getDynamicProperty("power");
  mc.system.run(()=>{
    owner.setDynamicProperty("bomb", owner.getDynamicProperty("bomb")-1);
    data.dimension.playSound("random.explode", pos, {volume: 4});
    if(power >= 8) {
      mc.world.getDimension("overworld").runCommand(`camerashake add @a 0.3 0.2 positional`);
    }
    // x+
    explode_particle(data.dimension, pos);
    for(let i=1; i<=power; i++){
      if(through_block.includes(data.dimension.getBlock({...pos, x: pos.x+i}).typeId) &&
      data.dimension.getEntities({excludeTypes:["minecraft:player"], location: {x:Math.floor(pos.x), y:Math.floor(pos.y), z:Math.floor(pos.z)}, volume:{x:0, y:0, z:0}}).length == 0){
        explode_particle(data.dimension, {...pos, x: pos.x+i});
      }
      else{
        explode_block(data.dimension, {...pos, x: pos.x+i});
        break;
      }
    }
    // x-
    for(let i=1; i<=power; i++){
      if(through_block.includes(data.dimension.getBlock({...pos, x: pos.x-i}).typeId) &&
      data.dimension.getEntities({excludeTypes:["minecraft:player"], location: {x:Math.floor(pos.x), y:Math.floor(pos.y), z:Math.floor(pos.z)}, volume:{x:0, y:0, z:0}}).length == 0){
        explode_particle(data.dimension, {...pos, x: pos.x-i});
      }
      else{
        explode_block(data.dimension, {...pos, x: pos.x-i});
        break;
      }
    }
    // z+
    for(let i=1; i<=power; i++){
      if(through_block.includes(data.dimension.getBlock({...pos, z: pos.z+i}).typeId) &&
      data.dimension.getEntities({excludeTypes:["minecraft:player"], location: {x:Math.floor(pos.x), y:Math.floor(pos.y), z:Math.floor(pos.z)}, volume:{x:0, y:0, z:0}}).length == 0){
        explode_particle(data.dimension, {...pos, z: pos.z+i});
      }
      else{
        explode_block(data.dimension, {...pos, z: pos.z+i});
        break;
      }
    }
    // z-
    for(let i=1; i<=power; i++){
      if(through_block.includes(data.dimension.getBlock({...pos, z: pos.z-i}).typeId) &&
      data.dimension.getEntities({excludeTypes:["minecraft:player"], location: {x:Math.floor(pos.x), y:Math.floor(pos.y), z:Math.floor(pos.z)}, volume:{x:0, y:0, z:0}}).length == 0){
        explode_particle(data.dimension, {...pos, z: pos.z-i});
      }
      else{
        explode_block(data.dimension, {...pos, z: pos.z-i});
        break;
      }
    }
    // y-
    for(let i=1; i<=power; i++){
      if(through_block.includes(data.dimension.getBlock({...pos, y: pos.y-i}).typeId) &&
      data.dimension.getEntities({excludeTypes:["minecraft:player"], location: {x:Math.floor(pos.x), y:Math.floor(pos.y), z:Math.floor(pos.z)}, volume:{x:0, y:0, z:0}}).length == 0){
        explode_particle(data.dimension, {...pos, y: pos.y-i});
      }
      else{
        explode_block(data.dimension, {...pos, y: pos.y-i});
        break;
      }
    }
  })
})

//テスト用tnt設置処理
mc.world.afterEvents.itemUse.subscribe(data=>{
  let {source, itemStack} = data;
  if(data.source.getGameMode() != mc.GameMode.adventure) return;
  if(itemStack.typeId != "minecraft:tnt") return;
  if(source.getDynamicProperty("bomb") != undefined && source.getDynamicProperty("bomb") >= mc.world.scoreboard.getObjective("bomb").getScore(source)) return;
  if(source.dimension.getEntities({location: source.location, maxDistance:0.5, type:"minecraft:tnt"}).length > 0) return;
  let pos = source.location;
  // mc.world.sendMessage(`x: ${Math.floor(pos.x)}, y: ${Math.floor(pos.y)}, z: ${Math.floor(pos.z)}`);
  let tnt = source.dimension.spawnEntity("minecraft:tnt", {x: Math.floor(pos.x)+0.5, y: Math.floor(pos.y), z: Math.floor(pos.z)+0.5});
  tnt.setDynamicProperty("pos", {x: Math.floor(pos.x)+0.5, y: Math.floor(pos.y), z: Math.floor(pos.z)+0.5});
  tnt.owner = source;
  tnt.setDynamicProperty("power", mc.world.scoreboard.getObjective("power").getScore(source));
  if(source.getDynamicProperty("bomb") == undefined) source.setDynamicProperty("bomb", 1);
  else source.setDynamicProperty("bomb", source.getDynamicProperty("bomb")+1);
})

//ボタン入力処理
mc.world.afterEvents.playerButtonInput.subscribe(data=>{
  if(mc.world.getDynamicProperty("status") != 2) return;
  let player = data.player;
  if(player.hasTag("dead")) return;
  if(player.getDynamicProperty("bomb") != undefined && player.getDynamicProperty("bomb") >= mc.world.scoreboard.getObjective("bomb").getScore(player)) return;
  if(player.dimension.getEntities({location: player.location, maxDistance:0.5, type:"minecraft:tnt"}).length > 0) return;
  let pos = player.location;
  let tnt = player.dimension.spawnEntity("minecraft:tnt", {x: Math.floor(pos.x)+0.5, y: Math.floor(pos.y), z: Math.floor(pos.z)+0.5});
  tnt.setDynamicProperty("pos", {x: Math.floor(pos.x)+0.5, y: Math.floor(pos.y), z: Math.floor(pos.z)+0.5});
  tnt.owner = player;
  tnt.setDynamicProperty("power", mc.world.scoreboard.getObjective("power").getScore(player));
  tnt.dimension.playSound("fire.ignite", {location: tnt.location, volume: 10});
  if(player.getDynamicProperty("bomb") == undefined) player.setDynamicProperty("bomb", 1);
  else player.setDynamicProperty("bomb", player.getDynamicProperty("bomb")+1);
}, {buttons: [mc.InputButton.Jump], state: mc.ButtonState.Pressed})

mc.system.afterEvents.scriptEventReceive.subscribe(data=>{
  if(data.id == "tnt:village_init"){
    let index = mc.world.getDynamicProperty("stage");
    let dimension = mc.world.getDimension("overworld");
    clearField(dimension, stage[index].start, stage[index].end);
    for(let x=stage[index].start.x; x<=stage[index].end.x; x++){
      for(let z=stage[index].start.z; z<=stage[index].end.z; z++){
        if((Math.min(stage[index].start.x, stage[index].end.x)+1 >= x || Math.max(stage[index].start.x, stage[index].end.x)-1 <= x )
          && (Math.min(stage[index].start.z, stage[index].end.z)+1 >= z || Math.max(stage[index].start.z, stage[index].end.z)-1 <= z)
        ) continue;
        if(dimension.getBlock({x:x, y:stage[index].start.y, z:z}).typeId == "minecraft:air"){
          if(Math.random() < 0.9){
            dimension.setBlockType({x:x, y:stage[index].start.y, z:z}, "minecraft:brick_block");
          }
        }
      }
    }
  }
})
