import * as mc from "@minecraft/server";
import { getCenter, explode_block, explode_particle, clearField, myTimeout, setField, getScore, setScore, addScore, compLocation, spiralOrderCoordinates, dropItem } from "./lib.js";
import "./menu.js";
import "./button.js";
import { roleList } from "./role.js";
import { breakable_block, roby, stage, through_block } from "./const.js";

let tick = 0;
let pressureTick = 0;
/**
 * @type {mc.Vector3[]}
 */
let pressure_location = [];
let pressure_rate = 5;

//テスト用コマンド
mc.system.afterEvents.scriptEventReceive.subscribe(data=>{
  if(data.id == "tnt:init"){
    mc.world.setDynamicProperty("stage", 0);
    mc.world.setDynamicProperty("status", 0);
  }
  if(data.id == "tnt:set_camera"){
    //data.sourceEntity.camera.setCamera("minecraft:fixed_boom", {rotation: {x: 75, y: 90}, entityOffset: {x:0, y:10, z:-5}});
    let index = mc.world.getDynamicProperty("stage");
    let center = getCenter(stage[index].area);
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
  if(data.id == "tnt:reset"){
    mc.world.getPlayers().forEach(player=>{
      player.removeTag("player");
      player.removeTag("dead");
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Camera, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, true);
      player.getComponent(mc.EntityInventoryComponent.componentId).container.clearAll();
      player.camera.clear();
      player.teleport(roby, {rotation: {x:0, y:0}});
      player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Reset, [mc.HudElement.Health, mc.HudElement.Hotbar, mc.HudElement.Hunger, mc.HudElement.ProgressBar]);
      player.setDynamicProperty("bomb", 0);
      player.stopMusic();
      let moveComp = player.getComponent(mc.EntityMovementComponent.componentId);
      moveComp.resetToDefaultValue();
    })
    mc.world.getDimension("overworld").getEntities({excludeTypes:["minecraft:player"]}).forEach(entity=>{
      entity.remove();
    })
    stage[mc.world.getDynamicProperty("stage")].area.forEach(a=>{
      clearField(mc.world.getDimension("overworld"), a.start, a.end);
    })
    mc.world.setDynamicProperty("status", 0);
    mc.world.setDynamicProperty("stage", 0);
  }
})

