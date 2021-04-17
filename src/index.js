const express = require("express");
const { v4: uuid } = require("uuid");
const app = express();
const PORT = 3333;
app.use(express.json());

const customers = [];

function verifyIfAccountExistsByID(req, res, next) {
	const { id } = req.headers;

	const selectedCustomer = customers.find((customer) => customer.id === id);

	if (!selectedCustomer) {
		return res.status(400).json({ error: "Id not found" });
	}

	req.currentCustomer = selectedCustomer;

	next();
}

const vefifyAccountExistsMiddlewareRegex = /\/(statement|deposit|withdraw|balance)/;

app.use(vefifyAccountExistsMiddlewareRegex, verifyIfAccountExistsByID);

function getBalanceFromAccount(account) {
	const { statement } = account;

	const totalBalance = statement.reduce((sum, transaction) => {
		const { type, amount } = transaction;

		if (type === "credit") return sum + amount;
		else return sum - amount;
	}, 0);

	return totalBalance;
}

app.post("/account", (req, res) => {
	const { cpf, name } = req.body;

	const cpfAlreadyRegistered = customers.some(
		(customer) => customer.cpf === cpf
	);

	if (cpfAlreadyRegistered) {
		return res
			.status(400)
			.json({ error: "CPF already registered with an account" });
	}

	const newAccount = {
		id: uuid(),
		name,
		cpf,
		statement: [],
	};

	customers.push(newAccount);
	return res.json(newAccount);
});

app.get("/statement", (req, res) => {
	const { currentCustomer } = req;

	const statement = {
		name: currentCustomer.name,
		statement: currentCustomer.statement,
	};

	return res.json(statement);
});

app.post("/deposit", (req, res) => {
	const { description, amount } = req.body;
	const { currentCustomer } = req;

	const newDeposit = {
		description,
		amount: parseFloat(amount),
		created_at: new Date(),
		type: "credit",
	};

	currentCustomer.statement.push(newDeposit);
	return res.json(newDeposit);
});

app.post("/withdraw", (req, res) => {
	const { amount } = req.body;
	const { currentCustomer } = req;

	const balance = getBalanceFromAccount(currentCustomer);

	if (balance < parseFloat(amount)) {
		return res.status(400).json({ error: "Not enough funds" });
	}

	const newWithdraw = {
		description: "Withdraw",
		amount: parseFloat(amount),
		created_at: new Date(),
		type: "debit",
	};

	currentCustomer.statement.push(newWithdraw);
	return res.json(newWithdraw);
});

app.delete("/account", verifyIfAccountExistsByID, (req, res) => {
	const { currentCustomer } = req;

	const selectedIndex = customers.findIndex(
		(customer) => customer.id === currentCustomer.id
	);
	customers.splice(selectedIndex, 1);

	return res.status(205).send();
});

app.get("/account", (req, res) => {
	return res.json(customers);
});

app.get("/balance", (req, res) => {
	const { currentCustomer } = req;
	const balance = getBalanceFromAccount(currentCustomer);
	return res.json({ balance });
});

app.listen(PORT, () => console.log(`🙌 Server started at port: ${PORT} 🙌`));
