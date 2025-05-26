import * as mc from "@minecraft/server";
import * as lib from "./lib.js";
import "./menu.js";
import "./button.js";
import "./item.js";
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
    /** @type {number}*/
    let index = mc.world.getDynamicProperty("stage");
    let center = lib.getCenter(stage[index].area);
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
      player.removeTag("kick");
      player.removeTag("punch");
      player.removeTag("tp");
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Camera, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveForward, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveBackward, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveLeft, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveRight, true);
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
    /** @type {Number};*/
    let stageIndex = mc.world.getDynamicProperty("stage");
    lib.clearField(mc.world.getDimension("overworld"), stage[stageIndex].area.start, stage[stageIndex].area.end);
    mc.world.setDynamicProperty("status", 0);
    mc.world.setDynamicProperty("stage", 0);
  }
  if(data.id == "tnt:test") {
    mc.world.structureManager.place("village", data.sourceEntity.dimension, data.sourceEntity.location);
  }
})

mc.system.runInterval(()=>{
  const players = mc.world.getPlayers();
  const joinPlayers = mc.world.getPlayers({excludeTags:["spectator"]});
  /** @type {Number} */
  let stageIndex = mc.world.getDynamicProperty("stage");
  players.forEach(player=>{
    if(!mc.world.scoreboard.getObjective("bomb").getParticipants().includes(player.scoreboardIdentity)) {
      lib.setScore(player, "bomb", 1);
    }
    if(!mc.world.scoreboard.getObjective("power").getParticipants().includes(player.scoreboardIdentity)) {
      lib.setScore(player, "power", 2);
    }
    if(!mc.world.scoreboard.getObjective("speed").getParticipants().includes(player.scoreboardIdentity)) {
      lib.setScore(player, "speed", 0);
    }
    if(player.getDynamicProperty("role") == undefined) {
      player.setDynamicProperty("role", 0);
    }

    //入力方向検知
    let size = 0.2;
    let strength = 0.3;
    let delay = 5;
    let moveVector = player.inputInfo.getMovementVector();
    if((moveVector.x != 0 || moveVector.y != 0) && mc.world.getDynamicProperty("status") == 2 && !player.hasTag("dead")) {
      if(Math.abs(moveVector.x) > Math.abs(moveVector.y)) {
        if(moveVector.x > 0) {
          player.setDynamicProperty("direction", 3);//左
          if(player.getVelocity().x == 0 && !player.hasTag("tp")) {
            //キック
            if(player.hasTag("kick")){
              let touchTNT = player.dimension.getEntities({type:"altivelis:tnt"}).filter(e=>{return lib.compLocation(e.location, {...player.location, x:player.location.x+1})});
              if(touchTNT.length > 0) {
                touchTNT.forEach(tnt=>{
                  tnt.setDynamicProperty("direction", 3);
                  tnt.setDynamicProperty("kickOwnerId", player.id);
                })
                player.addTag("tp");
                lib.myTimeout(delay, ()=>{
                  player.removeTag("tp");
                })
              }
            }
            //通り道検知
            if(!player.hasTag("tp") && player.dimension.getBlock({...player.location, x: player.location.x+1}).typeId == "minecraft:air") {
              player.applyKnockback(0, (player.location.z > Math.floor(player.location.z)+0.5) ? -1 : 1, strength, 0);
              player.addTag("tp");
              lib.myTimeout(delay, ()=>{
                player.removeTag("tp");
              })
            }else{
              if(player.location.z > Math.floor(player.location.z) + 1 - size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x+1, z: player.location.z+1})) {
                  player.applyKnockback(0, 1, strength*2, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }else if(player.location.z < Math.floor(player.location.z) + size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x+1, z: player.location.z-1})) {
                  player.applyKnockback(0, -1, strength*2, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }
            }
          }
        }else{
          player.setDynamicProperty("direction", 1);//右
          if(player.getVelocity().x == 0 && !player.hasTag("tp")) {
            //キック
            if(player.hasTag("kick")){
              let touchTNT = player.dimension.getEntities({type:"altivelis:tnt"}).filter(e=>{return lib.compLocation(e.location, {...player.location, x:player.location.x-1})});
              if(touchTNT.length > 0) {
                touchTNT.forEach(tnt=>{
                  tnt.setDynamicProperty("direction", 1);
                  tnt.setDynamicProperty("kickOwnerId", player.id);
                })
                player.addTag("tp");
                lib.myTimeout(delay, ()=>{
                  player.removeTag("tp");
                })
              }
            }
            //通り道検知
            if(!player.hasTag("tp") && lib.tryTeleport(player.dimension, {...player.location, x: player.location.x-1})) {
              player.applyKnockback(0, (player.location.z > Math.floor(player.location.z)+0.5) ? -1 : 1, strength, 0);
              player.addTag("tp");
              lib.myTimeout(delay, ()=>{
                player.removeTag("tp");
              })
            }else{
              if(player.location.z > Math.floor(player.location.z) + 1 - size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x-1, z: player.location.z+1})) {
                  player.applyKnockback(0, 1, strength*2, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }else if(player.location.z < Math.floor(player.location.z) + size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x-1, z: player.location.z-1})) {
                  player.applyKnockback(0, -1, strength*2, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }
            }
          }
        }
      }else{
        if(moveVector.y > 0) {
          player.setDynamicProperty("direction", 0);//上
          if(player.getVelocity().z == 0 && !player.hasTag("tp")) {
            //キック
            if(player.hasTag("kick")){
              let touchTNT = player.dimension.getEntities({type:"altivelis:tnt"}).filter(e=>{return lib.compLocation(e.location, {...player.location, z:player.location.z+1})});
              if(touchTNT.length > 0) {
                touchTNT.forEach(tnt=>{
                  tnt.setDynamicProperty("direction", 0);
                  tnt.setDynamicProperty("kickOwnerId", player.id);
                })
                player.addTag("tp");
                lib.myTimeout(delay, ()=>{
                  player.removeTag("tp");
                })
              }
            }
            //通り道検知
            if(!player.hasTag("tp") && lib.tryTeleport(player.dimension, {...player.location, z: player.location.z+1})) {
              player.applyKnockback((player.location.x > Math.floor(player.location.x)+0.5) ? -1 : 1, 0, strength, 0);
              player.addTag("tp");
              lib.myTimeout(delay, ()=>{
                player.removeTag("tp");
              })
            }else{
              if(player.location.x > Math.floor(player.location.x) + 1 - size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x+1, z: player.location.z+1})) {
                  player.applyKnockback(1, 0, strength*2, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }else if(player.location.x < Math.floor(player.location.x) + size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x-1, z: player.location.z+1})) {
                  player.applyKnockback(-1, 0, strength*2, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }
            }
          }
        }else{
          player.setDynamicProperty("direction", 2);//下
          if(player.getVelocity().z == 0 && !player.hasTag("tp")) {
            //キック
            if(player.hasTag("kick")){
              let touchTNT = player.dimension.getEntities({type:"altivelis:tnt"}).filter(e=>{return lib.compLocation(e.location, {...player.location, z:player.location.z-1})});
              if(touchTNT.length > 0) {
                touchTNT.forEach(tnt=>{
                  tnt.setDynamicProperty("direction", 2);
                  tnt.setDynamicProperty("kickOwnerId", player.id);
                })
                player.addTag("tp");
                lib.myTimeout(delay, ()=>{
                  player.removeTag("tp");
                })
              }
            }
            //通り道検知
            if(!player.hasTag("tp") && lib.tryTeleport(player.dimension, {...player.location, z: player.location.z-1})) {
              player.applyKnockback((player.location.x > Math.floor(player.location.x)+0.5) ? -1 : 1, 0, strength, 0);
              player.addTag("tp");
              lib.myTimeout(delay, ()=>{
                player.removeTag("tp");
              })
            }else{
              if(player.location.x > Math.floor(player.location.x) + 1 - size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x+1, z: player.location.z-1})) {
                  player.applyKnockback(1, 0, strength*2, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }else if(player.location.x < Math.floor(player.location.x) + size) {
                if(lib.tryTeleport(player.dimension, {...player.location, x: player.location.x-1, z: player.location.z-1})) {
                  player.applyKnockback(-1, 0, strength*2, 0);
                  player.addTag("tp");
                  lib.myTimeout(delay, ()=>{
                    player.removeTag("tp");
                  })
                }
              }
            }
          }
        }
      }
    }

    if(mc.world.getDynamicProperty("status") == 0) {
      //ステータス表示
      player.onScreenDisplay.setActionBar(
        `あなたは${(player.hasTag("spectator") ? "§l§7観戦者§r" : "§l§a参加者§r")}です§r\n` +
        `現在の人数: §l${(joinPlayers.length > stage[stageIndex].spawn.length) ? "§c" : "§b"}${joinPlayers.length}§r\n` +
        `能力: §l§6${roleList[player.getDynamicProperty("role")].name}§r\n` +
        `ステージ: §l§e${stage[stageIndex].name}§r\n`
      )
    }

    if(mc.world.getDynamicProperty("status") == 2) {
      //終了判定
      if(mc.world.getPlayers({tags:["player"], excludeTags:["dead"]}).length <= 1) {
        endGame();
      }
      //移動速度
      let moveComp = player.getComponent(mc.EntityMovementComponent.componentId);
      if(player.hasTag("dead")){
        moveComp.setCurrentValue(moveComp.defaultValue);
      }
      else {
        moveComp.setCurrentValue(moveComp.defaultValue + 0.01 * lib.getScore(player, "speed"));
      }

      //ステータス表示
      if(player.hasTag("player")){
        /**
         * @type {roleList}
         */
        let role = roleList[player.getDynamicProperty("role")];
        player.onScreenDisplay.setActionBar(
          `§l能力: §e${role.name}§r\n` +
          `§l§cTNT個数§r: §l${lib.getScore(player,"bomb")==role.bomb.max ? "§d" : "§a"}${lib.getScore(player,"bomb")}§r/${role.bomb.max}\n` +
          `§l§6火力§r: §l${lib.getScore(player,"power")==role.power.max ? "§d" : "§a"}${lib.getScore(player,"power")}§r/${role.power.max}\n` +
          `§l§bスピード§r: §l${lib.getScore(player,"speed")==role.speed.max ? "§d" : "§a"}${lib.getScore(player,"speed")}§r/${role.speed.max}\n` +
          `§l§4TNT§r: §l§g${["通常", "貫通"][player.getDynamicProperty("tnt")]}§r\n` +
          `§l§dアイテム§r\n` +
          `${player.hasTag("kick") ? "§f" : "§8"}§lキック§r\n` +
          `${player.hasTag("punch") ? "§f" : "§8"}§lパンチ§r\n`
        )
      }
    }

    //アイテム取得
    let item = player.dimension.getEntities({location:{x:Math.floor(player.location.x), y:Math.floor(player.location.y), z:Math.floor(player.location.z)}, volume:{x:0, y:0, z:0}, type: "altivelis:marker"});
    if(item.length > 0) {
      /**
       * @type {roleList}
       */
      let role = roleList[player.getDynamicProperty("role")];
      item.forEach(entity => {
        switch(entity.getTags()[0]){
          case "bomb":
            if(lib.getScore(player, "bomb") < role.bomb.max) {
              lib.addScore(player, "bomb", 1);
            }
            break;
          case "power":
            if(lib.getScore(player, "power") < role.power.max) {
              lib.addScore(player, "power", 1);
            }
            break;
          case "speed":
            if(lib.getScore(player, "speed") < role.speed.max) {
              lib.addScore(player, "speed", 1);
            }
            break;
          case "blue_tnt":
            if(role.blue.able) player.setDynamicProperty("tnt", 1);
            break;
          case "kick":
            if(role.kick.able) player.addTag("kick");
            break;
          case "punch":
            if(role.punch.able) {
              player.addTag("punch");
              let slot = player.getComponent(mc.EntityInventoryComponent.componentId).container.getSlot(0);
              let item = new mc.ItemStack("altivelis:punch", 1);
              item.lockMode = mc.ItemLockMode.slot;
              slot.setItem(item);
              player.selectedSlotIndex = 0;
            }
            break;
          case "full_fire":
            lib.setScore(player, "power", role.power.max);
            break;
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
        marker.dimension.spawnParticle("altivelis:tnt_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "power":
        marker.dimension.spawnParticle("altivelis:power_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "speed":
        marker.dimension.spawnParticle("altivelis:speed_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "blue_tnt":
        marker.dimension.spawnParticle("altivelis:bluetnt_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "kick":
        marker.dimension.spawnParticle("altivelis:kick_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "punch":
        marker.dimension.spawnParticle("altivelis:punch_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "shot":
        marker.dimension.spawnParticle("altivelis:shot_particle", {...marker.location, y: marker.location.y+0.5});
        break;
      case "full_fire":
        marker.dimension.spawnParticle("altivelis:full_fire_particle", {...marker.location, y: marker.location.y+0.5});
        break;
    }
    if(through_block.includes(mc.world.getDimension("overworld").getBlock({...marker.location, y: marker.location.y-1}).typeId)){
      marker.teleport({...marker.location, y: marker.location.y-1});
    }
  })

  //TNT移動
  mc.world.getDimension("overworld").getEntities({type: "altivelis:tnt"}).filter(e=>{return e.getDynamicProperty("direction") != undefined}).forEach(tnt=>{
    let owner = mc.world.getPlayers().filter(e=>{return e.id == tnt.getDynamicProperty("kickOwnerId")})[0];
    let dir = tnt.getDynamicProperty("direction");
    if(
      (owner.inputInfo.getButtonState(mc.InputButton.Sneak) == mc.ButtonState.Pressed) ||
      (!lib.tryTeleport(tnt.dimension, {...tnt.location, x:tnt.location.x+(dir==1?-1:dir==3?1:0), z:tnt.location.z+(dir==0?1:dir==2?-1:0)})) ||
      (players.filter(e=>{return lib.compLocation(e.location, {...tnt.location, x:tnt.location.x+(dir==1?-1:dir==3?1:0), z:tnt.location.z+(dir==0?1:dir==2?-1:0)})}).length > 0)
    ) {
      tnt.teleport({x:Math.floor(tnt.location.x)+0.5, y:Math.floor(tnt.location.y), z:Math.floor(tnt.location.z)+0.5});
      tnt.clearVelocity();
      tnt.setDynamicProperty("direction");
      tnt.setDynamicProperty("kickOwnerId");
    }
    let speed = 0.4;
    tnt.clearVelocity();
    switch(tnt.getDynamicProperty("direction")){
      case 0:
        // tnt.applyImpulse({x:0, y:0, z:speed});
        tnt.teleport({...tnt.location, z:tnt.location.z+speed});
        break;
      case 1:
        // tnt.applyImpulse({x:-speed, y:0, z:0});
        tnt.teleport({...tnt.location, x:tnt.location.x-speed});
        break;
      case 2:
        // tnt.applyImpulse({x:0, y:0, z:-speed});
        tnt.teleport({...tnt.location, z:tnt.location.z-speed});
        break;
      case 3:
        // tnt.applyImpulse({x:speed, y:0, z:0});
        tnt.teleport({...tnt.location, x:tnt.location.x+speed});
        break;
    }
  })

  //ゲーム中のループ処理
  if(mc.world.getDynamicProperty("status") == 2) {
    //タイマー
    tick++;
    if(tick % 20 == 0) {
      tick = 0;
      let time = lib.getScore("残り時間", "display") - 1;
      lib.setScore("残り時間", "display", time);
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
          mc.world.sendMessage("§c金床が降り始めます");
          if(player.hasTag("dead")) {
            player.teleport(roby);
            player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
          }
        })
      }
    }
    pressureTick++;
    //プレッシャーブロック
    if(lib.getScore("残り時間", "display") <= 55 && pressureTick % pressure_rate == 0) {
      pressureTick = 0;
      if(pressure_location.length > 0) {
        let pos = pressure_location.shift();
        let pressure_block = mc.world.getDimension("overworld").spawnEntity("altivelis:pressure_block", {x: pos.x+0.5, y: pos.y+5, z: pos.z+0.5});
        pressure_block.dimension.playSound("random.pop2", pressure_block.location, {volume: 10});
      }
    }
    mc.world.getDimension("overworld").getEntities({type: "altivelis:pressure_block"}).forEach(entity=>{
      let overlap = entity.dimension.getEntities({excludeTypes:["altivelis:pressure_block"]}).filter(e=>{return lib.compLocation(e.location, entity.location)});
      if(overlap.length > 0) {
        overlap.forEach(e=>{
          if(e.hasTag("player") && !e.hasTag("dead")) {
            e.addTag("dead");
            e.dimension.playSound("random.anvil_land", e.location, {volume: 10});
            e.teleport(roby);
            e.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
            mc.world.sendMessage(`§c${e.nameTag}§rは金床に潰された！`);
            lib.dropItem(e);
          }
        })
      }
    })
    //ミソボン
    mc.world.getPlayers({tags:["player", "dead"], excludeTags:["spectator"]}).forEach(player=>{
      if(player.location.z > stage[stageIndex].area.end.z+1 || (player.location.x > stage[stageIndex].area.start.x && player.location.x < stage[stageIndex].area.end.x+1)) {
        if(player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveForward)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveForward, false);
        }
      }else{
        if(!player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveForward)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveForward, true);
        }
      }
      if(player.location.z < stage[stageIndex].area.start.z || (player.location.x > stage[stageIndex].area.start.x && player.location.x < stage[stageIndex].area.end.x+1)) {
        if(player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveBackward)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveBackward, false);
        }
      }else{
        if(!player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveBackward)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveBackward, true);
        }
      }
      if(player.location.x > stage[stageIndex].area.end.x+1 || (player.location.z > stage[stageIndex].area.start.z && player.location.z < stage[stageIndex].area.end.z+1)) {
        if(player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveLeft)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveLeft, false);
        }
      }else{
        if(!player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveLeft)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveLeft, true);
        }
      }
      if(player.location.x < stage[stageIndex].area.start.x || (player.location.z > stage[stageIndex].area.start.z && player.location.z < stage[stageIndex].area.end.z+1)) {
        if(player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveRight)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveRight, false);
        }
      }else{
        if(!player.inputPermissions.isPermissionCategoryEnabled(mc.InputPermissionCategory.MoveRight)) {
          player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveRight, true);
        }
      }
    })
  }
})

