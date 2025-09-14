import * as mc from "@minecraft/server";
import { lobby } from "../const";

mc.system.beforeEvents.startup.subscribe(data => {
  /**
   * @type {mc.CustomCommand}
   */
  const lobbyCommand = {
    name: "tntr:lobby",
    description: "ロビーへてテレポートします",
    permissionLevel: mc.CommandPermissionLevel.Any,
    mandatoryParameters: [],
    optionalParameters: [],
  }
  data.customCommandRegistry.registerCommand(lobbyCommand, (origin) => {
    if (mc.world.getDynamicProperty("status") != 0) {
      return {
        status: mc.CustomCommandStatus.Failure,
        message: "このコマンドはゲーム中に使用できません"
      }
    }
    if (origin.sourceEntity === undefined) {
      return {
        status: mc.CustomCommandStatus.Failure,
        message: "このコマンドはプレイヤーのみが使用できます。"
      }
    }
    mc.system.run(() => {
      origin.sourceEntity.teleport(lobby, {rotation: {x: 0, y: 0}});
    })
    return {
      status: mc.CustomCommandStatus.Success,
      message: "ロビーにテレポートしました"
    }
  })
})