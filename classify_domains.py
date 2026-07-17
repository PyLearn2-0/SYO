"""
Tags every question in data/questions.json with its SY0-701 exam domain.

The source PDF collapsed everything into "Topic 1", so we classify each
question against the five official CompTIA SY0-701 domains using weighted
keyword/phrase matching built from the exam objectives:

  1.0 General Security Concepts               (12%)
  2.0 Threats, Vulnerabilities, and Mitigations (22%)
  3.0 Security Architecture                    (18%)
  4.0 Security Operations                      (28%)
  5.0 Security Program Management and Oversight (20%)

Question stem matches count 3x, option text 1x, explanation 1x.
Manual overrides (reviewed by hand) always win.

Writes a "domain" field (1-5) onto every question and prints the
distribution plus the lowest-confidence assignments for review.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

DATA = Path(__file__).parent / "data" / "questions.json"

# (regex, weight). Higher weight = stronger signal for the domain.
# All short acronyms MUST be wrapped in \b so they don't match inside words.
KEYWORDS: dict[int, list[tuple[str, int]]] = {
    1: [
        # Security controls & categories (1.1)
        (r"(technical|managerial|operational|physical) controls?", 6),
        (r"(preventive|preventative|deterrent|detective|corrective|compensating|directive) control", 6),
        (r"control (category|type)", 5),
        (r"categor(y|ies) of (security )?controls?", 5),
        # Fundamental concepts (1.2)
        (r"non-?repudiation", 5),
        (r"\bCIA\b", 5),
        (r"confidentiality, integrity,? and availability", 5),
        (r"zero trust", 6),
        (r"(control plane|data plane)", 6),
        (r"(adaptive identity|policy engine|policy administrator|policy enforcement point|implicit trust zones)", 6),
        (r"gap analysis", 5),
        # Physical security (1.2)
        (r"bollards?", 6),
        (r"access control vestibule", 6),
        (r"security guards?", 4),
        (r"(infrared|pressure|microwave|ultrasonic) sensors?", 5),
        (r"video surveillance", 4),
        (r"(fencing|fence)", 4),
        (r"brute[- ]force.{0,20}(door|entry|physical)", 4),
        # Deception & disruption (1.2)
        (r"honey ?(pot|net|file|token)s?", 6),
        # Change management (1.3)
        (r"change management", 6),
        (r"change (advisory )?board", 6),
        (r"(backout plan|back-out plan)", 6),
        (r"maintenance window", 6),
        (r"impact analysis", 4),
        (r"standard operating procedure", 4),
        (r"version control", 5),
        (r"(allow list|deny list).{0,30}(change|update)", 3),
        # Cryptography (1.4)
        (r"public key infrastructure|\bPKI\b", 5),
        (r"(public|private) key", 4),
        (r"key escrow", 6),
        (r"(full[- ]disk|partition|file|volume|database|record)[- ]?(level )?encryption", 5),
        (r"(symmetric|asymmetric) (encryption|algorithm|key)", 5),
        (r"key exchange", 5),
        (r"key length", 4),
        (r"trusted platform module|\bTPM\b", 5),
        (r"hardware security module|\bHSM\b", 5),
        (r"key management (system|service)", 4),
        (r"secure enclave", 5),
        (r"obfuscation", 4),
        (r"steganography", 6),
        (r"tokenization", 5),
        (r"data masking", 5),
        (r"hash(ing|ed)?", 3),
        (r"salt(ing|ed)?", 5),
        (r"digital signatures?", 5),
        (r"key stretching", 6),
        (r"blockchain", 5),
        (r"open public ledger", 5),
        (r"certificate (authority|revocation|signing)", 5),
        (r"\bCRL\b", 5),
        (r"\bOCSP\b", 5),
        (r"(self-signed|wildcard|third-party) certificates?", 5),
        (r"root of trust", 5),
        (r"encrypt(ion|ed|ing)?", 1),
    ],
    2: [
        # Threat actors (2.1)
        (r"threat actors?", 5),
        (r"nation-?state", 5),
        (r"unskilled attacker", 6),
        (r"hacktivis(t|m)", 6),
        (r"insider threat", 5),
        (r"organized crime", 6),
        (r"shadow IT", 6),
        (r"(war|revenge|blackmail|espionage) ?(as a motivation)?", 2),
        (r"financial gain", 3),
        # Threat vectors / social engineering (2.2)
        (r"phishing", 5),
        (r"vishing", 6),
        (r"smishing", 6),
        (r"misinformation|disinformation", 6),
        (r"impersonation", 4),
        (r"business email compromise|\bBEC\b", 6),
        (r"pretexting", 6),
        (r"watering[- ]hole", 6),
        (r"brand impersonation", 6),
        (r"typo ?squatting", 6),
        (r"social engineering", 5),
        (r"supply chain (attack|vector)", 4),
        (r"removable (device|media)", 4),
        (r"default credentials", 4),
        (r"\bUSB\b.{0,30}(drop|found|parking|malicious)", 5),
        # Vulnerabilities (2.3)
        (r"memory injection", 6),
        (r"buffer overflow", 6),
        (r"race conditions?", 6),
        (r"time-of-check|\bTOC\b|\bTOU\b|time-of-use", 6),
        (r"malicious update", 5),
        (r"SQL injection|\bSQLi\b", 6),
        (r"cross-site scripting|\bXSS\b", 6),
        (r"\bVM\b escape", 6),
        (r"resource reuse", 5),
        (r"jailbreak(ing)?", 6),
        (r"side ?loading", 6),
        (r"end-of-life|\bEOL\b", 4),
        (r"legacy (system|hardware|software|application)s?", 4),
        (r"zero-?day", 6),
        # Malware & attacks (2.4)
        (r"ransomware", 5),
        (r"trojan", 6),
        (r"\bworms?\b", 5),
        (r"spyware", 6),
        (r"bloatware", 6),
        (r"keylogger", 6),
        (r"logic bomb", 6),
        (r"rootkit", 6),
        (r"\bvirus(es)?\b", 4),
        (r"malware", 3),
        (r"malicious (code|file|software|attachment)", 3),
        (r"brute[- ]force", 5),
        (r"\bRFID\b (cloning|attack)", 6),
        (r"environmental attack", 5),
        (r"(distributed )?denial[- ]of[- ]service|\bDDoS\b|\bDoS\b", 5),
        (r"(amplified|reflected) attack", 5),
        (r"\bDNS\b (poisoning|spoofing|attack|sinkhole)", 6),
        (r"domain hijacking", 6),
        (r"on-path attack", 6),
        (r"credential (replay|harvesting|stuffing)", 6),
        (r"(evil twin|rogue access point)", 6),
        (r"(bluejacking|bluesnarfing)", 6),
        (r"privilege escalation", 5),
        (r"(cross-site request|server-side request) forgery|\bCSRF\b|\bSSRF\b", 6),
        (r"directory traversal", 6),
        (r"replay attack", 6),
        (r"injection attack", 5),
        (r"(downgrade|collision|birthday) attack", 6),
        (r"password spraying", 6),
        (r"pass-the-hash", 6),
        (r"wireless (attack|deauthentication)", 5),
        # Indicators (2.4)
        (r"impossible travel", 6),
        (r"account lockout", 4),
        (r"concurrent session", 5),
        (r"indicators? of (compromise|malicious activity)|\bIoC\b", 5),
        (r"attack(er)?s?", 1),
        (r"compromis(e|ed|ing)", 1),
        # Mitigations (2.5)
        (r"application allow ?list(ing)?", 5),
        (r"(isolation|air ?gap)", 3),
        (r"patch(ing|es)? (applied|available|management)?", 2),
    ],
    3: [
        # Architecture models (3.1)
        (r"cloud(-based| computing| environment| provider| infrastructure| service)", 4),
        (r"responsibility matrix", 6),
        (r"hybrid (cloud|environment)", 5),
        (r"infrastructure as code|\bIaC\b", 6),
        (r"serverless", 6),
        (r"microservices", 6),
        (r"software-defined network(ing)?|\bSDN\b", 6),
        (r"on-premises", 4),
        (r"(centralized|decentralized) (architecture|computing)", 5),
        (r"containeriz(ation|ed)", 5),
        (r"virtualization", 4),
        (r"\bIoT\b|internet of things", 5),
        (r"\bICS\b|\bSCADA\b|industrial control systems?", 6),
        (r"real-time operating system|\bRTOS\b", 6),
        (r"embedded systems?", 5),
        (r"(air-?gapped) (network|system)", 5),
        # Infrastructure / appliances (3.2)
        (r"attack surface", 4),
        (r"fail-(open|closed)", 6),
        (r"(inline|tap|monitor) mode", 5),
        (r"jump server", 6),
        (r"(forward|reverse) proxy", 5),
        (r"proxy server", 4),
        (r"intrusion (prevention|detection) system", 4),
        (r"\bIPS\b|\bIDS\b|\bNIDS\b|\bHIDS\b", 3),
        (r"load balancer", 5),
        (r"802\.1X", 5),
        (r"\bEAP\b", 4),
        (r"web application firewall|\bWAF\b", 5),
        (r"unified threat management|\bUTM\b", 6),
        (r"next-generation firewall|\bNGFW\b", 5),
        (r"layer [47] firewall", 6),
        (r"screened subnet", 5),
        (r"network appliances?", 4),
        (r"port security", 5),
        # Secure communication (3.2)
        (r"\bVPN\b|virtual private network", 5),
        (r"remote access", 3),
        (r"tunnel(ing)?", 4),
        (r"\bIPSec\b|\bTLS\b", 4),
        (r"\bSD-WAN\b", 6),
        (r"\bSASE\b|secure access service edge", 6),
        (r"(network )?segmentation", 4),
        (r"security zones?", 4),
        # Data protection (3.3)
        (r"data (type|classification)s?", 5),
        (r"(intellectual property|trade secrets?)", 4),
        (r"data (at rest|in transit|in use|in motion)", 6),
        (r"data sovereignty", 6),
        (r"geolocation", 4),
        (r"geographic (dispersion|restrictions)", 5),
        (r"data (labeling|labelling)", 5),
        # Resilience & recovery (3.4)
        (r"high availability", 5),
        (r"clustering", 4),
        (r"(hot|cold|warm) site", 6),
        (r"platform diversity", 5),
        (r"multi-?cloud", 5),
        (r"continuity of operations", 5),
        (r"capacity planning", 5),
        (r"(tabletop exercise|fail ?over test|parallel processing)", 5),
        (r"backups?", 3),
        (r"snapshots?", 4),
        (r"replication", 4),
        (r"journaling", 5),
        (r"uninterruptible power supply|\bUPS\b|generators?", 5),
        (r"off ?site (backup|storage)", 4),
        (r"(load|power|capacity) (testing|management)", 4),
    ],
    4: [
        # Baselines & hardening (4.1)
        (r"secure baselines?", 6),
        (r"hardening", 5),
        (r"\bWPA3?\b|wireless security settings", 5),
        (r"\bRADIUS\b", 4),
        (r"mobile device management|\bMDM\b", 5),
        (r"\bBYOD\b|\bCOPE\b|\bCYOD\b", 6),
        (r"mobile (solutions|devices?)", 3),
        (r"default password", 4),
        (r"(disable|removal of) unnecessary (software|services|ports)", 5),
        # Asset management (4.2)
        (r"(data )?sanitization", 5),
        (r"(destruction|shredding|degauss(ing)?|pulveriz(e|ing))", 4),
        (r"certificat(e|ion) of (destruction|disposal)", 5),
        (r"decommission(ing|ed)?", 5),
        (r"asset (management|inventory|tracking|disposal)", 5),
        (r"enumeration", 4),
        # Vulnerability management (4.3)
        (r"vulnerability (scan(ner|ning)?|management|assessment|report)", 5),
        (r"(static|dynamic) (code )?analysis", 6),
        (r"package monitoring", 5),
        (r"threat (feed|intelligence)", 5),
        (r"open-source intelligence|\bOSINT\b", 6),
        (r"dark web", 5),
        (r"penetration test(ing|er)?", 4),
        (r"responsible disclosure", 5),
        (r"bug bounty", 6),
        (r"\bCVSS\b", 6),
        (r"\bCVE\b", 5),
        (r"(false positive|false negative|true positive)", 5),
        (r"rescan(ning)?", 4),
        (r"exposure factor.{0,40}(vulnerability|patch)", 3),
        (r"remediation", 3),
        (r"prioritiz(e|ation).{0,30}(vulnerabilit|patch)", 4),
        # Monitoring & alerting (4.4)
        (r"\bSCAP\b", 6),
        (r"benchmarks?", 4),
        (r"agent(less)?[- ]based", 4),
        (r"security information and event management|\bSIEM\b", 6),
        (r"antivirus", 4),
        (r"data loss prevention|\bDLP\b", 6),
        (r"\bSNMP\b traps?", 6),
        (r"NetFlow", 6),
        (r"quarantine", 4),
        (r"alert (tuning|response|fatigue)", 5),
        (r"log aggregation", 5),
        (r"(archiv|retention)ing? of logs", 5),
        # Enterprise security (4.5)
        (r"firewall rules?", 5),
        (r"access control lists?|\bACLs?\b", 4),
        (r"IDS/IPS (trends|signatures)", 5),
        (r"web filter(ing)?", 5),
        (r"(URL scanning|content categorization|block rules|reputation)", 4),
        (r"group policy", 5),
        (r"SELinux", 6),
        (r"secure protocols?", 4),
        (r"\bDNS\b filtering", 6),
        (r"\bDMARC\b|\bDKIM\b|\bSPF\b", 6),
        (r"email security gateway", 5),
        (r"file integrity monitoring", 6),
        (r"network access control|\bNAC\b", 5),
        (r"(endpoint|extended) detection and response|\bEDR\b|\bXDR\b", 6),
        (r"user behavior analytics", 6),
        # IAM (4.6)
        (r"(provisioning|de-provisioning)", 5),
        (r"identity proofing", 6),
        (r"federation", 5),
        (r"single sign-on|\bSSO\b", 5),
        (r"\bLDAP\b|\bOAuth\b|\bSAML\b", 5),
        (r"interoperability", 4),
        (r"(mandatory|discretionary|role-based|rule-based|attribute-based) access control", 6),
        (r"time-of-day restrictions", 6),
        (r"least privilege", 4),
        (r"multi-?factor authentication|\bMFA\b|\b2FA\b", 5),
        (r"(biometrics?|security keys?|hard token|soft token)", 4),
        (r"something you (know|have|are)", 6),
        (r"password (length|complexity|reuse|expiration|age|managers?|vaulting|polic(y|ies))", 5),
        (r"passwordless", 5),
        (r"just-in-time permissions", 6),
        (r"ephemeral credentials", 6),
        (r"privileged access management|\bPAM\b", 5),
        (r"access (review|audit)s?", 4),
        (r"permissions? (assignment|creep|needed)", 4),
        # Automation (4.7)
        (r"automat(ion|ed|ing)", 4),
        (r"orchestrat(ion|ed)", 5),
        (r"script(ing|s)?", 2),
        (r"ticket (creation|escalation)", 4),
        (r"guard ?rails?", 5),
        (r"technical debt", 5),
        (r"single point of failure", 4),
        (r"continuous integration", 5),
        # Incident response & forensics (4.8, 4.9)
        (r"incident response", 5),
        (r"(containment|eradication|lessons learned)", 4),
        (r"post-incident", 5),
        (r"root cause analysis", 5),
        (r"threat hunting", 6),
        (r"digital forensics", 6),
        (r"legal hold", 6),
        (r"chain of custody", 6),
        (r"e-discovery", 6),
        (r"(preservation|acquisition) of (evidence|data)", 5),
        (r"order of volatility|most volatile", 6),
        # Data sources (4.9)
        (r"(firewall|application|endpoint|network|security|system) logs?", 4),
        (r"packet captures?", 5),
        (r"dashboards?", 3),
        (r"log (data|files?|entries)", 4),
        (r"metadata", 4),
        (r"\bWHOIS\b|\bnslookup\b|\bdig\b command", 5),
    ],
    5: [
        # Governance (5.1)
        (r"governance", 5),
        (r"acceptable use policy|\bAUP\b", 6),
        (r"information security polic(y|ies)", 5),
        (r"business continuity", 5),
        (r"disaster recovery (plan|policy)", 5),
        (r"company polic(y|ies)", 4),
        (r"security polic(y|ies)", 3),
        (r"playbooks?", 4),
        (r"(onboarding|offboarding)", 5),
        (r"(regulatory|legal|industry|local|global) (considerations?|requirements?|environment)", 4),
        (r"regulations?", 3),
        (r"software development lifecycle|\bSDLC\b", 5),
        (r"(boards?|committees?) of directors", 5),
        # Roles (5.1)
        (r"data (owners?|controllers?|processors?|custodians?|stewards?)", 6),
        # Risk management (5.2)
        (r"risk (management|identification|assessments?|analysis|register|tolerance|appetite|threshold|owners?|reporting)", 5),
        (r"(ad hoc|recurring|one-time|continuous) (risk )?assessment", 5),
        (r"(qualitative|quantitative)", 5),
        (r"single loss expectancy|\bSLE\b", 6),
        (r"annualized loss expectancy|\bALE\b", 6),
        (r"annualized rate of occurrence|\bARO\b", 6),
        (r"exposure factor", 5),
        (r"probability|likelihood", 3),
        (r"key risk indicators?", 6),
        (r"risk (transference|transfer|acceptance|avoidance|mitigation|exemption|exception)", 6),
        (r"(accept|transfer|avoid|mitigate).{0,20}(the )?risk", 5),
        (r"business impact analysis", 6),
        (r"recovery time objective|\bRTO\b", 6),
        (r"recovery point objective|\bRPO\b", 6),
        (r"mean time to repair|\bMTTR\b", 6),
        (r"mean time between failures|\bMTBF\b", 6),
        (r"cyber(security)? insurance", 5),
        # Third-party risk (5.3)
        (r"vendor (risk|selection|assessment|monitoring|diversity)", 5),
        (r"third-part(y|ies)", 3),
        (r"right-to-audit", 6),
        (r"(independent|internal|external) (assessments?|audits?)", 5),
        (r"supply chain (analysis|risk)", 5),
        (r"due diligence", 5),
        (r"conflict of interest", 5),
        (r"service-level agreement|\bSLA\b", 6),
        (r"memorandum of (agreement|understanding)|\bMOA\b|\bMOU\b", 6),
        (r"master service agreement|\bMSA\b", 6),
        (r"statement of work|work order|\bSOW\b", 5),
        (r"non-disclosure agreement|\bNDA\b", 6),
        (r"business partners? agreement|\bBPA\b", 6),
        (r"questionnaires?", 5),
        (r"rules of engagement", 5),
        # Compliance & privacy (5.4, 5.5)
        (r"compliance (reporting|monitoring|requirements?)", 5),
        (r"\bcompliance\b", 3),
        (r"(fines|sanctions|reputational damage|loss of license|contractual impacts)", 5),
        (r"\bGDPR\b|\bHIPAA\b|\bPCI[ -]?DSS\b", 5),
        (r"privacy", 4),
        (r"data subject", 6),
        (r"data (inventory|retention)", 5),
        (r"right to be forgotten", 6),
        (r"attestation and acknowledgement", 5),
        (r"self-assessments?", 5),
        (r"audit committee", 6),
        # Audits & assessments (5.5)
        (r"(known|partially known|unknown) environment", 6),
        (r"(offensive|defensive|integrated) (penetration testing|testing)", 5),
        (r"(active|passive) reconnaissance", 6),
        (r"(red|blue|purple|white) team", 5),
        # Awareness (5.6)
        (r"(security )?awareness (training|program|campaign)", 6),
        (r"phishing (campaign|simulation)s?", 6),
        (r"anomalous behavior recognition", 6),
        (r"situational awareness", 5),
        (r"user (guidance and )?training", 5),
        (r"(hybrid|remote) work environments?", 4),
        (r"culture of security", 5),
    ],
}

# Hand-reviewed corrections applied after keyword scoring: id -> domain.
OVERRIDES: dict[str, int] = {
    # Control categories / types (1.1) and fundamental concepts (1.2)
    "T1-Q27": 1,   # AUP as a control TYPE (preventive)
    "T1-Q68": 1,   # SIEM weekly review -> detective control type
    "T1-Q119": 1,  # least privilege reason -> confidentiality (CIA)
    "T1-Q122": 1,  # log review after ransomware -> detective control type
    "T1-Q154": 1,  # load balancer -> availability (fundamental concept)
    "T1-Q229": 1,  # RADIUS -> AAA concept
    "T1-Q313": 1,  # AUP -> managerial control category
    "T1-Q334": 1,  # fake salaries file -> honeyfile (deception)
    "T1-Q345": 1,  # DDoS protection -> availability concept
    "T1-Q362": 1,  # new regulation -> gap analysis
    "T1-Q482": 1,  # bastion host for zero-day -> compensating control type
    "T1-Q514": 1,  # swipe card / biometric -> physical security
    "T1-Q519": 1,  # EDR -> technical control category
    # Change management (1.3)
    "T1-Q30": 1,   # firewall rules -> follow change management procedure
    "T1-Q43": 1,   # high-priority patch -> change control request first
    # Cryptography & data obfuscation (1.4)
    "T1-Q243": 1,  # prevent reverse engineering -> code obfuscation
    "T1-Q260": 1,  # stolen laptop protection -> disk encryption
    "T1-Q390": 1,  # cardholder logs -> masking
    # Threat vectors, vulnerabilities, attacks (2.x)
    "T1-Q115": 2,  # air-gap data loss path -> removable devices
    "T1-Q136": 2,  # no longer receiving updates -> end-of-life vulnerability
    "T1-Q150": 2,  # default credentials on VPN appliance
    "T1-Q276": 2,  # /etc/shadow access -> password cracker attack
    "T1-Q392": 2,  # tailgating into office
    "T1-Q461": 2,  # off-hours VPN copy -> data exfiltration indicator
    "T1-Q555": 2,  # host isolation mitigation
    "T1-Q593": 2,  # outdated algorithms -> cryptographic vulnerability
    # Architecture, resilience, data protection (3.x)
    "T1-Q50": 3,   # warm site for two-day RTO/RPO
    "T1-Q184": 3,  # critical data category (classification)
    "T1-Q187": 3,  # hot site for hurricanes
    "T1-Q239": 3,  # one ISP -> single point of failure (resilience)
    "T1-Q247": 3,  # VM platform -> IaaS architecture
    "T1-Q348": 3,  # government fileshare -> confidential/restricted classification
    "T1-Q368": 3,  # data being processed -> data in use
    "T1-Q438": 3,  # unused Ethernet port -> port security
    "T1-Q448": 3,  # lowest RTO/RPO -> hot site
    "T1-Q487": 3,  # IaaS controls -> responsibility matrix
    # Security operations (4.x)
    "T1-Q56": 4,   # code authenticity -> code signing (application security)
    "T1-Q64": 4,   # regex in source code -> input validation
    "T1-Q70": 4,   # SOC marks alert normal -> tuning
    "T1-Q133": 4,  # measuring risk of new vuln -> asset inventory
    "T1-Q161": 4,  # C2 investigation -> network/firewall logs
    "T1-Q170": 4,  # addressing CVEs -> patch availability (vuln response)
    "T1-Q182": 4,  # EDR against malware lateral movement
    "T1-Q209": 4,  # patch scoping -> asset inventory
    "T1-Q211": 4,  # executives testing IR plan -> tabletop (IR training)
    "T1-Q249": 4,  # image geolocation -> metadata (forensic data source)
    "T1-Q286": 4,  # prevent repackaged software -> code signing
    "T1-Q295": 4,  # conditional access + extra factors (IAM)
    "T1-Q346": 4,  # new IR docs -> run tabletop next
    "T1-Q397": 4,  # find C2 destination -> firewall logs
    "T1-Q400": 4,  # tabletop familiarizes staff with IR process
    "T1-Q415": 4,  # block malicious attachments -> inline email scanning
    "T1-Q422": 4,  # harden virtual host before go-live
    "T1-Q464": 4,  # replace Telnet with SSH (hardening)
    "T1-Q471": 4,  # login reviews -> automated alerting
    "T1-Q488": 4,  # detective/corrective procedures -> incident response plan
    "T1-Q492": 4,  # breach roles/responsibilities -> tabletop exercise
    "T1-Q518": 4,  # IDS missed activity -> update signatures
    "T1-Q551": 4,  # Wi-Fi heat map site survey
    "T1-Q557": 4,  # tabletop -> update the IRP
    "T1-Q597": 4,  # destruction proof -> certification (asset disposal)
    # Program management, risk, third-party, awareness (5.x)
    "T1-Q12": 5,   # counterfeit hardware -> supply chain analysis
    "T1-Q36": 5,   # situational awareness -> update recurring training
    "T1-Q55": 5,   # offensive assessment -> red team
    "T1-Q88": 5,   # fraudulent wire -> update processes (user guidance)
    "T1-Q148": 5,  # legacy app risk -> mitigate (risk strategy)
    "T1-Q162": 5,  # badge entry attempt -> physical penetration test
    "T1-Q192": 5,  # keep-operating plan -> business continuity
    "T1-Q256": 5,  # tornado destroyed DC -> disaster recovery plan
    "T1-Q304": 5,  # supply chain full-spectrum analysis
    "T1-Q329": 5,  # vendor diversity benefit
    "T1-Q360": 5,  # training topic -> recognizing phishing
    "T1-Q410": 5,  # pen test procedures -> rules of engagement
    "T1-Q434": 5,  # CEO-lookalike link -> security awareness training
    "T1-Q524": 5,  # SSO credential disclosure -> phishing recognition campaign
    "T1-Q554": 5,  # security program -> update policies/handbooks
    "T1-Q568": 5,  # compromised vendor email -> awareness guidance
    "T1-Q571": 5,  # false-positive phishing reports -> improve training
    "T1-Q576": 5,  # employees clicked links -> social engineering training
    "T1-Q589": 5,  # PII on shared drive -> privacy
}

DOMAIN_NAMES = {
    1: "1.0 General Security Concepts",
    2: "2.0 Threats, Vulnerabilities, and Mitigations",
    3: "3.0 Security Architecture",
    4: "4.0 Security Operations",
    5: "5.0 Security Program Management and Oversight",
}


def compile_rules():
    return {
        d: [(re.compile(p, re.IGNORECASE), w) for p, w in pairs]
        for d, pairs in KEYWORDS.items()
    }


def score_question(q: dict, rules) -> tuple[int, dict[int, int]]:
    stem = q["question"]
    options = " ".join(q["options"].values())
    explanation = q.get("explanation", "")

    scores = {d: 0 for d in KEYWORDS}
    for d, pats in rules.items():
        for rx, w in pats:
            scores[d] += 3 * w * len(rx.findall(stem))
            scores[d] += 1 * w * len(rx.findall(options))
            scores[d] += 1 * w * len(rx.findall(explanation))

    best = max(scores, key=lambda d: (scores[d], -d))
    return best, scores


def main() -> None:
    questions = json.loads(DATA.read_text(encoding="utf-8"))
    rules = compile_rules()

    dist: dict[int, int] = {d: 0 for d in KEYWORDS}
    low_confidence: list[tuple[float, dict, int, dict]] = []

    for q in questions:
        best, scores = score_question(q, rules)
        if q["id"] in OVERRIDES:
            best = OVERRIDES[q["id"]]
        q["domain"] = best
        dist[best] += 1

        ranked = sorted(scores.values(), reverse=True)
        margin = ranked[0] - ranked[1]
        low_confidence.append((margin, q, best, scores))

    DATA.write_text(json.dumps(questions, indent=2, ensure_ascii=False), encoding="utf-8")

    total = len(questions)
    print(f"Tagged {total} questions with domains:\n")
    for d in sorted(dist):
        pct = 100 * dist[d] / total
        print(f"  {DOMAIN_NAMES[d]:<48} {dist[d]:>4}  ({pct:.1f}%)")

    print("\nLowest-confidence assignments (margin <= 4):")
    low_confidence.sort(key=lambda t: t[0])
    shown = 0
    for margin, q, best, scores in low_confidence:
        if margin > 4 or shown >= 80:
            break
        shown += 1
        print(f"  [{q['id']:>8}] d{best} margin={margin:<3}  {q['question'][:100]}")


if __name__ == "__main__":
    main()