mc.system.runInterval(()=>{
  const players = mc.world.getPlayers();
  const joinPlayers = mc.world.getPlayers({excludeTags:["spectator"]});
  players.forEach(player=>{
    if(!mc.world.scoreboard.getObjective("bomb").getParticipants().includes(player.scoreboardIdentity)) {
      setScore(player, "bomb", 1);
    }
    if(!mc.world.scoreboard.getObjective("power").getParticipants().includes(player.scoreboardIdentity)) {
      setScore(player, "power", 2);
    }
    if(!mc.world.scoreboard.getObjective("speed").getParticipants().includes(player.scoreboardIdentity)) {
      setScore(player, "speed", 0);
    }
    if(player.getDynamicProperty("role") == undefined) {
      player.setDynamicProperty("role", 0);
    }

    if(mc.world.getDynamicProperty("status") == 0) {
      //ステータス表示
      player.onScreenDisplay.setActionBar(
        `あなたは${(player.hasTag("spectator") ? "§l§7観戦者§r" : "§l§a参加者§r")}です§r\n` +
        `現在の人数: §l${(joinPlayers.length > stage[mc.world.getDynamicProperty("stage")].spawn.length) ? "§c" : "§b"}${joinPlayers.length}§r\n` +
        `能力: §l§6${roleList[player.getDynamicProperty("role")].name}§r\n` +
        `ステージ: §l§e${stage[mc.world.getDynamicProperty("stage")].name}§r\n`
      )
    }

    if(mc.world.getDynamicProperty("status") == 2) {
      //終了判定
      if(mc.world.getPlayers({tags:["player"], excludeTags:["dead"]}).length <= 1) {
        endGame();
      }
      //移動速度
      let moveComp = player.getComponent(mc.EntityMovementComponent.componentId);
      moveComp.setCurrentValue(moveComp.defaultValue + 0.01 * getScore(player, "speed"));

      //ステータス表示
      if(player.hasTag("player")){
        let role = roleList[player.getDynamicProperty("role")];
        player.onScreenDisplay.setActionBar(
          `§l能力: §e${role.name}§r\n` +
          `§l§cTNT個数§r: §l${getScore(player,"bomb")==role.maxBomb ? "§d" : "§a"}${getScore(player,"bomb")}§r/${role.maxBomb}\n` +
          `§l§6火力§r: §l${getScore(player,"power")==role.maxPower ? "§d" : "§a"}${getScore(player,"power")}§r/${role.maxPower}\n` +
          `§l§bスピード§r: §l${getScore(player,"speed")==role.maxSpeed ? "§d" : "§a"}${getScore(player,"speed")}§r/${role.maxSpeed}\n` +
          `§l§4TNT§r: §l§g${["通常", "貫通"][player.getDynamicProperty("tnt")]}§r\n`
        )
      }
    }

    //アイテム取得
    let item = player.dimension.getEntities({location:{x:Math.floor(player.location.x), y:Math.floor(player.location.y), z:Math.floor(player.location.z)}, volume:{x:0, y:0, z:0}, type: "altivelis:marker"});
    if(item.length > 0) {
      let role = roleList[player.getDynamicProperty("role")];
      item.forEach(entity => {
        switch(entity.getTags()[0]){
          case "bomb":
            if(getScore(player, "bomb") < role.maxBomb) {
              addScore(player, "bomb", 1);
            }
            break;
          case "power":
            if(getScore(player, "power") < role.maxPower) {
              addScore(player, "power", 1);
            }
            break;
          case "speed":
            if(getScore(player, "speed") < role.maxSpeed) {
              addScore(player, "speed", 1);
            }
            break;
          case "blue_tnt":
            player.setDynamicProperty("tnt", 1);
        }
        player.playSound("random.orb", {location: player.location, volume: 10});
        entity.remove();
      })
    }
  })

  //パーティクル
  mc.world.getDimension("overworld").getEntities({type: "altivelis:marker"}).forEach(marker=>{
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
      case "blue_tnt":
        marker.dimension.spawnParticle("altivelis:bluetnt_particle", marker.location);
        break;
    }
    if(through_block.includes(mc.world.getDimension("overworld").getBlock({...marker.location, y: marker.location.y-1}).typeId)){
      marker.teleport({...marker.location, y: marker.location.y-1});
    }
  })
  if(mc.world.getDynamicProperty("status") == 2) {
    //タイマー
    tick++;
    if(tick % 20 == 0) {
      tick = 0;
      let time = getScore("残り時間", "display") - 1;
      setScore("残り時間", "display", time);
      if(time <= 0) {
        endGame();
      }
      if(time <= 10) {
        mc.world.getPlayers().forEach(player=>{
          player.playSound("random.click", {location: player.location, volume: 10});
        })
      }
      if(time == 60) {
        mc.world.getPlayers().forEach(player=>{
          player.onScreenDisplay.setTitle("§l§c残り1分", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 10});
          mc.world.sendMessage("§c金床が降り始めます")
        })
      }
    }
    pressureTick++;
    if(getScore("残り時間", "display") <= 55 && pressureTick % pressure_rate == 0) {
      pressureTick = 0;
      if(pressure_location.length > 0) {
        let pos = pressure_location.shift();
        let pressure_block = mc.world.getDimension("overworld").spawnEntity("altivelis:pressure_block", {x: pos.x+0.5, y: pos.y+5, z: pos.z+0.5});
        pressure_block.dimension.playSound("random.pop2", pressure_block.location, {volume: 10});
      }
    }
    mc.world.getDimension("overworld").getEntities({type: "altivelis:pressure_block"}).forEach(entity=>{
      let overlap = entity.dimension.getEntities({excludeTypes:["altivelis:pressure_block"]}).filter(e=>{return compLocation(e.location, entity.location)});
      if(overlap.length > 0) {
        overlap.forEach(e=>{
          if(e.hasTag("player") && !e.hasTag("dead")) {
            e.addTag("dead");
            e.dimension.playSound("random.anvil_land", e.location, {volume: 10});
            e.teleport(roby);
            e.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
            mc.world.sendMessage(`§c${e.nameTag}§rは金床に潰された！`);
            dropItem(e);
          }
        })
      }
    })
  }
})

