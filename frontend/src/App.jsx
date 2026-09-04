import { useEffect, useState } from "react";

function App() {
  const [expenses, setExpenses] = useState([]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/expenses")
      .then((response) => response.json())
      .then((data) => {
        setExpenses(data);
      })
      .catch((error) => {
        console.error("Error fetching expenses:", error);
      });
  }, []);

  const addExpense = async (event) => {
    event.preventDefault();

    const response = await fetch("http://localhost:5000/api/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        amount: Number(amount),
        category,
      }),
    });

    const newExpense = await response.json();

    setExpenses([...expenses, newExpense]);

    setTitle("");
    setAmount("");
    setCategory("");
  };
  const deleteExpense = async (id) => {
  try {
    await fetch(`http://localhost:5000/api/expenses/${id}`, {
      method: "DELETE",
    });

    setExpenses(expenses.filter((expense) => expense._id !== id));
  } catch (error) {
    console.error("Error deleting expense:", error);
  }
};
  
  return (
    <div>
      <h1>Expense Tracker</h1>

      <form onSubmit={addExpense}>
        <input
          type="text"
          placeholder="Expense title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />

        <input
          type="text"
          placeholder="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />

        <button type="submit">Add Expense</button>
      </form>

      <hr />

{expenses.map((expense) => (
  <div key={expense._id}>
    <h3>{expense.title}</h3>
    <p>₹{expense.amount}</p>
    <p>{expense.category}</p>

    <button onClick={() => deleteExpense(expense._id)}>
      Delete
    </button>
  </div>
))}
    </div>
  );
}

export default App;