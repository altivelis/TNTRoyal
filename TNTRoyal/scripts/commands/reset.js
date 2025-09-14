import * as mc from "@minecraft/server";
import { lobby, stage } from "../const";
import * as lib from "../lib";

mc.system.beforeEvents.startup.subscribe(data => {
  /**
   * @type {mc.CustomCommand}
   */
  const resetCommand = {
    name: "tntr:reset",
    description: "完全にゲームをリセットします。※バグなどの緊急時にご利用ください。",
    permissionLevel: mc.CommandPermissionLevel.Host,
    mandatoryParameters: [],
    optionalParameters: [],
  }
  data.customCommandRegistry.registerCommand(resetCommand, (origin) => {
    mc.system.run(() => {
      mc.world.getPlayers().forEach(player=>{
        player.removeTag("player");
        player.removeTag("dead");
        player.removeTag("kick");
        player.removeTag("punch");
        player.removeTag("tp");
        player.removeTag("spider_web");
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
        player.teleport(lobby, {rotation: {x:0, y:0}});
        player.onScreenDisplay.setHudVisibility(mc.HudVisibility.Reset, [mc.HudElement.Health, mc.HudElement.Hotbar, mc.HudElement.Hunger, mc.HudElement.ProgressBar]);
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
    })
    return {
      status: mc.CustomCommandStatus.Success,
      message: "ゲームをリセットしました"
    }
  })
})