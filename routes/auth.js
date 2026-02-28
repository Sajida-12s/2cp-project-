const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

router.post("/signin", async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ message: "Phone and password required" });
        }

        // Finding the employee !! 
        const [rows] = await db.query(
            "SELECT * FROM employees WHERE phone = ?",
            [phone]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: "employee not found " });
        }

        const employee = rows[0];

        // 2️
        const isMatch = await bcrypt.compare(password, employee.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid or wrong password " });
        }

        // setting something 
        const token = jwt.sign(
            { id: employee.id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            employee: {
                id: employee.id,
                name: employee.name,
                phone: employee.phone
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;