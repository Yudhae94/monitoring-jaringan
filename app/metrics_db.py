import sqlite3
from pathlib import Path
from typing import Iterable, Optional, Tuple


class MetricsDB:
    def __init__(self, db_path: str = "alerts.sqlite3"):
        self.db_path = Path(db_path)
        self._ensure_schema()

    def _connect(self):
        return sqlite3.connect(str(self.db_path))

    def _ensure_schema(self):
        with self._connect() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts REAL NOT NULL,
                    bandwidth_mbps REAL NOT NULL,
                    threshold_mbps REAL NOT NULL,
                    interface TEXT,
                    note TEXT
                );
                """
            )
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS troubleshoot (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at REAL NOT NULL,
                    problem_title TEXT NOT NULL,
                    problem_description TEXT,
                    solution TEXT,
                    status TEXT DEFAULT 'open'
                );
                """
            )
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS devices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nama TEXT NOT NULL,
                    lokasi TEXT,
                    ip TEXT NOT NULL UNIQUE,
                    mac TEXT,
                    status TEXT DEFAULT 'unknown',
                    last_check REAL,
                    created_at REAL NOT NULL
                );
                """
            )
            con.commit()

    def insert_alert(
        self,
        ts: float,
        bandwidth_mbps: float,
        threshold_mbps: float,
        interface: Optional[str] = None,
        note: Optional[str] = None,
    ):
        with self._connect() as con:
            con.execute(
                """
                INSERT INTO alerts(ts, bandwidth_mbps, threshold_mbps, interface, note)
                VALUES (?, ?, ?, ?, ?)
                """,
                (ts, bandwidth_mbps, threshold_mbps, interface, note),
            )
            con.commit()

    def list_recent_alerts(self, limit: int = 50) -> Iterable[Tuple]:
        with self._connect() as con:
            cur = con.execute(
                """
                SELECT id, ts, bandwidth_mbps, threshold_mbps, interface, note
                FROM alerts
                ORDER BY ts DESC
                LIMIT ?
                """,
                (limit,),
            )
            return list(cur.fetchall())

    # Troubleshoot CRUD Methods
    def add_troubleshoot(
        self,
        problem_title: str,
        problem_description: Optional[str] = None,
        solution: Optional[str] = None,
        status: str = "open",
    ) -> int:
        import time
        with self._connect() as con:
            cur = con.execute(
                """
                INSERT INTO troubleshoot(created_at, problem_title, problem_description, solution, status)
                VALUES (?, ?, ?, ?, ?)
                """,
                (time.time(), problem_title, problem_description, solution, status),
            )
            con.commit()
            return cur.lastrowid

    def list_troubleshoot(self, limit: int = 100) -> Iterable[Tuple]:
        with self._connect() as con:
            cur = con.execute(
                """
                SELECT id, created_at, problem_title, problem_description, solution, status
                FROM troubleshoot
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            )
            return list(cur.fetchall())

    def get_troubleshoot(self, ts_id: int) -> Optional[Tuple]:
        with self._connect() as con:
            cur = con.execute(
                """
                SELECT id, created_at, problem_title, problem_description, solution, status
                FROM troubleshoot
                WHERE id = ?
                """,
                (ts_id,),
            )
            return cur.fetchone()

    def update_troubleshoot(
        self,
        ts_id: int,
        problem_title: Optional[str] = None,
        problem_description: Optional[str] = None,
        solution: Optional[str] = None,
        status: Optional[str] = None,
    ) -> bool:
        with self._connect() as con:
            # Get current values
            current = self.get_troubleshoot(ts_id)
            if not current:
                return False

            # Use provided values or keep existing ones
            new_title = problem_title if problem_title is not None else current[2]
            new_desc = problem_description if problem_description is not None else current[3]
            new_solution = solution if solution is not None else current[4]
            new_status = status if status is not None else current[5]

            con.execute(
                """
                UPDATE troubleshoot
                SET problem_title = ?, problem_description = ?, solution = ?, status = ?
                WHERE id = ?
                """,
                (new_title, new_desc, new_solution, new_status, ts_id),
            )
            con.commit()
            return True

    def delete_troubleshoot(self, ts_id: int) -> bool:
        with self._connect() as con:
            cur = con.execute(
                """
                DELETE FROM troubleshoot
                WHERE id = ?
                """,
                (ts_id,),
            )
            con.commit()
            return cur.rowcount > 0

    # Device Management CRUD Methods
    def add_device(
        self,
        nama: str,
        ip: str,
        lokasi: Optional[str] = None,
        mac: Optional[str] = None,
        status: str = "unknown",
    ) -> int:
        import time
        with self._connect() as con:
            try:
                cur = con.execute(
                    """
                    INSERT INTO devices(nama, lokasi, ip, mac, status, last_check, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (nama, lokasi, ip, mac, status, time.time(), time.time()),
                )
                con.commit()
                return cur.lastrowid
            except Exception:
                # Device with this IP already exists
                return -1

    def list_devices(self) -> Iterable[Tuple]:
        with self._connect() as con:
            cur = con.execute(
                """
                SELECT id, nama, lokasi, ip, mac, status, last_check, created_at
                FROM devices
                ORDER BY created_at DESC
                """
            )
            return list(cur.fetchall())

    def get_device(self, device_id: int) -> Optional[Tuple]:
        with self._connect() as con:
            cur = con.execute(
                """
                SELECT id, nama, lokasi, ip, mac, status, last_check, created_at
                FROM devices
                WHERE id = ?
                """,
                (device_id,),
            )
            return cur.fetchone()

    def update_device(
        self,
        device_id: int,
        nama: Optional[str] = None,
        lokasi: Optional[str] = None,
        ip: Optional[str] = None,
        mac: Optional[str] = None,
        status: Optional[str] = None,
    ) -> bool:
        import time
        with self._connect() as con:
            current = self.get_device(device_id)
            if not current:
                return False

            new_nama = nama if nama is not None else current[1]
            new_lokasi = lokasi if lokasi is not None else current[2]
            new_ip = ip if ip is not None else current[3]
            new_mac = mac if mac is not None else current[4]
            new_status = status if status is not None else current[5]

            con.execute(
                """
                UPDATE devices
                SET nama = ?, lokasi = ?, ip = ?, mac = ?, status = ?, last_check = ?
                WHERE id = ?
                """,
                (new_nama, new_lokasi, new_ip, new_mac, new_status, time.time(), device_id),
            )
            con.commit()
            return True

    def delete_device(self, device_id: int) -> bool:
        with self._connect() as con:
            cur = con.execute(
                """
                DELETE FROM devices
                WHERE id = ?
                """,
                (device_id,),
            )
            con.commit()
            return cur.rowcount > 0

    def update_device_status(self, device_id: int, status: str) -> bool:
        import time
        with self._connect() as con:
            con.execute(
                """
                UPDATE devices
                SET status = ?, last_check = ?
                WHERE id = ?
                """,
                (status, time.time(), device_id),
            )
            con.commit()
            return True

