"""
Restores exhibit data (logs, tables, command output) that the original PDF
parser dropped because it was embedded as images in the source PDF.

Each snippet below was transcribed from the exhibit image on the question's
PDF page. Writes a "context" field onto the matching questions in
data/questions.json; the site renders it as a preformatted block between
the question stem and the answer options.

Run after build_questions.py (and before/after classify_domains.py - order
between those two does not matter).
"""

from __future__ import annotations

import json
from pathlib import Path

DATA = Path(__file__).parent / "data" / "questions.json"

CONTEXTS: dict[int, str] = {
    17: (
        "[10:00:00 AM] Login rejected - username administrator - password Spring2023\n"
        "[10:00:01 AM] Login rejected - username jsmith - password Spring2023\n"
        "[10:00:01 AM] Login rejected - username guest - password Spring2023\n"
        "[10:00:02 AM] Login rejected - username cpolk - password Spring2023\n"
        "[10:00:03 AM] Login rejected - username fmartin - password Spring2023"
    ),
    71: (
        "UserID jsmith, password authentication: succeeded, MFA: failed (invalid code)\n"
        "UserID jsmith, password authentication: succeeded, MFA: failed (invalid code)\n"
        "UserID jsmith, password authentication: succeeded, MFA: failed (invalid code)\n"
        "UserID jsmith, password authentication: succeeded, MFA: failed (invalid code)"
    ),
    81: (
        "Keywords        Date and Time          Source                      Event ID   Task Category\n"
        "Audit Failure   09/16/2022 11:13:05 AM Microsoft Windows security  4625       Logon\n"
        "Audit Failure   09/16/2022 11:13:07 AM Microsoft Windows security  4625       Logon\n"
        "Audit Failure   09/16/2022 11:13:09 AM Microsoft Windows security  4625       Logon\n"
        "Audit Failure   09/16/2022 11:13:11 AM Microsoft Windows security  4625       Logon\n"
        "Audit Failure   09/16/2022 11:13:13 AM Microsoft Windows security  4625       Logon\n"
        "Audit Failure   09/16/2022 11:13:15 AM Microsoft Windows security  4625       Logon\n"
        "Audit Failure   09/16/2022 11:13:17 AM Microsoft Windows security  4625       Logon\n"
        "Audit Failure   09/16/2022 11:13:19 AM Microsoft Windows security  4625       Logon\n"
        "Audit Failure   09/16/2022 11:13:21 AM Microsoft Windows security  4625       Logon\n"
        "Audit Failure   09/16/2022 11:13:23 AM Microsoft Windows security  4625       Logon\n"
        "Audit Failure   09/16/2022 11:13:25 AM Microsoft Windows security  4625       Logon\n"
        "Audit Failure   09/16/2022 11:13:27 AM Microsoft Windows security  4625       Logon"
    ),
    101: (
        "Vulnerability scanning report:\n"
        "  Server: 192.168.14.6\n"
        "  Service: Telnet\n"
        "  Port: 23  Protocol: TCP\n"
        "  Status: Open  Severity: High\n"
        "  Vulnerability: Use of an insecure network protocol\n"
        "\n"
        "Test performed:\n"
        "  nmap -p 23 192.168.14.6 --script telnet-encryption\n"
        "\n"
        "  PORT    STATE  SERVICE  REASON\n"
        "  23/tcp  open   telnet   syn-ack\n"
        "  | telnet encryption:\n"
        "  |_  Telnet server supports encryption"
    ),
    178: (
        "Date       | Time         | SourceIP      | SPort | Flag | DestIP      | DPort\n"
        "2023-01-25 | 01:45:09.102 | 98.123.45.100 | 4560  | SYN  | 100.50.20.7 | 443\n"
        "2023-01-25 | 01:45:09.102 | 95.123.45.101 | 3361  | SYN  | 100.50.20.7 | 443\n"
        "2023-01-25 | 01:45:09.102 | 99.123.45.102 | 3662  | SYN  | 100.50.20.7 | 443\n"
        "2023-01-25 | 01:45:09.102 | 89.123.45.103 | 5663  | SYN  | 100.50.20.7 | 443\n"
        "2023-01-25 | 01:45:09.102 | 98.123.45.104 | 4064  | SYN  | 100.50.20.7 | 443\n"
        "2023-01-25 | 01:45:09.102 | 80.123.45.105 | 4365  | SYN  | 100.50.20.7 | 443"
    ),
    258: (
        "Server name | IP          | Traffic sent | Traffic received | Status\n"
        "File01      | 10.12.14.13 | 2654812      | 23185            | Up\n"
        "DC01        | 10.12.15.2  | 168741       | 65481            | Up\n"
        "Test01      | 10.25.1.3   | 14872        | 654123168        | Down\n"
        "Test02      | 10.25.1.4   | 16941        | 651321685        | Down\n"
        "DC02        | 10.12.15.3  | 32145        | 32158            | Up\n"
        "Finance01   | 10.18.1.14  | 12374        | 6548             | Up"
    ),
    294: (
        "Log from named: post-processed 20230102 0045L\n"
        "...\n"
        "qry_source: 124.22.158.37 TCP/53\n"
        "qry_dest: 52.165.16.154 TCP/53\n"
        "qry_dest: 10.100.50.5 TCP/53\n"
        "qry_type: AXFR\n"
        "| zone int.comptia.org\n"
        "--------------------| www A 10.100.50.21\n"
        "--------------------| dns A 10.100.5.5\n"
        "--------------------| adds A 10.101.10.10\n"
        "--------------------| fshare A 10.101.10.20\n"
        "--------------------| sip A 10.100.5.11\n"
        "..."
    ),
    315: (
        'IF DATE() = "01/30/2023" THEN BEGIN\n'
        "  DROP DATABASE WebShopOnline;\n"
        "END"
    ),
    358: (
        '149.32.228.10 - - [28/Jan/2023:16:32:45 -0300] "GET / HTTP/1.0"\n'
        "User-Agent: ${/bin/sh/ id} 200 397"
    ),
    367: (
        "ServerName | #Connections | CPU%  | MEM% | Read/s | Writes/s\n"
        "FileSev01  | 12           | 99.6% | 97%  | 50KB/s | 100KB/s"
    ),
    371: "<script>function (send_info)</script>",
    440: (
        "Original records:\n"
        "  Record | Type  | Address     | TTL\n"
        "  @      | A     | 192.168.1.1 | 14400\n"
        "  WWW    | CNAME | 192.168.1.1 | 14400\n"
        "\n"
        "Records two weeks later:\n"
        "  Record | Type  | Address        | TTL\n"
        "  @      | A     | 233.123.123.23 | 14400\n"
        "  WWW    | CNAME | 233.123.123.23 | 14400"
    ),
    452: (
        '67.118.34.157 - - [28/Jul/2022:10:26:59 -0300] "GET /query.php?q=wireless%20headphones / HTTP/1.0" 200 12737\n'
        "132.18.222.103 - - [28/Jul/2022:10:27:10 -0300] \"GET /query.php?q=123'';INSERT INTO users VALUES('temp','pass123')# / HTTP/1.0\" 200 935\n"
        '12.45.101.121 - - [28/Jul/2022:10:27:22 -0300] "GET /query.php?q=mp3%20players / HTTP/1.0" 200 14650'
    ),
    610: (
        "Date       | Time     | Action  | SourceIP       | City-State-Country\n"
        "2023-01-23 | 08:21:41 | Success | 207.414.201.19 | Chicago-IL-USA\n"
        "2023-01-24 | 08:23:41 | Success | 207.414.201.19 | Chicago-IL-USA\n"
        "2023-01-25 | 08:29:39 | Success | 207.414.201.19 | Chicago-IL-USA\n"
        "2023-01-26 | 08:27:44 | Success | 207.414.201.19 | Chicago-IL-USA\n"
        "2023-01-27 | 08:22:24 | Success | 207.414.201.19 | Chicago-IL-USA\n"
        "2023-01-27 | 09:45:35 | Success | 185.17.106.237 | Rome-Italy\n"
        "2023-01-27 | 09:47:55 | Success | 188.17.105.137 | Rome-Italy\n"
        "2023-01-27 | 09:55:36 | Success | 207.414.201.19 | Chicago-IL-USA\n"
        "2023-01-27 | 16:28:15 | Success | 207.414.201.19 | Chicago-IL-USA"
    ),
}


def main() -> None:
    questions = json.loads(DATA.read_text(encoding="utf-8"))
    by_number = {q["number"]: q for q in questions}

    applied = 0
    for number, context in CONTEXTS.items():
        q = by_number.get(number)
        if q is None:
            print(f"  WARNING: question #{number} not found")
            continue
        q["context"] = context
        applied += 1

    DATA.write_text(json.dumps(questions, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Applied exhibit context to {applied} of {len(CONTEXTS)} questions.")


if __name__ == "__main__":
    main()
