const fetch = require("node-fetch")

async function sendExpoPush({ to, title, body, data = {} }) {
  if (!to || !to.startsWith("ExponentPushToken")) return

  const message = {
    to,
    sound: "default",
    title,
    body,
    data,
  }

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  console.log('notification sending stataus '  , res.status);

  return res.json()
}

module.exports = sendExpoPush
