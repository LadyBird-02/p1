const mongoose = require("mongoose")

const companySchema = new mongoose.Schema({

    company_name: String,
    role: String,
    min_cgpa: Number,
    package: Number

})

module.exports = mongoose.model("Company", companySchema)