//ゲーム開始処理
export function startGame(){
  if(mc.world.getDynamicProperty("status") != 0) return;
  // ゲームを開始する
  /** @type {Number} */
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
  lib.setField(mc.world.getDimension("overworld"), stage[index]);
  let maxLocation = stage[index].area.end;
  let minLocation = stage[index].area.start;
  pressure_location = lib.spiralOrderCoordinates({...maxLocation, x:maxLocation.x+1, z:maxLocation.z+1}, {...minLocation, x:minLocation.x-1, z:minLocation.z-1});
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
    // player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Camera, false);
    player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, false);
    player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, false);
    player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
  })
  lib.setScore("残り時間", "display", 120);
  tick = 0;
  lib.myTimeout(20, ()=>{
    //プレイヤーをテレポート
    for(let i=0; i<tpmember.length; i++){
      if(tpmember[i] != undefined) {
        let pos = stage[index].spawn[i];
        tpmember[i].teleport({x:pos.x+0.5, y:pos.y, z:pos.z+0.5}, {rotation:{x:0, y:0}});
      }
    }
    //プレイヤー初期化
    member.forEach(player=>{
      /**
       * @type {roleList}
       */
      let role = roleList[player.getDynamicProperty("role")];
      //初期化
      player.addTag("player");
      player.removeTag("kick");
      player.removeTag("punch");
      player.setDynamicProperty("bomb", 0);
      player.getComponent(mc.EntityInventoryComponent.componentId).container.clearAll();
      //初期ステータス適用
      lib.setScore(player, "bomb", role.bomb.init);
      lib.setScore(player, "power", role.power.init);
      lib.setScore(player, "speed", role.speed.init);
      player.setDynamicProperty("tnt", role.blue.init ? 1 : 0);
      if(role.kick.init) {
        player.addTag("kick");
      }
      if(role.punch.init) {
        player.addTag("punch");
        let slot = player.getComponent(mc.EntityInventoryComponent.componentId).container.getSlot(0);
        let item = new mc.ItemStack("altivelis:punch", 1);
        item.lockMode = mc.ItemLockMode.slot;
        slot.setItem(item);
        player.selectedSlotIndex = 0;
      }
    })
    mc.world.getPlayers().forEach(player=>{
      let center = lib.getCenter(stage[index].area);
      //player.camera.setCamera("minecraft:free", {location: {...center, y:center.y+12, z:center.z-3}, facingLocation: center});
      player.runCommand(`camera @s set minecraft:free pos ${center.x} ${center.y+12} ${center.z-3} facing ${center.x} ${center.y} ${center.z}`);
      player.runCommand("controlscheme @s set camera_relative");
      player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Hide, [mc.HudElement.Health, mc.HudElement.Hunger, mc.HudElement.ProgressBar]);
      // player.playMusic("record.precipice", {fade: 1, loop: true, volume: 0.3});
      player.runCommand("music play record.precipice 0.3 1 loop");
    })

    lib.myTimeout(20, ()=>{
      lib.myTimeout(20, ()=>{
        mc.world.getPlayers().forEach(player=>{
          player.onScreenDisplay.setTitle("§l§a3", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 0});
          player.playSound("random.click", {location: player.location, volume: 10});
        })
        lib.myTimeout(20, ()=>{
          mc.world.getPlayers().forEach(player=>{
            player.onScreenDisplay.setTitle("§l§a2", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 0});
            player.playSound("random.click", {location: player.location, volume: 10});
          })
          lib.myTimeout(20, ()=>{
            mc.world.getPlayers().forEach(player=>{
              player.onScreenDisplay.setTitle("§l§a1", {fadeInDuration: 0, stayDuration: 20, fadeOutDuration: 0});
              player.playSound("random.click", {location: player.location, volume: 10});
            })
            lib.myTimeout(20, ()=>{
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
    winner[0].runCommand("controlscheme @s clear");
    lib.myTimeout(1, ()=>{
      winner[0].teleport(winner[0].location, {facingLocation: {...winner[0].location, y: winner[0].location.y+5, z: winner[0].location.z-2}});
    })
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
  lib.myTimeout(60, ()=>{
    mc.world.getPlayers().forEach(player=>{
      player.removeTag("player");
      player.removeTag("dead");
      player.removeTag("kick");
      player.removeTag("punch");
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Camera, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveForward, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveBackward, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveLeft, true);
      player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.MoveRight, true);
      player.getComponent(mc.EntityInventoryComponent.componentId).container.clearAll();
      player.camera.clear();
      player.teleport(roby, {rotation: {x:0, y:0}});
      player.stopMusic();
      player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Reset, [mc.HudElement.Health, mc.HudElement.Hunger, mc.HudElement.ProgressBar]);
      let moveComp = player.getComponent(mc.EntityMovementComponent.componentId);
      moveComp.resetToDefaultValue();
    })
    mc.world.getDimension("overworld").getEntities({type: "altivelis:marker"}).forEach(entity=>{
      entity.remove();
    })
    mc.world.getDimension("overworld").getEntities({type: "altivelis:pressure_block"}).forEach(entity=>{
      entity.remove();
    })
    /** @type {Number} */
    let stageIndex = mc.world.getDynamicProperty("stage");
    lib.clearField(mc.world.getDimension("overworld"), stage[stageIndex].area.start, stage[stageIndex].area.end);
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
  let revival = data.source.hasTag("revival");
  mc.system.run(()=>{
    if(owner != undefined && !revival) owner.setDynamicProperty("bomb", owner.getDynamicProperty("bomb")-1);
    data.dimension.playSound("random.explode", pos, {volume: 4});
    if(power >= 8) {
      mc.world.getDimension("overworld").runCommand(`camerashake add @a 0.3 0.2 positional`);
    }
    // x+
    lib.explode_particle(data.dimension, pos, owner, revival);
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, x: pos.x+i});
      if(block.below().typeId == "minecraft:air") break;
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"]}).filter(e=>{return lib.compLocation(e.location, {...pos, x:pos.x+i})}).length == 0){
        lib.explode_particle(data.dimension, {...pos, x: pos.x+i}, owner, revival);
      }
      else{
        if(blue && (breakable_block.includes(block.typeId) || through_block.includes(block.typeId))){
          lib.explode_block(data.dimension, {...pos, x: pos.x+i}, owner, revival);
        }else{
          lib.explode_block(data.dimension, {...pos, x: pos.x+i}, owner, revival);
          break;
        }
      }
    }
    // x-
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, x: pos.x-i});
      if(block.below().typeId == "minecraft:air") break;
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"]}).filter(e=>{return lib.compLocation(e.location, {...pos, x:pos.x-i})}).length == 0){
        lib.explode_particle(data.dimension, {...pos, x: pos.x-i}, owner, revival);
      }
      else{
        if(blue && (breakable_block.includes(block.typeId) || through_block.includes(block.typeId))){
          lib.explode_block(data.dimension, {...pos, x: pos.x-i}, owner, revival);
        }else{
          lib.explode_block(data.dimension, {...pos, x: pos.x-i}, owner, revival);
          break;
        }
      }
    }
    // z+
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, z: pos.z+i});
      if(block.below().typeId == "minecraft:air") break;
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"]}).filter(e=>{return lib.compLocation(e.location, {...pos, z:pos.z+i})}).length == 0){
        lib.explode_particle(data.dimension, {...pos, z: pos.z+i}, owner, revival);
      }
      else{
        if(blue && (breakable_block.includes(block.typeId) || through_block.includes(block.typeId))){
          lib.explode_block(data.dimension, {...pos, z: pos.z+i}, owner, revival);
        }else{
          lib.explode_block(data.dimension, {...pos, z: pos.z+i}, owner, revival);
          break;
        }
      }
    }
    // z-
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, z: pos.z-i});
      if(block.below().typeId == "minecraft:air") break;
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"]}).filter(e=>{return lib.compLocation(e.location, {...pos, z:pos.z-i})}).length == 0){
        lib.explode_particle(data.dimension, {...pos, z: pos.z-i}, owner, revival);
      }
      else{
        if(blue && (breakable_block.includes(block.typeId) || through_block.includes(block.typeId))){
          lib.explode_block(data.dimension, {...pos, z: pos.z-i}, owner, revival);
        }else{
          lib.explode_block(data.dimension, {...pos, z: pos.z-i}, owner, revival);
          break;
        }
      }
    }
    // y-
    for(let i=1; i<=power; i++){
      let block = data.dimension.getBlock({...pos, y: pos.y-i});
      if(block.below().typeId == "minecraft:air") break;
      if(through_block.includes(block.typeId) && data.dimension.getEntities({excludeTypes:["minecraft:player"]}).filter(e=>{return lib.compLocation(e.location, {...pos, y:pos.y-i})}).length == 0){
        lib.explode_particle(data.dimension, {...pos, y: pos.y-i}, owner, revival);
      }
      else{
        lib.explode_block(data.dimension, {...pos, y: pos.y-i}, owner, revival);
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
  if(source.getDynamicProperty("bomb") != undefined && source.getDynamicProperty("bomb") >= lib.getScore(source, "bomb")) return;
  if(source.dimension.getEntities({location: source.location, maxDistance:0.5, type:"altivelis:tnt"}).length > 0) return;
  let pos = source.location;
  // mc.world.sendMessage(`x: ${Math.floor(pos.x)}, y: ${Math.floor(pos.y)}, z: ${Math.floor(pos.z)}`);
  let tnt = source.dimension.spawnEntity("altivelis:tnt", {x: Math.floor(pos.x)+0.5, y: Math.floor(pos.y), z: Math.floor(pos.z)+0.5});
  if(source.getDynamicProperty("tnt") == 1) {
    tnt.triggerEvent("blue");
    tnt.addTag("blue");
  }
  tnt.owner = source;
  tnt.setDynamicProperty("power", lib.getScore(source, "power"));
  if(source.getDynamicProperty("bomb") == undefined) source.setDynamicProperty("bomb", 1);
  else source.setDynamicProperty("bomb", source.getDynamicProperty("bomb")+1);
})

