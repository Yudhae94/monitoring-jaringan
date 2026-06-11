import threading
import time
from dataclasses import dataclass
from typing import Callable, Optional

try:
    # scapy can be installed via pip: scapy
    from scapy.all import sniff  # type: ignore
except Exception:  # pragma: no cover
    sniff = None  # type: ignore


@dataclass
class PacketStats:
    bytes_total: int = 0
    packets_total: int = 0


class ScapySniffer:
    """Simple wrapper for Scapy sniffing in a background thread."""

    def __init__(
        self,
        interface: Optional[str],
        packet_filter: Optional[str],
        on_bytes: Callable[[int], None],
        on_packet: Optional[Callable[[int], None]] = None,
    ):
        self.interface = interface
        self.packet_filter = packet_filter
        self.on_bytes = on_bytes
        self.on_packet = on_packet
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self):
        if sniff is None:
            raise RuntimeError("Scapy sniff is not available. Install scapy and ensure WinPcap/Npcap access.")

        self._stop_event.clear()

        def _run():
            def _cb(pkt):
                try:
                    # len(pkt) is packet size in bytes
                    b = int(len(pkt))
                    self.on_bytes(b)
                    if self.on_packet is not None:
                        self.on_packet(1)
                except Exception:
                    # avoid crashing sniffer loop
                    return

            # stop_filter is evaluated on packets; we also check event
            def _stop_filter(_pkt):
                return self._stop_event.is_set()

            sniff(
                iface=self.interface,
                filter=self.packet_filter,
                prn=_cb,
                store=False,
                stop_filter=_stop_filter,
            )

        self._thread = threading.Thread(target=_run, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop_event.set()

        # No hard join needed; sniff stop_filter will eventually stop.
        if self._thread is not None:
            self._thread.join(timeout=2)

