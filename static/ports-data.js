"use strict";

/* The 17 essential SY0-701 ports & protocols. Used by the Ports &
   Protocols flashcards and quiz modes (see app.js).
   `ports` is the display label; `portList` holds each individual port
   number for quiz distractor generation. */
const PORTS = [
  {
    acronym: "FTP",
    name: "File Transfer Protocol",
    ports: "20/21",
    portList: [20, 21],
    proto: "TCP",
    description: "Port 21 is the control port while port 20 is used to transfer files.",
  },
  {
    acronym: "SSH",
    name: "Secure Shell",
    ports: "22",
    portList: [22],
    proto: "TCP",
    description: "Designed to transmit data through a remote connection.",
  },
  {
    acronym: "SMTP",
    name: "Simple Mail Transfer Protocol",
    ports: "25",
    portList: [25],
    proto: "TCP",
    description:
      "Internet mail protocol used to send outgoing mail from email clients to mail servers.",
  },
  {
    acronym: "TACACS+",
    name: "Terminal Access Controller Access-Control System Plus",
    ports: "49",
    portList: [49],
    proto: "TCP",
    description:
      "Cisco proprietary protocol used for authentication, authorization, and accounting (AAA) services.",
  },
  {
    acronym: "DNS",
    name: "Domain Name System",
    ports: "53",
    portList: [53],
    proto: "UDP",
    description: "Used to associate IP addresses with domain names.",
  },
  {
    acronym: "DHCP",
    name: "Dynamic Host Configuration Protocol",
    ports: "67/68",
    portList: [67, 68],
    proto: "UDP",
    description:
      "This network management protocol is used to assign multiple local private IP addresses from one public IPv4 address.",
  },
  {
    acronym: "HTTP",
    name: "Hypertext Transfer Protocol",
    ports: "80",
    portList: [80],
    proto: "TCP",
    description: "Protocol used for websites and most internet traffic.",
  },
  {
    acronym: "POP",
    name: "Post Office Protocol",
    ports: "110",
    portList: [110],
    proto: "TCP",
    description:
      "E-mail protocol that allows e-mail clients to communicate with e-mail servers. POP provides only one-way communication.",
  },
  {
    acronym: "NTP",
    name: "Network Time Protocol",
    ports: "123",
    portList: [123],
    proto: "UDP",
    description: "Low latency protocol used to synchronize timekeeping across a network.",
  },
  {
    acronym: "IMAP",
    name: "Internet Message Access Protocol",
    ports: "143, 993",
    portList: [143, 993],
    proto: "TCP",
    description:
      "E-mail protocol used by e-mail clients to communicate with e-mail servers. Provides two-way communication unlike POP.",
  },
  {
    acronym: "SNMP",
    name: "Simple Network Management Protocol",
    ports: "161/162",
    portList: [161, 162],
    proto: "UDP",
    description: "Protocol used to monitor and manage network devices on IP networks.",
  },
  {
    acronym: "LDAP",
    name: "Lightweight Directory Access Protocol",
    ports: "389",
    portList: [389],
    proto: "UDP",
    description: "Used to manage and communicate with directories.",
  },
  {
    acronym: "HTTPS",
    name: "Hypertext Transfer Protocol Secure",
    ports: "443",
    portList: [443],
    proto: "TCP",
    description:
      "Secure version of HTTP that uses TLS for encryption. Most websites use HTTPS instead of HTTP.",
  },
  {
    acronym: "SMTPS",
    name: "Simple Mail Transfer Protocol Secure",
    ports: "587",
    portList: [587],
    proto: "TCP",
    description: "The secure version of SMTP. Uses TLS for encryption.",
  },
  {
    acronym: "LDAPS",
    name: "Lightweight Directory Access Protocol Secure",
    ports: "636",
    portList: [636],
    proto: "TCP",
    description: "Secure version of LDAP that uses TLS for encryption.",
  },
  {
    acronym: "FTPS",
    name: "File Transfer Protocol Secure",
    ports: "989/990",
    portList: [989, 990],
    proto: "TCP",
    description:
      "FTPS uses TLS for encryption. It can run on ports 20/21 but is sometimes allocated to ports 989/990.",
  },
  {
    acronym: "RDP",
    name: "Remote Desktop Protocol",
    ports: "3389",
    portList: [3389],
    proto: "TCP",
    description:
      "This Windows proprietary protocol enables remote connections to other computers.",
  },
];
