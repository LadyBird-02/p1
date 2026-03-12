const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const Student = require("./Student")
const Company = require("./Company")
const Application = require("./Application")
const auth = require("./authMiddleware")

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static("public"))

mongoose.connect("mongodb+srv://123ad0016_db_user:1234@cluster0.hkv4sot.mongodb.net/?appName=Cluster0")
    .then(() => console.log("MongoDB connected"))

/* REGISTER STUDENT */

app.post("/student/register", async (req, res) => {

    const { name, roll_no, department, cgpa, skills, password } = req.body

    const hashed = await bcrypt.hash(password, 10)

    const student = new Student({
        name,
        roll_no,
        department,
        cgpa,
        skills,
        password: hashed
    })

    await student.save()

    res.json({ message: "Student Registered" })
})

/* LOGIN */

app.post("/login", async (req, res) => {

    const { roll_no, password } = req.body

    const student = await Student.findOne({ roll_no })

    if (!student) return res.status(400).json({ msg: "Student not found" })

    const valid = await bcrypt.compare(password, student.password)

    if (!valid) return res.status(400).json({ msg: "Wrong password" })

    const token = jwt.sign(
        { id: student._id, role: "student" },
        "secretkey"
    )

    res.json({ token, role: "student" })
})

/* ADD COMPANY (ADMIN) */

app.post("/company/add", async (req, res) => {

    const company = new Company(req.body)

    await company.save()

    res.json({ msg: "Company added" })
})

/* GET COMPANIES */

app.get("/companies", async (req, res) => {

    const companies = await Company.find()

    res.json(companies)
})

/* APPLY FOR JOB */

app.post("/apply", auth, async (req, res) => {

    const application = new Application({
        student: req.user.id,
        company: req.body.company,
        role: req.body.role
    })

    await application.save()

    res.json({ msg: "Applied successfully" })
})

/* GET CURRENT STUDENT */

app.get("/student/me", auth, async (req, res) => {

    const student = await Student.findById(req.user.id)

    res.json(student)

})

/* MY APPLICATIONS */

app.get("/myapplications", auth, async (req, res) => {

    const apps = await Application.find({ student: req.user.id })

    res.json(apps)

})

/* VIEW APPLICATIONS */

app.get("/applications", async (req, res) => {

    const apps = await Application
        .find()
        .populate("student")
        .populate("company")

    res.json(apps)
})

app.listen(3000, () => console.log("Server running on port 3000"))