const mongoose = require("mongoose")

const applicationSchema = new mongoose.Schema({

    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student"
    },

    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    },

    role: String,

    status: {
        type: String,
        default: "Applied"
    },

    application_date: {
        type: Date,
        default: Date.now
    }

})

module.exports = mongoose.model("Application", applicationSchema)