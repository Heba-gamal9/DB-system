"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from "./page.module.css";
import variables from "./variables.json";

function Table() {
  const [tables, setTables] = useState([]);
  const [newTable, setNewTable] = useState("");
  const dbName = "scout_system";

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await fetch(`${variables.get_table}/get-tables/${dbName}`);
        const result = await res.json();

        if (res.ok) {
          setTables(result);
        } else {
          console.error("Failed to load tables", result.error);
        }
      } catch (err) {
        console.error("Error fetching tables:", err);
      }
    };

    fetchTables();
  }, []);

  const handleAddTable = async () => {
    if (newTable.trim() === "") return;

    if (tables.includes(newTable)) {
      alert("Table already exists.");
      return;
    }

    try {
      const response = await fetch(`${variables.get_table}/create-table/${dbName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: newTable })
      });

      const result = await response.json();

      if (response.ok) {
        setTables(prev => [...prev, newTable]);
        setNewTable("");
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      console.error("Failed to create table:", error);
      alert("Server error");
    }
  };

  const handleDeleteTable = async (tableName) => {
    const confirmDelete = confirm(`Are you sure you want to delete table "${tableName}"?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${variables.get_table}/delete-table/${dbName}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: tableName })
      });

      const result = await res.json();
      if (res.ok) {
        setTables(prev => prev.filter(t => t !== tableName));
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      console.error("Failed to delete table:", error);
      alert("Server error");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Choose a Table</h1>

      <div className={styles.tableList}>
        {tables.map((table) => (
          <div key={table} className={styles.tableCard}>
            <span className={styles.tableName}>{table.replace("_", " ")} Table</span>
            <div className={styles.buttonGroup}>
              <Link href={`/config-panel/${table}`}>
                <button className={styles.viewButton}>View</button>
              </Link>
              <button
                onClick={() => handleDeleteTable(table)}
                className={styles.deleteButton}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.addForm}>
        <input
          type="text"
          placeholder="Enter new table name"
          value={newTable}
          onChange={(e) => setNewTable(e.target.value)}
          className={styles.inputField}
        />
        <button onClick={handleAddTable} className={styles.addButton}>
          Add New Table
        </button>
      </div>
    </div>
  );
}

export default Table;
