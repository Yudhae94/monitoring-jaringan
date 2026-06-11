# Network Monitoring (Flask + Scapy) - Windows

Aplikasi monitoring jaringan real-time dengan Flask dashboard, Scapy sniffing, grafik Plotly, time-series bandwidth, alert threshold, dan logging alert ke SQLite.

## Catatan penting (Windows)
- Untuk sniffing paket di Windows, Anda perlu izin administrator.
- Library Scapy menggunakan pcap/driver; pastikan akses packet capture tersedia.
- Aplikasi ini memonitor traffic pada interface network tertentu.

## Jalankan
1. Edit `run.bat` (opsional) untuk memilih interface.
2. Jalankan `run.bat`.

Buka di:
- http://127.0.0.1:5000

## Fitur
- Dashboard real-time (Plotly)
- Time-series bandwidth per detik (rx/tx)
- Alert jika bandwidth melebihi threshold (contoh: > 10 Mbps)
- Logging alert ke SQLite: `alerts.sqlite3`

