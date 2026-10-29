
"use strict";

// ==========================================
// 1. INITIAL INVENTORY AND STORAGE
// ==========================================

const STORAGE_KEY = "productFlowInventory";

const initialProducts = [
    { id: 1, name: "Laptop", price: 800 },
    { id: 2, name: "Mouse", price: 25 }
];

let inventory = loadInventory();

function loadInventory() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (savedData === null) {
            return initialProducts.map(product => ({ ...product }));
        }

        const parsedData = JSON.parse(savedData);

        if (!Array.isArray(parsedData)) {
            return initialProducts.map(product => ({ ...product }));
        }

        return parsedData.filter(product =>
            product &&
            Number.isSafeInteger(product.id) &&
            product.id > 0 &&
            typeof product.name === "string" &&
            product.name.trim() !== "" &&
            product.name.length <= 80 &&
            typeof product.price === "number" &&
            Number.isFinite(product.price) &&
            product.price > 0 &&
            product.price <= 1000000000
        );
    } catch (error) {
        console.error("Could not load saved inventory:", error);
        return initialProducts.map(product => ({ ...product }));
    }
}

function saveInventory() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
        return true;
    } catch (error) {
        console.error("Could not save inventory:", error);
        showMessage(
            "Changes could not be saved in browser storage.",
            true
        );
        return false;
    }
}

// ==========================================
// 2. GET HTML ELEMENTS
// ==========================================

const productForm = document.getElementById("productForm");
const productNameInput = document.getElementById("productName");
const productPriceInput = document.getElementById("productPrice");
const formMessage = document.getElementById("formMessage");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortOrder = document.getElementById("sortOrder");

const productTableBody = document.getElementById("productTableBody");
const emptyState = document.getElementById("emptyState");
const productCount = document.getElementById("productCount");

const totalProductsElement = document.getElementById("totalProducts");
const totalValueElement = document.getElementById("totalValue");
const budgetProductsElement = document.getElementById("budgetProducts");
const affordableProductsElement = document.getElementById("affordableProducts");

const reportProductCount = document.getElementById("reportProductCount");
const reportTotalValue = document.getElementById("reportTotalValue");
const affordableNames = document.getElementById("affordableNames");
const exportButton = document.getElementById("exportButton");

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

function formatCurrency(amount) {
    return currencyFormatter.format(amount);
}

function getCategory(price) {
    if (price < 50) {
        return "Budget";
    } else if (price < 500) {
        return "Standard";
    } else {
        return "Premium";
    }
}

function showMessage(message, isError = false) {
    formMessage.textContent = message;
    formMessage.classList.toggle("error", isError);
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

// ==========================================
// 4. ADD A PRODUCT
// ==========================================

productForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = productNameInput.value.trim();
    const price = Number(productPriceInput.value);

    if (name === "") {
        showMessage("Please enter a product name.", true);
        productNameInput.focus();
        return;
    }

    if (
        productPriceInput.value.trim() === "" ||
        !Number.isFinite(price) ||
        price <= 0 ||
        price > 1000000000
    ) {
        showMessage(
            "Enter a valid price greater than ₹0 and no more than ₹1,000,000,000.",
            true
        );
        productPriceInput.focus();
        return;
    }

    if (inventory.length >= 10000) {
        showMessage("The inventory has reached its product limit.", true);
        return;
    }

    const newProduct = {
        id: Date.now(),
        name: name,
        price: price
    };

    // Avoid duplicate IDs if two products are added quickly.
    while (inventory.some(product => product.id === newProduct.id)) {
        newProduct.id++;
    }

    inventory.push(newProduct);
    saveInventory();
    renderDashboard();

    showMessage(`${name} was added successfully!`);
    productForm.reset();
    productNameInput.focus();
});

// ==========================================
// 5. CALCULATE INVENTORY ANALYTICS
// ==========================================

function calculateTotal(items) {
    return items.reduce((total, item) => total + item.price, 0);
}

