import threading
import time
from collections import deque
from dataclasses import dataclass
from typing import Deque, Optional, Tuple


@dataclass
class BandwidthSample:
    ts: float
    rx_mbps: float
    tx_mbps: float


class BandwidthMeter:
    """Aggregates bytes to compute RX/TX Mbps per second.

    This simplified version estimates total throughput as a single stream.
    For demo purposes, we map it to rx/tx equally. In real deployments,
    you'd use direction (based on IP/port/or interface counters).
    """

    def __init__(self, max_seconds: int = 300):
        self.max_seconds = max_seconds
        self._lock = threading.Lock()
        self._bytes_bucket: int = 0
        self._samples: Deque[BandwidthSample] = deque(maxlen=max_seconds)
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def add_bytes(self, n: int):
        with self._lock:
            self._bytes_bucket += int(n)

    def start(self):
        self._running = True

        def _loop():
            last = time.time()
            while self._running:
                time.sleep(1)
                now = time.time()
                dt = max(1e-9, now - last)
                last = now
                with self._lock:
                    b = self._bytes_bucket
                    self._bytes_bucket = 0

                # bits per second -> Mbps
                mbps_total = (b * 8.0) / dt / 1e6
                # demo split
                rx = mbps_total / 2.0
                tx = mbps_total / 2.0

                self._samples.append(BandwidthSample(ts=now, rx_mbps=rx, tx_mbps=tx))

        self._thread = threading.Thread(target=_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def latest(self) -> Tuple[float, float, float]:
        """Return (ts, rx_mbps, tx_mbps)"""
        with self._lock:
            if not self._samples:
                return (time.time(), 0.0, 0.0)
            s = self._samples[-1]
            return (s.ts, s.rx_mbps, s.tx_mbps)

    def timeseries(self, seconds: int = 60):
        with self._lock:
            if not self._samples:
                return []
            cutoff = time.time() - seconds
            return [
                s for s in self._samples if s.ts >= cutoff
            ]

