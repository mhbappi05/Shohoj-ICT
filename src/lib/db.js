import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const SEED = `
CREATE TABLE Departments (
  dept_id INTEGER PRIMARY KEY,
  dept_name TEXT NOT NULL
);
CREATE TABLE Students (
  student_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT,
  age INTEGER,
  dept_id INTEGER,
  city TEXT,
  FOREIGN KEY (dept_id) REFERENCES Departments(dept_id)
);
CREATE TABLE Marks (
  mark_id INTEGER PRIMARY KEY,
  student_id INTEGER,
  subject TEXT,
  marks INTEGER,
  FOREIGN KEY (student_id) REFERENCES Students(student_id)
);
INSERT INTO Departments VALUES (1,'Science'),(2,'Humanities'),(3,'Business Studies');
INSERT INTO Students VALUES
 (1,'Rahim Uddin','M',17,1,'Dhaka'),
 (2,'Nusrat Jahan','F',18,1,'Chattogram'),
 (3,'Karim Hossain','M',17,2,'Rajshahi'),
 (4,'Sadia Akter','F',16,3,'Khulna'),
 (5,'Tanvir Ahmed','M',18,1,'Dhaka'),
 (6,'Farhana Yesmin','F',17,2,'Sylhet'),
 (7,'Mehedi Hasan','M',19,3,'Dhaka'),
 (8,'Sumaiya Rahman','F',17,1,'Rajshahi'),
 (9,'Imran Hossain','M',18,3,'Chattogram'),
 (10,'Arif Chowdhury','M',16,2,'Dhaka');
INSERT INTO Marks VALUES
 (1,1,'ICT',85),(2,1,'Physics',78),(3,1,'Mathematics',90),
 (4,2,'ICT',92),(5,2,'Physics',88),
 (6,3,'ICT',70),(7,3,'Bangla',75),
 (8,4,'ICT',66),(9,4,'Accounting',81),
 (10,5,'ICT',79),(11,5,'Physics',72),(12,5,'Mathematics',68),
 (13,6,'ICT',88),(14,6,'Bangla',84),
 (15,7,'ICT',59),(16,7,'Accounting',73),
 (17,8,'ICT',95),(18,8,'Physics',91),(19,8,'Mathematics',97),
 (20,9,'ICT',74),(21,9,'Accounting',69),
 (22,10,'ICT',81),(23,10,'Bangla',77);
`;

let sqlPromise = null;

/** Loads sql.js (and its WebAssembly file) once, on first use. */
function loadSql() {
  if (!sqlPromise) {
    sqlPromise = import('sql.js').then((m) => (m.default || m)({ locateFile: () => wasmUrl }));
  }
  return sqlPromise;
}

/** A fresh in-memory database with the sample HSC tables. */
export async function createDb() {
  const SQL = await loadSql();
  const db = new SQL.Database();
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SEED);
  return db;
}

const firstRows = (res) => (res.length ? res[0].values : []);

/** Tables, columns, primary keys and foreign keys, read live from the database. */
export function readSchema(db) {
  const names = firstRows(
    db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")
  ).map((r) => r[0]);

  const tables = names.map((name) => ({
    name,
    cols: firstRows(db.exec(`PRAGMA table_info("${name}")`)).map((r) => ({
      name: r[1], type: r[2], notnull: r[3], pk: r[5],
    })),
    fks: firstRows(db.exec(`PRAGMA foreign_key_list("${name}")`)).map((r) => ({
      table: r[2], from: r[3], to: r[4],
    })),
  }));

  // a foreign key with no named target column points at the other table's primary key
  tables.forEach((t) => t.fks.forEach((f) => {
    if (!f.to) {
      const target = tables.find((x) => x.name.toLowerCase() === f.table.toLowerCase());
      const pk = target && target.cols.find((c) => c.pk > 0);
      f.to = pk ? pk.name : null;
    }
  }));
  return tables;
}