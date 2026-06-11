import threading
import time
from dataclasses import dataclass
from typing import Optional


@dataclass
class AlertState:
    last_alert_ts: float = 0.0


class ThresholdAlerter:
    def __init__(
        self,
        threshold_mbps: float,
        cooldown_seconds: int,
        on_alert,
    ):
        self.threshold_mbps = float(threshold_mbps)
        self.cooldown_seconds = int(cooldown_seconds)
        self.on_alert = on_alert
        self._state = AlertState()
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def start(self, get_bandwidth_fn):
        self._running = True

        def _loop():
            while self._running:
                ts = time.time()
                rx, tx = get_bandwidth_fn()
                bw_total = rx + tx
                if bw_total > self.threshold_mbps:
                    if ts - self._state.last_alert_ts >= self.cooldown_seconds:
                        self._state.last_alert_ts = ts
                        self.on_alert(ts, bw_total, self.threshold_mbps)
                time.sleep(0.5)

        self._thread = threading.Thread(target=_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

