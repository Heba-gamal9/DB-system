import os
import sqlite3
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from gevent.pywsgi import WSGIServer
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from werkzeug.utils import secure_filename

scout = Flask(__name__)
scout.secret_key = os.urandom(24)
uploaded_db_path = "scout_system.db"
CORS(scout)

UPLOAD_FOLDER = os.path.dirname(os.path.abspath(__file__))
scout.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def get_uploaded_session():
    global uploaded_db_path
    if not uploaded_db_path or not os.path.exists(uploaded_db_path):
        raise Exception("No database uploaded or file not found")

    engine = create_engine(f"sqlite:///{uploaded_db_path}")
    Session = sessionmaker(bind=engine)
    return Session()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'db', 'sqlite'}

@scout.route('/upload-sqlite', methods=['POST'])
def upload_sqlite():
    global uploaded_db_path

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(scout.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        uploaded_db_path = filepath
        return jsonify({"message": "File uploaded successfully"})

    return jsonify({"error": "Invalid file format"}), 400
#new table
@scout.route('/get-tables/<db_name>', methods=['GET'])
def get_tables(db_name):
    db_file = f"{db_name}.db"

    # اتأكد إن الملف موجود
    if not os.path.exists(db_file):
        return jsonify({"error": f"Database '{db_file}' does not exist."}), 404

    try:
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()

        # get table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]

        conn.close()
        return jsonify(tables)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@scout.route('/create-table/<db_name>', methods=['POST'])
def create_table(db_name):
    if not request.is_json:
        return jsonify({"error": "Expected JSON format"}), 415

    data = request.get_json()
    table_name = data.get("name")

    if not table_name:
        return jsonify({"error": "Table name is required."}), 400

    if not table_name.replace("_", "").isalnum():
        return jsonify({"error": "Invalid table name."}), 400

    uploaded_db_path = f"{db_name}.db"
    if not os.path.exists(uploaded_db_path):
        return jsonify({"error": f"Database '{db_name}' does not exist."}), 404

    try:
        conn = sqlite3.connect(uploaded_db_path)
        cursor = conn.cursor()
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS "{table_name}" (
                id INTEGER PRIMARY KEY AUTOINCREMENT
            );
        """)
        conn.commit()
        conn.close()
        return jsonify({"message": f"Table '{table_name}' created successfully in database '{db_name}'."}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
@scout.route('/delete-table/<db_name>', methods=['DELETE'])
def delete_table(db_name):
    if not request.is_json:
        return jsonify({"error": "Expected JSON format"}), 415

    data = request.get_json()
    table_name = data.get("name")

    if not table_name:
        return jsonify({"error": "Table name is required."}), 400

    if not os.path.exists(uploaded_db_path):
        return jsonify({"error": f"Database '{db_name}' does not exist."}), 404

    try:
        conn = sqlite3.connect(uploaded_db_path)
        cursor = conn.cursor()
        cursor.execute(f'DROP TABLE IF EXISTS "{table_name}"')
        conn.commit()
        conn.close()
        return jsonify({"message": f"Table '{table_name}' deleted successfully."}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

#new table edit
def get_connection(db_name):
    conn = sqlite3.connect(f"./{db_name}.db")
    conn.row_factory = sqlite3.Row
    return conn, conn.cursor()
def close_connection(conn):
    conn.commit()
    conn.close()
@scout.route("/get-table/<db_name>/<table_name>", methods=["GET"])
def get_table(db_name, table_name):
    try:
        conn, cur = get_connection(db_name)
        cur.execute(f"SELECT * FROM {table_name}")
        rows = [dict(row) for row in cur.fetchall()]
        columns = [col[0] for col in cur.description]
        return jsonify({"columns": columns, "rows": rows})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@scout.route("/add-row/<db_name>/<table_name>", methods=["POST"])
def add_row(db_name, table_name):
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        keys = ', '.join(data.keys())
        placeholders = ', '.join(['?'] * len(data))
        values = list(data.values())
        conn, cur = get_connection(db_name)
        cur.execute(f"INSERT INTO {table_name} ({keys}) VALUES ({placeholders})", values)
        conn.commit()

        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@scout.route("/update-row/<db_name>/<table_name>", methods=["POST"])
def update_row(db_name, table_name):
    try:
        content = request.json
        old_row = content["oldRow"]
        new_row = content["newRow"]

        set_clause = ', '.join([f"{col} = ?" for col in new_row.keys()])
        where_clause = ' AND '.join([f"{col} = ?" for col in old_row.keys()])

        values = list(new_row.values()) + list(old_row.values())

        conn, cur = get_connection(db_name)
        cur.execute(f"UPDATE {table_name} SET {set_clause} WHERE {where_clause}", values)
        conn.commit()
        return jsonify({"message": "Row updated"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@scout.route("/delete-row/<db_name>/<table_name>", methods=["POST"])
def delete_row(db_name, table_name):
    try:
        row = request.json
        where_clause = ' AND '.join([f"{col} = ?" for col in row.keys()])
        values = list(row.values())

        conn, cur = get_connection(db_name)
        cur.execute(f"DELETE FROM {table_name} WHERE {where_clause}", values)
        conn.commit()
        return jsonify({"message": "Row deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@scout.route("/add-attribute/<db_name>/<table_name>", methods=["POST"])
def add_attribute(db_name, table_name):
    data = request.get_json()
    column_name = data.get("columnName")
    if not column_name:
        return jsonify({"error": "No column name provided"}), 400

    try:
        conn, cur = get_connection(db_name)

        cur.execute(f"PRAGMA table_info({table_name})")
        existing_columns = [column["name"] for column in cur.fetchall()]
        if column_name in existing_columns:
            return jsonify({"error": f"Column '{column_name}' already exists."}), 400

        cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} TEXT;")
        close_connection(conn)

        return jsonify({"message": "Column added successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':

    http_server = WSGIServer(
        ('0.0.0.0', 3001),
        scout,
        keyfile=r"D:\كشافة الامل\DB-system-scout\private.key",
        certfile=r"D:\كشافة الامل\DB-system-scout\cert.crt"
    )
    try:
        print("Starting server...")
        http_server.serve_forever()
    except Exception as e:
        print(f"Error starting server... {e}")