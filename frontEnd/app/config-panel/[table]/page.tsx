'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from "./table.module.css";
import variables from "../../variables.json";
 function TablePage() {
  const { table } = useParams();
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editIndex, setEditIndex] = useState(null);
  const [newRow, setNewRow] = useState({});
  const [editRow, setEditRow] = useState({});
  const [showAttrInput, setShowAttrInput] = useState(false);
  const [newAttribute, setNewAttribute] = useState("");
  const dbName = "scout_system";

  useEffect(() => {
    const fetchTableData = async () => {
      try {
        const res = await fetch(`${variables.get_table}/get-table/${dbName}/${table}`);
        const result = await res.json();

        if (res.ok) {
          setColumns(result.columns);
          setRows(result.rows);
        } else {
          console.error('Failed to fetch table data', result.error);
        }
      } catch (err) {
        console.error('Error fetching table data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTableData();
  }, [table]);

  const handleEdit = (index) => {
    setEditIndex(index);
    setEditRow(rows[index]);
  };

  const handleDelete = async (index) => {
    const rowToDelete = rows[index];
    const res = await fetch(`${variables.get_table}/delete-row/${dbName}/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rowToDelete),
    });

    if (res.ok) {
      const newRows = [...rows];
      newRows.splice(index, 1);
      setRows(newRows);
    } else {
      console.error('Failed to delete row');
    }
  };

  const handleSave = async (index) => {
    const res = await fetch(`${variables.get_table}/update-row/${dbName}/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldRow: rows[index], newRow: editRow }),
    });

    if (res.ok) {
      const updatedRows = [...rows];
      updatedRows[index] = editRow;
      setRows(updatedRows);
      setEditIndex(null);
    } else {
      console.error('Failed to save row');
    }
  };

  const handleAddRow = async () => {
  if (Object.keys(newRow).length === 0) {
    console.error("newRow is empty, aborting add");
    return;
  }

  const res = await fetch(`${variables.get_table}/add-row/${dbName}/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRow),
  });

  console.log("newRow being sent:", newRow);

  if (res.ok) {
    const addedRow = await res.json();
    setRows([...rows, addedRow]);
    setNewRow({});
  } else {
    console.error('Failed to add row');
  }
};
const handleAddAttribute = async () => {
  if (!newAttribute.trim()) {
    console.error("Attribute name is empty");
    return;
  }

  const payload = { columnName: newAttribute };

  try {
    const res = await fetch(`${variables.get_table}/add-attribute/${dbName}/${table}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (res.ok) {
      setColumns([...columns, newAttribute]);
      setNewAttribute("");
      setShowAttrInput(false);
    } else {
      console.error("Failed to add attribute", result);
    }
  } catch (err) {
    console.error("Error adding attribute:", err);
  }
};

  if (loading) return (
      <div className={styles.loading_container}>
        <div className={styles.loading_spinner}></div>
      </div>
    );

  return (
    <div className={styles.table_container}>
      <h1 className={styles.table_header}>{(Array.isArray(table) ? table[0] : table).replace("_", " ")} Table</h1>
      <button onClick={handleAddRow} className={styles.add_row_btn}>Add Row</button>

      <table className={styles.data_table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} className={styles.table_header_cell}>{col}</th>
            ))}
            <th className={styles.actions_column}>Actions</th>
          </tr>
          <tr className={styles.input_row}>
            {columns.map((col) => (
              <td key={col}>
                <input
                  className={styles.input_field}
                  value={newRow[col] || ''}
                  onChange={(e) => setNewRow({ ...newRow, [col]: e.target.value })}
                  placeholder={col}
                />
              </td>
            ))}
            <td></td>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col) => (
                <td key={col} className={styles.table_cell}>
                  {editIndex === rowIndex ? (
                    <input
                      className={styles.input_field}
                      value={editRow[col]||''}
                      onChange={(e) => setEditRow({ ...editRow, [col]: e.target.value })}
                    />
                  ) : (
                    row[col]
                  )}
                </td>
              ))}
              <td>
                {editIndex === rowIndex ? (
                  <button className={styles.save_btn} onClick={() => handleSave(rowIndex)}>Save</button>
                ) : (
                  <>
                    <button className={styles.edit_btn} onClick={() => handleEdit(rowIndex)}>Edit</button>
                    <button className={styles.delete_btn} onClick={() => handleDelete(rowIndex)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => setShowAttrInput(true)} className={styles.add_attr_btn}>Add Attribute</button>
        {showAttrInput && (
          <div className={styles.attr_input_container}>
            <input
              type="text"
              value={newAttribute||''}
              onChange={(e) => setNewAttribute(e.target.value)}
              placeholder="Enter new attribute name"
              className={styles.input_field}
            />
            <button onClick={handleAddAttribute} className={styles.confirm_attr_btn}>Confirm</button>
          </div>
        )}
    </div>
  );
}
export default TablePage;