//ボタン入力処理
mc.world.afterEvents.playerButtonInput.subscribe(data=>{
  if(mc.world.getDynamicProperty("status") != 2) return;
  let player = data.player;
  if(player.hasTag("dead")) return;
  if(player.getDynamicProperty("bomb") != undefined && player.getDynamicProperty("bomb") >= lib.getScore(player, "bomb")) return;
  if(player.dimension.getEntities({location: player.location, maxDistance:0.5, type:"altivelis:tnt"}).length > 0) return;
  let pos = player.location;
  let tnt = player.dimension.spawnEntity("altivelis:tnt", {x: Math.floor(pos.x)+0.5, y: Math.floor(pos.y), z: Math.floor(pos.z)+0.5});
  if(player.getDynamicProperty("tnt") == 1) {
    tnt.triggerEvent("blue");
    tnt.addTag("blue");
  }
  tnt.owner = player;
  tnt.setDynamicProperty("power", lib.getScore(player, "power"));
  tnt.dimension.playSound("fire.ignite", tnt.location, {volume: 10});
  if(player.getDynamicProperty("bomb") == undefined) player.setDynamicProperty("bomb", 1);
  else player.setDynamicProperty("bomb", player.getDynamicProperty("bomb")+1);
}, {buttons: [mc.InputButton.Jump], state: mc.ButtonState.Pressed})