//ゲーム開始処理
export function startGame(){
  if(mc.world.getDynamicProperty("status") != 0) return;
  // ゲームを開始する
  let index = mc.world.getDynamicProperty("stage");
  let member = mc.world.getPlayers({excludeTags:["spectator"]});
  let tpmember = member.concat();
  if(tpmember.length > stage[index].spawn.length) {
    mc.world.sendMessage(`§cプレイヤーが多すぎます。このステージは最大${stage[index].spawn.length}人まで参加できます。`);
    return;
  }
  tpmember.length = stage[index].spawn.length;
  //ランダムに並び替え
  for (let i = tpmember.length - 1; i >= 0; i--) {
    let rand = Math.floor(Math.random() * (i + 1));
    // 配列の要素の順番を入れ替える
    let tmpStorage = tpmember[i];
    tpmember[i] = tpmember[rand];
    tpmember[rand] = tmpStorage;
  }
  let maxLocation = {x: -Infinity, y: -Infinity, z: -Infinity};
  let minLocation = {x: Infinity, y: Infinity, z: Infinity};
  stage[index].area.forEach(a=>{
    setField(mc.world.getDimension("overworld"), a.start, a.end, stage[index].block, stage[index].spawn);
    if(a.start.x < minLocation.x) minLocation.x = a.start.x;
    if(a.start.y < minLocation.y) minLocation.y = a.start.y;
    if(a.start.z < minLocation.z) minLocation.z = a.start.z;
    if(a.end.x > maxLocation.x) maxLocation.x = a.end.x;
    if(a.end.y > maxLocation.y) maxLocation.y = a.end.y;
    if(a.end.z > maxLocation.z) maxLocation.z = a.end.z;
  })
  pressure_location = spiralOrderCoordinates({...maxLocation, x:maxLocation.x+1, z:maxLocation.z+1}, {...minLocation, x:minLocation.x-1, z:minLocation.z-1});
  pressure_rate = Math.ceil(55*20 / pressure_location.length);
  mc.world.setDynamicProperty("status", 1);
  mc.world.sendMessage(`ゲームを開始します`);
  mc.world.sendMessage(`ステージ: ${stage[index].name}`);
  mc.world.getPlayers().forEach(player=>{
    player.setGameMode(mc.GameMode.adventure);
    player.camera.fade({fadeColor: {red:0, green:0, blue:0}, fadeTime:{fadeInTime: 1, fadeOutTime: 1, holdTime: 0}});
  })
  mc.world.getDimension("overworld").getEntities({type: "altivelis:marker"}).forEach(entity=>{
    entity.remove();
  })
  mc.world.getDimension("overworld").getEntities({type: "altivelis:pressure_block"}).forEach(entity=>{
    entity.remove();
  })
  mc.world.getPlayers().forEach(player=>{
    player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Camera, false);
    player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, false);
    player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, false);
    player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
  })
  setScore("残り時間", "display", 100);
  tick = 0;
  myTimeout(20, ()=>{
    //プレイヤーをテレポート
    for(let i=0; i<tpmember.length; i++){
      if(tpmember[i] != undefined) {
        let pos = stage[index].spawn[i];
        tpmember[i].teleport({x:pos.x+0.5, y:pos.y, z:pos.z+0.5}, {rotation:{x:0, y:0}});
      }
    }
    //プレイヤー初期化
    member.forEach(player=>{
      let role = roleList[player.getDynamicProperty("role")];
      player.addTag("player");
      setScore(player, "bomb", role.initBomb);
      setScore(player, "power", role.initPower);
      setScore(player, "speed", role.initSpeed);
      player.setDynamicProperty("tnt", 0);
      player.setDynamicProperty("bomb", 0);
      player.getComponent(mc.EntityInventoryComponent.componentId).container.clearAll();
    })
    mc.world.getPlayers().forEach(player=>{
      let center = getCenter(stage[index].area);
      player.camera.setCamera("minecraft:free", {location: {...center, y:center.y+12, z:center.z-3}, facingLocation: center});
      player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Hide, [mc.HudElement.Health, mc.HudElement.Hotbar, mc.HudElement.Hunger, mc.HudElement.ProgressBar]);
      player.playMusic("record.precipice", {fade: 1, loop: true, volume: 0.3});
    })

    myTimeout(20, ()=>{
      myTimeout(20, ()=>{
        mc.world.getPlayers().forEach(player=>{
          player.onScreenDisplay.setTitle("§l§a3", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 0});
          player.playSound("random.click", {location: player.location, volume: 10});
        })
        myTimeout(20, ()=>{
          mc.world.getPlayers().forEach(player=>{
            player.onScreenDisplay.setTitle("§l§a2", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 0});
            player.playSound("random.click", {location: player.location, volume: 10});
          })
          myTimeout(20, ()=>{
            mc.world.getPlayers().forEach(player=>{
              player.onScreenDisplay.setTitle("§l§a1", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 0});
              player.playSound("random.click", {location: player.location, volume: 10});
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
  let winner = mc.world.getPlayers({tags:["player"], excludeTags:["dead", "spectator"]});
  if(winner.length == 1) {
    winner[0].teleport(winner[0].location, {facingLocation: {...winner[0].location, y: winner[0].location.y+5, z: winner[0].location.z-2}});
    winner[0].dimension.playSound("random.totem", winner[0].location, {volume: 10});
    mc.world.sendMessage(`${winner[0].nameTag}の勝利!`);
    mc.world.getPlayers().forEach(player=>{
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
      player.camera.setCamera("minecraft:free", {location: {...winner[0].location, y:winner[0].location.y+5, z:winner[0].location.z-1}, facingLocation: winner[0].location, easeOptions: {easeTime:1, easeType: mc.EasingType.OutCirc}});
      player.onScreenDisplay.setTitle("§l§bWINNER\n\n\n", {fadeInDuration: 0, stayDuration: 50, fadeOutDuration: 10});
      player.onScreenDisplay.updateSubtitle(winner[0].nameTag)
    })    
  }else{
    mc.world.sendMessage(`§l§7引き分け!`);
    mc.world.getPlayers().forEach(player=>{
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
      player.onScreenDisplay.setTitle("§l§7DRAW\n\n\n", {fadeInDuration: 0, stayDuration: 50, fadeOutDuration: 10});
    })
  }
  myTimeout(60, ()=>{
    mc.world.getPlayers().forEach(player=>{
      player.removeTag("player");
      player.removeTag("dead");
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Camera, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, true);
      player.getComponent(mc.EntityInventoryComponent.componentId).container.clearAll();
      player.camera.clear();
      player.teleport(roby, {rotation: {x:0, y:0}});
      player.stopMusic();
      player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Reset, [mc.HudElement.Health, mc.HudElement.Hotbar, mc.HudElement.Hunger, mc.HudElement.ProgressBar]);
      let moveComp = player.getComponent(mc.EntityMovementComponent.componentId);
      moveComp.resetToDefaultValue();
    })
    mc.world.getDimension("overworld").getEntities({type: "altivelis:marker"}).forEach(entity=>{
      entity.remove();
    })
    mc.world.getDimension("overworld").getEntities({type: "altivelis:pressure_block"}).forEach(entity=>{
      entity.remove();
    })
    stage[mc.world.getDynamicProperty("stage")].area.forEach(a=>{
      clearField(mc.world.getDimension("overworld"), a.start, a.end);
    })
    mc.world.setDynamicProperty("status", 0);
  })
}


//爆発処理
mc.world.beforeEvents.explosion.subscribe(data=>{
  data.cancel = true;
  let pos = data.source.location;
  let owner = data.source?.owner;
  let power = data.source.getDynamicProperty("power");
  let blue = data.source.hasTag("blue");
  mc.system.run(()=>{
    owner.setDynamicProperty("bomb", owner.getDynamicProperty("bomb")-1);
    data.dimension.playSound("random.explode", pos, {volume: 4});
    if(power >= 8) {
      mc.world.getDimension("overworld").runCommand(`camerashake add @a 0.3 0.2 positional`);
    }
    // x+
    explode_particle(data.dimension, pos);
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, x: pos.x+i});
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"]}).filter(e=>{return compLocation(e.location, {...pos, x:pos.x+i})}).length == 0){
        explode_particle(data.dimension, {...pos, x: pos.x+i});
      }
      else{
        if(blue && (breakable_block.includes(block.typeId) || through_block.includes(block.typeId))){
          explode_block(data.dimension, {...pos, x: pos.x+i});
        }else{
          explode_block(data.dimension, {...pos, x: pos.x+i});
          break;
        }
      }
    }
    // x-
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, x: pos.x-i});
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"]}).filter(e=>{return compLocation(e.location, {...pos, x:pos.x-i})}).length == 0){
        explode_particle(data.dimension, {...pos, x: pos.x-i});
      }
      else{
        if(blue && (breakable_block.includes(block.typeId) || through_block.includes(block.typeId))){
          explode_block(data.dimension, {...pos, x: pos.x-i});
        }else{
          explode_block(data.dimension, {...pos, x: pos.x-i});
          break;
        }
      }
    }
    // z+
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, z: pos.z+i});
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"]}).filter(e=>{return compLocation(e.location, {...pos, z:pos.z+i})}).length == 0){
        explode_particle(data.dimension, {...pos, z: pos.z+i});
      }
      else{
        if(blue && (breakable_block.includes(block.typeId) || through_block.includes(block.typeId))){
          explode_block(data.dimension, {...pos, z: pos.z+i});
        }else{
          explode_block(data.dimension, {...pos, z: pos.z+i});
          break;
        }
      }
    }
    // z-
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, z: pos.z-i});
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"]}).filter(e=>{return compLocation(e.location, {...pos, z:pos.z-i})}).length == 0){
        explode_particle(data.dimension, {...pos, z: pos.z-i});
      }
      else{
        if(blue && (breakable_block.includes(block.typeId) || through_block.includes(block.typeId))){
          explode_block(data.dimension, {...pos, z: pos.z-i});
        }else{
          explode_block(data.dimension, {...pos, z: pos.z-i});
          break;
        }
      }
    }
    // y-
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, y: pos.y-i});
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"]}).filter(e=>{return compLocation(e.location, {...pos, y:pos.y-i})}).length == 0){
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
  if(source.dimension.getEntities({location: source.location, maxDistance:0.5, type:"altivelis:tnt"}).length > 0) return;
  let pos = source.location;
  // mc.world.sendMessage(`x: ${Math.floor(pos.x)}, y: ${Math.floor(pos.y)}, z: ${Math.floor(pos.z)}`);
  let tnt = source.dimension.spawnEntity("altivelis:tnt", {x: Math.floor(pos.x)+0.5, y: Math.floor(pos.y), z: Math.floor(pos.z)+0.5});
  if(source.getDynamicProperty("tnt") == 1) {
    tnt.triggerEvent("blue");
    tnt.addTag("blue");
  }
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
  if(player.dimension.getEntities({location: player.location, maxDistance:0.5, type:"altivelis:tnt"}).length > 0) return;
  let pos = player.location;
  let tnt = player.dimension.spawnEntity("altivelis:tnt", {x: Math.floor(pos.x)+0.5, y: Math.floor(pos.y), z: Math.floor(pos.z)+0.5});
  if(player.getDynamicProperty("tnt") == 1) {
    tnt.triggerEvent("blue");
    tnt.addTag("blue");
  }
  tnt.owner = player;
  tnt.setDynamicProperty("power", mc.world.scoreboard.getObjective("power").getScore(player));
  tnt.dimension.playSound("fire.ignite", tnt.location, {volume: 10});
  if(player.getDynamicProperty("bomb") == undefined) player.setDynamicProperty("bomb", 1);
  else player.setDynamicProperty("bomb", player.getDynamicProperty("bomb")+1);
}, {buttons: [mc.InputButton.Jump], state: mc.ButtonState.Pressed})

//ワールド参加時処理
mc.world.afterEvents.playerSpawn.subscribe(data=>{
  if(!data.initialSpawn) return;
  if(data.player.hasTag("player")) data.player.removeTag("player");
  if(data.player.hasTag("dead")) data.player.removeTag("dead");
  data.player.setDynamicProperty("bomb", 0);
  data.player.teleport(roby, {rotation: {x:0, y:0}});
  let index = mc.world.getDynamicProperty("stage");
  if(mc.world.getDynamicProperty("status") > 0) {
    data.player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Camera, false);
    data.player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, false);
    data.player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, false);
    data.player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
    let center = getCenter(stage[index].area);
    data.player.camera.setCamera("minecraft:free", {location: {...center, y:center.y+12, z:center.z-3}, facingLocation: center});
    data.player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Hide, [mc.HudElement.Health, mc.HudElement.Hotbar, mc.HudElement.Hunger, mc.HudElement.ProgressBar]);
    data.player.playMusic("record.precipice", {fade: 1, loop: true, volume: 0.3});
  }
})