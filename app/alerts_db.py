from typing import Iterable, Optional

from .metrics_db import MetricsDB


class AlertsDB:
    def __init__(self, db_path: str = "alerts.sqlite3"):
        self.db = MetricsDB(db_path=db_path)

    def log_alert(
        self,
        ts: float,
        bandwidth_mbps: float,
        threshold_mbps: float,
        interface: Optional[str] = None,
        note: Optional[str] = None,
    ):
        self.db.insert_alert(
            ts=ts,
            bandwidth_mbps=bandwidth_mbps,
            threshold_mbps=threshold_mbps,
            interface=interface,
            note=note,
        )

    def list_recent(self, limit: int = 50) -> Iterable:
        return self.db.list_recent_alerts(limit=limit)

