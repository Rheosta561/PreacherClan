const User = require("../Models/User")

exports.savePushToken = async (req, res) => {
  try {
    const { token , userId } = req.body

    if (!token || !token.startsWith("ExponentPushToken")) {
      return res.status(400).json({ message: "Invalid push token" })
    }

    await User.findByIdAndUpdate(userId, {
      pushToken: token,
    })

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: "Failed to save token" })
  }
}
