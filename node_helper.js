const NodeHelper = require("node_helper")

module.exports = NodeHelper.create({

  async notificationReceived(notification, payload, sender) {
    if (sender) {
      Log.log(this.name + " received a module notification: " + notification + " from sender: " + sender.name + " Payload:" + JSON.stringify(payload));
      this.sendSocketNotification('EXAMPLE_NOTIFICATION', { notificaation: notification, sender, payload });
    } else {
      Log.log(this.name + " received a system notification: " + notification + " Payload:" + JSON.stringify(payload));
      this.sendSocketNotification('EXAMPLE_NOTIFICATION', { notificaation: notification, sender, payload });
    }
  },
})