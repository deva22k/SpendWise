
"use strict";

// 1. Connect to Supabase

const SUPABASE_URL = "https://dgkrdvnhaztowloxukoz.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_l6uH5M6c43ivQauDvE1dxA_e3cqX6It";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

console.log("Supabase client initialized:", !!supabaseClient);


// Log out the current user

const logoutButton = document.getElementById("logout-button");

logoutButton.addEventListener("click", async function () {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert("Logout failed: " + error.message);
        return;
    }

    window.location.href = "auth.html";
});

// 2. Check login, then test the database

async function initializeApp() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Login session error:", error.message);
        window.location.href = "auth.html";
        return;
    }

    if (!data.session) {
        window.location.href = "auth.html";
        return;
    }

    console.log("Logged in user:", data.session.user.email);

    // 3. Test the database connection

    const { data: transactions, error: dbError } =
        await supabaseClient
            .from("transactions")
            .select("id")
            .limit(1);

    if (dbError) {
        console.error(
            "Database connection error:",
            dbError.message
        );
        return;
    }

    console.log(
        "Database connection successful:",
        transactions
    );
}

// 4. Run initialization

initializeApp();


// 1. Find HTML elements

const addButton = document.getElementById("addButton");
const dialog = document.getElementById("transaction-dialog");
const form = document.getElementById("transaction-form");

const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");

const balanceElement = document.getElementById("balance");
const incomeElement = document.getElementById("income");
const expensesElement = document.getElementById("expenses");

const cancelButton = document.getElementById("cancel-button");
const transactionSection = document.getElementById("transactions");
const transactionCountElement = document.getElementById("transaction-count");

const monthlySpentElement = document.getElementById("monthly-spent");
const budgetLimitElement = document.getElementById("budget-limit");
const budgetProgressElement = document.getElementById("budget-progress");
const budgetStatusElement = document.getElementById("budget-status");
const editBudgetButton = document.getElementById("edit-budget-button");
const budgetDialog = document.getElementById("budget-dialog");
const budgetForm = document.getElementById("budget-form");
const budgetAmountInput = document.getElementById("budget-amount");
const cancelBudgetButton = document.getElementById("cancel-budget-button");
// 2. Load saved transactions

let transactions = [];
let monthlyBudget = 10000;
let expenseChart = null;


// Save the new monthly budget


budgetForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const newBudget = Number(budgetAmountInput.value);

    if (!Number.isFinite(newBudget) || newBudget <= 0) {
        alert("Please enter a valid budget greater than zero.");
        return;
    }

    const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError || !sessionData.session) {
        alert("Please log in again.");
        window.location.href = "auth.html";
        return;
    }

    const userId = sessionData.session.user.id;

    const { error } = await supabaseClient
        .from("budgets")
        .upsert({
            user_id: userId,
            monthly_limit: newBudget,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error("Could not save budget:", error.message);
        alert("Could not save budget: " + error.message);
        return;
    }

    monthlyBudget = newBudget;

    updateDashboard();
    budgetDialog.close();

    alert("Monthly budget saved successfully!");
});


// 3. Open the transaction popup
// Open the budget editor

editBudgetButton.addEventListener("click", function () {
    budgetAmountInput.value = monthlyBudget;
    budgetDialog.showModal();
});

// Close the budget editor

cancelBudgetButton.addEventListener("click", function () {
    budgetDialog.close();
});

addButton.addEventListener("click", function () {
    form.reset();
    dialog.showModal();
});

// 4. Close the popup

cancelButton.addEventListener("click", function () {
    dialog.close();
});

// 5. Format amounts as Indian Rupees

function formatMoney(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(amount);
}

// 6. Save a new transaction


 // 6. Save a new transaction to Supabase

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const amount = Number(amountInput.value);
    const type = typeInput.value;
    const category = categoryInput.value;

    if (!title || !Number.isFinite(amount) || amount <= 0) {
        alert("Please enter a valid name and amount.");
        return;
    }

    const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError || !sessionData.session) {
        alert("Your session has expired. Please log in again.");
        window.location.href = "auth.html";
        return;
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await supabaseClient
        .from("transactions")
        .insert({
            user_id: userId,
            title: title,
            amount: amount,
            type: type,
            category: category,
            transaction_date: new Date().toLocaleDateString("en-CA")
        })
        .select()
        .single();

    if (error) {
        console.error("Could not save transaction:", error.message);
        alert("Could not save transaction: " + error.message);
        return;
    }

    transactions.unshift({
        id: data.id,
        title: data.title,
        amount: Number(data.amount),
        type: data.type,
        category: data.category,
        date: data.transaction_date
    });

    updateDashboard();

    dialog.close();
    form.reset();
});



