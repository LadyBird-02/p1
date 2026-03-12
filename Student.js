const mongoose = require("mongoose")

const studentSchema = new mongoose.Schema({

    name: String,
    roll_no: String,
    department: String,
    cgpa: Number,
    skills: String,
    password: String

})

module.exports = mongoose.model("Student", studentSchema)