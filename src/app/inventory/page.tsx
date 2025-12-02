"use client";

import { useState } from "react";

export default function InventoryTestPage() {
  const [allItems, setAllItems] = useState<any[]>([]);
  const [singleItem, setSingleItem] = useState<any>(null);
  const [itemId, setItemId] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "food",
    price: "0",
    costPrice: "0",
    quantity: "0",
    minStockThreshold: "10",
  });

  async function fetchAll() {
    const res = await fetch("/api/inventory");
    const data = await res.json();
    console.log("All items:", data);
    setAllItems(data.items || []);
  }

  async function fetchSingle() {
    if (!itemId) return alert("Enter item ID first!");

    const res = await fetch(`/api/inventory/${itemId}`);
    const data = await res.json();
    console.log("Single item:", data);
    setSingleItem(data);
  }

  async function addItem() {
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    console.log("Item added:", data);
    alert("Item added! Check console.");
  }

  async function updateItem() {
    if (!itemId) return alert("Enter item ID first!");

    const res = await fetch(`/api/inventory/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    console.log("Item updated:", data);
    alert("Item updated! Check console.");
  }

  async function deleteItem() {
    if (!itemId) return alert("Enter item ID first!");

    const res = await fetch(`/api/inventory/${itemId}`, {
      method: "DELETE",
    });

    const data = await res.json();
    console.log("Item deleted:", data);
    alert("Item deleted! Check console.");
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Inventory API Tester</h1>

      {/* === Fetch all === */}
      <button onClick={fetchAll}>Fetch All Items</button>
      <pre>{JSON.stringify(allItems, null, 2)}</pre>

      <hr />

      {/* === Single ID input === */}
      <h3>Item ID</h3>
      <input
        value={itemId}
        onChange={(e) => setItemId(e.target.value)}
        placeholder="Enter item ID"
      />
      <br />
      <button onClick={fetchSingle}>Fetch Single Item</button>
      <button onClick={updateItem}>Update Item</button>
      <button onClick={deleteItem}>Delete Item</button>

      <pre>{JSON.stringify(singleItem, null, 2)}</pre>

      <hr />

      {/* === Add/Update Form === */}
      <h3>Add / Update Item</h3>

      {Object.keys(form).map((key) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <label>
            {key}
            <input
              value={(form as any)[key]}
              onChange={(e) =>
                setForm((f) => ({ ...f, [key]: e.target.value }))
              }
              style={{ marginLeft: 10 }}
            />
          </label>
        </div>
      ))}

      <button onClick={addItem}>Add New Item</button>
    </div>
  );
}