async function loadTransactionsFromSupabase() {
    const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError || !sessionData.session) {
        window.location.href = "auth.html";
        return;
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await supabaseClient
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Could not load transactions:", error.message);
        alert("Could not load transactions from the cloud.");
        return;
    }

    transactions = data.map(function (item) {
        return {
            id: item.id,
            title: item.title,
            amount: Number(item.amount),
            type: item.type,
            category: item.category,
            date: item.transaction_date
        };
    });

    const { data: budgetData, error: budgetError } =
    await supabaseClient
        .from("budgets")
        .select("monthly_limit")
        .eq("user_id", userId)
        .maybeSingle();

if (budgetError) {
    console.error("Could not load budget:", budgetError.message);
    return;
}

if (budgetData) {
    monthlyBudget = Number(budgetData.monthly_limit);
} else {
    monthlyBudget = 10000;
}

updateDashboard();
}

// 7. Update dashboard and monthly budget

function updateDashboard() {
    let income = 0;
    let expenses = 0;

    // Calculate all-time income and expenses

    transactions.forEach(function (transaction) {
        if (transaction.type === "income") {
            income += transaction.amount;
        } else {
            expenses += transaction.amount;
        }
    });

    // Calculate expenses for the current month

    const now = new Date();

    const monthlyExpenses = transactions
        .filter(function (transaction) {
            const transactionDate = new Date(
    transaction.date + "T12:00:00"
);

            return (
                transaction.type === "expense" &&
                transactionDate.getMonth() === now.getMonth() &&
                transactionDate.getFullYear() === now.getFullYear()
            );
        })
        .reduce(function (total, transaction) {
            return total + transaction.amount;
        }, 0);

    // Update monthly budget display

 const budgetToDisplay = monthlyBudget;

    monthlySpentElement.textContent =
        formatMoney(monthlyExpenses) + " spent";

   budgetLimitElement.textContent = formatMoney(budgetToDisplay);

    const progress = Math.min(
    (monthlyExpenses / budgetToDisplay) * 100,
    100
);

    budgetProgressElement.style.width = progress + "%";

    // Update budget status

if (progress >= 100) {
    budgetStatusElement.textContent = "Budget exceeded";
} else if (progress >= 80) {
    budgetStatusElement.textContent = "Almost at limit";
} else {
    budgetStatusElement.textContent = "On track";
}

    // Update transaction count

    transactionCountElement.textContent =
        `${transactions.length} records`;

    // Update summary cards

    balanceElement.textContent = formatMoney(income - expenses);
    incomeElement.textContent = formatMoney(income);
    expensesElement.textContent = formatMoney(expenses);

    // Remove the previous transaction list

    const oldList = transactionSection.querySelector(".transaction-list");

    if (oldList) {
        oldList.remove();
    }

    const placeholder = transactionSection.querySelector(
        ".transaction-placeholder"
    );

    if (placeholder) {
        placeholder.remove();
    }

    // Create the transaction list

    const list = document.createElement("div");
    list.className = "transaction-list";

    if (transactions.length === 0) {
        list.textContent = "No transactions yet.";
    }

    transactions.forEach(function (transaction) {
        const row = document.createElement("div");
        row.className = "transaction-row";

        const info = document.createElement("div");

        const name = document.createElement("strong");
        name.textContent = transaction.title;

        const category = document.createElement("p");
        category.textContent = transaction.category;

        info.append(name, category);

       const amount = document.createElement("strong");

amount.textContent =
    (transaction.type === "income" ? "+" : "-") +
    formatMoney(transaction.amount);

amount.style.color =
    transaction.type === "income" ? "#67e8b8" : "#fb7185";

// Create a delete button
const deleteButton = document.createElement("button");

deleteButton.textContent = "Delete";
deleteButton.className = "delete-btn";
deleteButton.type = "button";

deleteButton.addEventListener("click", async function () {
    const confirmed = confirm(
        "Are you sure you want to delete this transaction?"
    );

    if (!confirmed) {
        return;
    }

    const { error } = await supabaseClient
        .from("transactions")
        .delete()
        .eq("id", transaction.id);

    if (error) {
        console.error("Could not delete transaction:", error.message);
        alert("Could not delete transaction: " + error.message);
        return;
    }

    transactions = transactions.filter(function (item) {
        return item.id !== transaction.id;
    });

    updateDashboard();
});


row.append(info, amount, deleteButton);
list.appendChild(row); 
    });

    transactionSection.appendChild(list);
    updateExpenseChart();
}

// 8. Display saved transactions on page load

loadTransactionsFromSupabase();

function updateExpenseChart() {
    const canvas = document.getElementById("expense-chart");

    if (!canvas || typeof Chart === "undefined") {
        console.error("Chart canvas or Chart.js library not found.");
        return;
    }

    const categoryTotals = {};

    transactions.forEach(function (transaction) {
        if (transaction.type !== "expense") {
            return;
        }

        categoryTotals[transaction.category] =
            (categoryTotals[transaction.category] || 0) +
            transaction.amount;
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    "#818cf8",
                    "#34d399",
                    "#fb7185",
                    "#fbbf24",
                    "#38bdf8",
                    "#c084fc",
                    "#fb923c"
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#cbd5e1",
                        padding: 16
                    }
                }
            }
        }
    });
}