//ワールド参加時処理
mc.world.afterEvents.playerSpawn.subscribe(data=>{
  if(!data.initialSpawn) return;
  if(data.player.hasTag("player")) data.player.removeTag("player");
  if(data.player.hasTag("dead")) data.player.removeTag("dead");
  if(data.player.hasTag("kick")) data.player.removeTag("kick");
  if(data.player.hasTag("punch")) data.player.removeTag("punch");
  data.player.setDynamicProperty("bomb", 0);
  data.player.teleport(roby, {rotation: {x:0, y:0}});
  /** @type {Number} */
  let index = mc.world.getDynamicProperty("stage");
  if(mc.world.getDynamicProperty("status") > 0) {
    data.player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Jump, false);
    data.player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.Sneak, false);
    data.player.inputPermissions.setPermissionCategory(mc.InputPermissionCategory.LateralMovement, false);
    let center = lib.getCenter(stage[index].area);
    data.player.camera.setCamera("minecraft:free", {location: {...center, y:center.y+12, z:center.z-3}, facingLocation: center});
    data.player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Hide, [mc.HudElement.Health, mc.HudElement.Hunger, mc.HudElement.ProgressBar]);
    data.player.playMusic("record.precipice", {fade: 1, loop: true, volume: 0.3});
  }
})