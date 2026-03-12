const jwt = require("jsonwebtoken")

module.exports = function (req, res, next) {
    const token = req.headers["authorization"]
    if (!token) return res.status(401).json({ msg: "No token" })
    const decoded = jwt.verify(token, "secretkey")
    req.user = decoded
    next()
}