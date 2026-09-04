const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Expense = require("./models/Expense");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
console.log("Trying to connect to MongoDB...");

mongoose
    .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000
    })
    .then(() => {
        console.log("MongoDB connected successfully!");
    })
    .catch((error) => {
        console.error("MongoDB connection failed:");
        console.error(error.message);
    });

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Groww Code backend is running!",
        database: "MongoDB"
    });
});

app.get("/api/expenses", async (req, res) => {
    try {
        const expenses = await Expense.find();
        res.json(expenses);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch expenses"
        });
    }
});

app.post("/api/expenses", async (req, res) => {
    try {
        const { title, amount, category } = req.body;

        const newExpense = new Expense({
            title,
            amount,
            category
        });

        const savedExpense = await newExpense.save();

        res.status(201).json(savedExpense);
    } catch (error) {
        res.status(500).json({
            message: "Failed to create expense"
        });
    }
});

app.delete("/api/expenses/:id", async (req, res) => {
    try {
        const deletedExpense = await Expense.findByIdAndDelete(req.params.id);

        if (!deletedExpense) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        res.json({
            message: "Expense deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete expense"
        });
    }
});

app.put("/api/expenses/:id", async (req, res) => {
    try {
        const { title, amount, category } = req.body;

        const updatedExpense = await Expense.findByIdAndUpdate(
            req.params.id,
            {
                title,
                amount,
                category
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedExpense) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        res.json(updatedExpense);
    } catch (error) {
        res.status(500).json({
            message: "Failed to update expense"
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});