function updateAnalytics() {
    const totalValue = calculateTotal(inventory);

    const budgetProducts = inventory.filter(
        product => product.price < 50
    );

    const affordableProducts = inventory.filter(
        product => product.price < 200
    );

    totalProductsElement.textContent = inventory.length;
    totalValueElement.textContent = formatCurrency(totalValue);
    budgetProductsElement.textContent = budgetProducts.length;
    affordableProductsElement.textContent = affordableProducts.length;

    reportProductCount.textContent = inventory.length;
    reportTotalValue.textContent = formatCurrency(totalValue);

    affordableNames.replaceChildren();

    if (affordableProducts.length === 0) {
        affordableNames.textContent = "No affordable products yet";
    } else {
        affordableProducts.forEach(product => {
            const tag = createElement("span", "name-tag", product.name);
            affordableNames.appendChild(tag);
        });
    }
}

// ==========================================
// 6. RENDER THE PRODUCT TABLE
// ==========================================

function renderProducts() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedSort = sortOrder.value;

    let visibleProducts = inventory.filter(product => {
        const matchesSearch = product.name
            .toLowerCase()
            .includes(searchTerm);

        const matchesCategory =
            selectedCategory === "all" ||
            getCategory(product.price) === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    if (selectedSort === "low-high") {
        visibleProducts.sort((a, b) => a.price - b.price);
    } else if (selectedSort === "high-low") {
        visibleProducts.sort((a, b) => b.price - a.price);
    }

    productTableBody.replaceChildren();

    visibleProducts.forEach(product => {
        const row = document.createElement("tr");

        // Product name and initial
        const nameCell = document.createElement("td");
        const initial = createElement(
            "span",
            "product-initial",
            product.name.charAt(0).toUpperCase()
        );
        initial.setAttribute("aria-hidden", "true");

        const nameText = createElement(
            "span",
            "product-name",
            product.name
        );

        nameCell.append(initial, nameText);

        // Price
        const priceCell = createElement(
            "td",
            "price-cell",
            formatCurrency(product.price)
        );

        // Category badge
        const categoryCell = document.createElement("td");
        const category = getCategory(product.price);

        const badge = createElement(
            "span",
            `category-badge category-${category.toLowerCase()}`,
            category
        );

        categoryCell.appendChild(badge);

        // Delete button
        const actionCell = document.createElement("td");
        const deleteButton = createElement(
            "button",
            "delete-button",
            "Delete"
        );

        deleteButton.type = "button";
        deleteButton.setAttribute(
            "aria-label",
            `Delete ${product.name}`
        );

        deleteButton.addEventListener("click", function () {
            deleteProduct(product.id);
        });

        actionCell.appendChild(deleteButton);

        row.append(nameCell, priceCell, categoryCell, actionCell);
        productTableBody.appendChild(row);
    });

    emptyState.hidden = visibleProducts.length > 0;

    productCount.textContent =
        `${visibleProducts.length} of ${inventory.length} products`;
}

// ==========================================
// 7. DELETE A PRODUCT
// ==========================================

function deleteProduct(id) {
    const product = inventory.find(item => item.id === id);

    if (!product) {
        return;
    }

    const confirmed = window.confirm(
        `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) {
        return;
    }

    inventory = inventory.filter(item => item.id !== id);

    saveInventory();
    renderDashboard();
    showMessage(`${product.name} was deleted.`);
}

// ==========================================
// 8. RENDER THE ENTIRE DASHBOARD
// ==========================================

function renderDashboard() {
    updateAnalytics();
    renderProducts();
}

// ==========================================
// 9. SEARCH, FILTER, AND SORT EVENTS
// ==========================================

searchInput.addEventListener("input", renderProducts);

categoryFilter.addEventListener("change", renderProducts);

sortOrder.addEventListener("change", renderProducts);

// ==========================================
// 10. EXPORT INVENTORY AS A CSV FILE
// ==========================================

function escapeCSV(value) {
    const text = String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

exportButton.addEventListener("click", function () {
    const headers = ["Product Name", "Price (INR)", "Category"];

    const rows = inventory.map(product => [
        product.name,
        product.price.toFixed(2),
        getCategory(product.price)
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(escapeCSV).join(","))
        .join("\r\n");

    // UTF-8 BOM helps spreadsheet programs display text correctly.
    const blob = new Blob(["\uFEFF", csvContent], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "product-inventory-report.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
});

// ==========================================
// 11. START THE APPLICATION
// ==========================================

renderDashboard();

console.log("Product Inventory Dashboard is ready!");
console.log("Initial inventory:", inventory);
