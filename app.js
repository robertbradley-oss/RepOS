// RepOS front-end logic: mock ticket data, queue filtering, conversation rendering, macros, and context panels.
const STORAGE_KEY = "tessario.support.workspace.v22";
const TICKET_COUNTER_STORAGE_KEY = "tessario.support.lastTicketNumber.v1";
const USERS_STORAGE_KEY = "tessario.support.assignmentUsers.v1";
const PROFILE_STORAGE_KEY = "tessario.support.profile.v1";
const SETTINGS_STORAGE_KEY = "tessario.support.workspaceSettings.v1";
const KNOWLEDGE_STORAGE_KEY = "tessario.support.knowledgeVaultFiles.v1";
const PRODUCT_LINK_STORAGE_KEY = "tessario.support.productLinkLibrary.v1";
const CUSTOMER_ACCOUNTS_STORAGE_KEY = "tessario.support.customerAccounts.v1";
const NOTIFICATIONS_STORAGE_KEY = "tessario.support.notifications.v1";
const BACKEND_STATE_ENDPOINT = "/api/state";
const LEGACY_STORAGE_PREFIX = ["flow", "desk"].join("");
const LEGACY_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}.support.workspace.v11`;
const LEGACY_TICKET_COUNTER_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}.support.lastTicketNumber.v1`;
const LEGACY_USERS_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}.support.assignmentUsers.v1`;
const LEGACY_PROFILE_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}.support.profile.v1`;
const LEGACY_SETTINGS_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}.support.workspaceSettings.v1`;
const LEGACY_KNOWLEDGE_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}.support.knowledgeVaultFiles.v1`;
const LEGACY_PRODUCT_LINK_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}.support.productLinkLibrary.v1`;
const LEGACY_CUSTOMER_ACCOUNTS_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}.support.customerAccounts.v1`;
const LEGACY_NOTIFICATIONS_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}.support.notifications.v1`;
const CURRENT_USER = "CS14 Robert";
const MIN_TICKET_NUMBER = 100000;
const verifiedPurchaseSources = ["Amazon", "iSpring direct", "Home Depot", "Lowe's", "Walmart", "eBay"];
const legacyRepNameMap = {
  ["Robert" + " Bradley"]: "CS14 Robert",
  ["Nick" + " Lawrence"]: "CS1 Nick",
  ["Julius" + " Francis"]: "CS2 Julius",
  ["Sean" + " Carter"]: "CS3 Sean",
  ["Jonathan" + " Brown"]: "CS4 Jonathan",
  ["Michelle" + " Roberts"]: "CS5 Michelle",
  "CS14 · Robert": "CS14 Robert",
  "CS1 · Nick": "CS1 Nick",
  "CS2 · Julius": "CS2 Julius",
  "CS3 · Sean": "CS3 Sean",
  "CS4 · Jonathan": "CS4 Jonathan",
  "CS5 · Michelle": "CS5 Michelle"
};

const workspaceConfig = {
  productName: "RepOS",
  workspaceName: "iSpring Water Systems",
  workspaceShortName: "iSpring",
  workspaceLabel: "Workspace: iSpring Water Systems",
  tagline: "Ticketing made clear.",
  workspaceNote: "iSpring Water Systems is the active workspace in this RepOS session.",
  ticketPrefix: "ISP",
  departments: ["3-CS", "Support", "Technical Support", "Warranty", "Returns"],
  defaultDepartment: "3-CS",
  defaultQueue: "Support",
  supportMailbox: "support@ispringfilters.com",
  supportMailboxLabel: "iSpring Support",
  defaultSettings: {
    workspaceName: "iSpring Water Systems",
    workspaceLabel: "Workspace: iSpring Water Systems",
    supportEmail: "support@ispringfilters.com",
    currentUserName: "CS14 Robert",
    currentUserRole: "admin",
    defaultAssignee: "CS14 Robert",
    timezone: "America/New_York",
    demoMode: true,
    allowedStatuses: ["Open", "Closed, Waiting On Response", "Closed"]
  },
  sourceChannels: ["Email", "Phone", "Web Form", "Amazon", "Home Depot"],
  orderPlaceholder: "Amazon or iSpring order",
  modelPlaceholder: "RCC7P-AK, RO500AK, WGB32B",
  ticketCategories: ["Troubleshooting", "Warranty", "Replacement Parts", "Returns", "Water Test", "Review Follow-Up"],
  productFamilies: ["Under Sink RO", "Tankless RO", "Whole House", "Water Softener", "UV", "Sediment", "Warranty"],
  statuses: ["Open", "Closed, Waiting On Response", "Closed"],
  waitingCustomerStatus: "Closed, Waiting On Response",
  waitingWorkspaceStatus: "Waiting iSpring",
  activeWorkloadStatuses: ["Open"],
  defaultCreateTicket: {
    subjectPlaceholder: "Example: RO500AK beeping after filter replacement",
    productFamily: "Under Sink RO",
    issueType: "Troubleshooting"
  },
  productTeamLabels: {
    "Under Sink RO": "RO Support",
    "Tankless RO": "Tankless RO Support",
    "Whole House": "Whole House Support",
    "Water Softener": "Whole House Support",
    UV: "UV Support",
    Sediment: "Pre-filter Support"
  },
  purchaseSourceRules: [
    { label: "Amazon", source: "Amazon", orderPattern: "^11\\d-" },
    { label: "Home Depot", source: "Home Depot", orderPattern: "^HD-" },
    { label: "iSpring direct", orderPattern: "^IS-" }
  ],
  purchaseSources: ["Amazon", "iSpring direct", "Home Depot", "Lowe's", "Walmart", "eBay", "Unverified mention", "Not verified", "Unknown"],
  customFields: ["model", "family", "order", "warranty", "receipt", "missing", "attachments", "waterTest"],
  reviewLinks: {
    default: "https://www.ispringfilter.com/pages/review",
    google: "https://www.google.com/search?q=iSpring+Water+Systems+reviews",
    trustpilot: "https://www.trustpilot.com/review/ispringfilter.com"
  },
  warrantyRules: [
    "Confirm proof of purchase before promising warranty coverage.",
    "Confirm purchase date and seller before registration or replacement approval.",
    "Consumable items may have separate coverage rules."
  ],
  returnRules: [
    "Return approval depends on order source, return window, and confirmed product condition.",
    "Amazon shipping damage usually routes through Amazon unless manager-approved.",
    "Collect order number, photos, and test results before approving exceptions."
  ],
  brandGuardrails: [
    "Do not take payment over the phone.",
    "Do not promise stock availability without inventory confirmation."
  ],
  conditionalGuardrails: [
    { when: (ticket) => !ticket.receipt || String(ticket.warranty).toLowerCase().includes("needs"), text: "Do not promise warranty before receipt/date check." },
    { when: (ticket) => ticket.source === "Amazon", text: "Amazon shipping issues usually need Amazon unless manager-approved." },
    { when: (ticket) => ticket.family === "UV", text: "UV bulbs and quartz sleeves are normally consumables." },
    { when: (ticket) => ticket.family === "Tankless RO", text: "Confirm tankless filter part numbers before committing." }
  ],
  knowledgeVaultCategories: [
    "Product Manual",
    "Troubleshooting Guide",
    "Warranty / Return Policy",
    "Macro Sheet",
    "Product Reference",
    "Water Test Rules",
    "Internal Support Notes",
    "Installation Guide",
    "Other"
  ],
  knowledgeVaultStatuses: ["Approved", "Needs Review", "Outdated", "Draft"],
  knowledgeVault: [],
  products: {
    "Under Sink RO": {
      commonModels: ["RCC7P-AK", "RCC7AK"],
      replacementPart: "replacement part confirmed by support",
      checklist: ["Check tank pressure", "Confirm feed valve and tubing"],
      diagnosis: {
        issue: "Tank pressure, feed valve, or tubing restriction",
        firstTest: "Check empty tank pressure and feed valve position.",
        confirms: "Flow returns after pressure or valve correction."
      },
      similarTickets: ["ISP-27192 tank pressure reset", "ISP-26880 low faucet flow"]
    },
    "Tankless RO": {
      commonModels: ["RO500AK"],
      replacementPart: "replacement filter set",
      checklist: ["Confirm filter part numbers", "Run reset/rinse sequence"],
      diagnosis: {
        issue: "Reset/rinse sequence or filter compatibility",
        firstTest: "Confirm display state, filter labels, and reset/rinse steps.",
        confirms: "Display returns to normal or shows a specific error pattern."
      },
      similarTickets: ["ISP-28114 RO500 reset loop", "ISP-27943 RO500AK filter light"]
    },
    "Whole House": {
      commonModels: ["WGB32B", "WGB32BM"],
      replacementPart: "replacement part confirmed by support",
      checklist: ["Run bypass test", "Review water test limits"],
      diagnosis: {
        issue: "Flow restriction, media limit, or install direction",
        firstTest: "Run bypass test and review water test.",
        confirms: "Bypass restores flow or treated water test confirms media issue."
      },
      similarTickets: ["ISP-27910 WGB32BM bypass test", "ISP-26631 pressure drop after sediment"]
    },
    "Water Softener": {
      commonModels: ["WCS45KG"],
      replacementPart: "replacement part confirmed by support",
      checklist: ["Confirm startup cycle", "Check brine line seating"],
      diagnosis: {
        issue: "Startup fill cycle not completed or brine line not seated",
        firstTest: "Confirm valve completed startup and brine line is connected tightly.",
        confirms: "Manual regen fills brine tank and draw cycle pulls brine normally."
      },
      similarTickets: ["ISP-25190 softener startup fill", "ISP-25244 brine draw check"]
    },
    UV: {
      commonModels: ["UVF55FS"],
      replacementPart: "lamp or ballast part after review",
      checklist: ["Confirm lamp seating", "Check ballast label"],
      diagnosis: {
        issue: "Lamp seating, ballast, or consumable lamp failure",
        firstTest: "Confirm lamp pins and ballast label.",
        confirms: "Alarm clears after reseating or known-good lamp test."
      },
      similarTickets: ["ISP-27344 UV lamp alarm", "ISP-27002 ballast replacement review"]
    },
    Sediment: {
      commonModels: ["WSP50ARB"],
      replacementPart: "replacement sediment screen",
      checklist: ["Flush screen", "Compare pressure before and after filter"],
      diagnosis: {
        issue: "Sediment screen clogged or damaged",
        firstTest: "Flush screen and compare pressure before/after the spin-down filter.",
        confirms: "Flow returns after flushing, or screen shows visible clog/damage."
      },
      similarTickets: ["ISP-26912 spin-down screen clog", "ISP-26310 sediment flush routine"]
    },
    Warranty: {
      commonModels: ["RCC7AK"],
      replacementPart: "replacement part confirmed by support",
      checklist: ["Capture missing customer information"],
      diagnosis: {
        issue: "Missing information",
        firstTest: "Collect model, order, photos, and symptom pattern.",
        confirms: "Customer provides enough detail for a workflow decision."
      },
      similarTickets: ["ISP-24410 receipt request", "ISP-24892 customer registration"]
    }
  },
  defaultProductDiagnosis: {
    issue: "Missing information",
    firstTest: "Collect model, order, photos, and symptom pattern.",
    confirms: "Customer provides enough detail for a workflow decision."
  },
  defaultProfile: {
    firstName: "Robert",
    lastName: "",
    displayName: "CS14 Robert",
    email: "cs14.ispring@hotmail.com",
    phone: "678-555-0144",
    mobile: "",
    extension: "CS14",
    username: "cs14",
    role: "Admin",
    twoFactorEnabled: true,
    defaultLandingView: "open",
    defaultQueueView: "table",
    compactRows: false,
    showMetrics: true,
    showTicketPreview: false,
    sidebarCollapsedDefault: false,
    theme: "Light",
    accentColor: "#7C5CFF",
    ticketDensity: "Comfortable",
    defaultSort: "Last Updated",
    autoOpenFirstTicket: false,
    mySignature: "Thanks,\nRobert",
    departmentSignature: "Customer Service Department\niSpring Water Systems",
    defaultSignature: "My Signature",
    insertSignature: true,
    notifyAssigned: true,
    notifyCustomerReplies: true,
    notifySlaOverdue: true,
    notifyOverdue: true,
    notifyMentioned: true,
    notifyReceiptsWarranty: true,
    notifyAssignmentEligibility: true,
    inAppNotifications: true,
    emailNotifications: false,
    notifyAiAssigned: true,
    notificationStyle: "In-app only",
    quietHoursEnabled: false,
    quietHoursStart: "18:00",
    quietHoursEnd: "08:00"
  },
  reps: [
    { id: "robert-bradley", name: "CS14 Robert", role: "admin", assignmentEligible: true, removed: false },
    { id: "nick-lawrence", name: "CS1 Nick", role: "rep", assignmentEligible: true, removed: false },
    { id: "julius-francis", name: "CS2 Julius", role: "rep", assignmentEligible: true, removed: false },
    { id: "sean-carter", name: "CS3 Sean", role: "rep", assignmentEligible: true, removed: false },
    { id: "jonathan-brown", name: "CS4 Jonathan", role: "rep", assignmentEligible: true, removed: false },
    { id: "michelle-roberts", name: "CS5 Michelle", role: "rep", assignmentEligible: true, removed: false }
  ],
  macroCategories: [
    "Warranty / Receipt",
    "RO Troubleshooting",
    "Tankless RO",
    "Whole House",
    "Replacement Parts",
    "Returns",
    "Reviews",
    "Water Tests"
  ],
  macros: [
    {
      id: "receipt-request",
      name: "Warranty receipt request",
      category: "Warranty / Receipt",
      favorite: true,
      dailyUse: true,
      body:
        "Hi {{customer_first_name}},\n\nThanks for contacting iSpring. To review warranty coverage for {{model}}, please send the receipt or order confirmation showing the purchase date, seller, and order number.\n\nOnce we have that, we can update {{ticket_number}} and confirm the next step.\n\nThanks,\n{{rep_name}}"
    },
    {
      id: "warranty-registered",
      name: "Warranty registration completed",
      category: "Warranty / Receipt",
      favorite: true,
      dailyUse: true,
      body:
        "Hi {{customer_first_name}},\n\nYour warranty registration for {{model}} has been completed under {{ticket_number}}.\n\nPlease keep your receipt or order confirmation for your records. Reply to this ticket if anything needs to be updated.\n\nThanks,\n{{rep_name}}"
    },
    {
      id: "tank-pressure-reset",
      name: "Tank pressure reset",
      category: "RO Troubleshooting",
      favorite: true,
      body:
        "Hi {{customer_first_name}},\n\nFor {{model}}, please turn off the feed water, open the RO faucet, and drain the tank completely.\n\nOnce the tank is empty, check the air pressure at the tank valve. The target is usually 7-10 PSI when the tank is empty.\n\nPlease reply with the pressure reading and whether flow improves after the tank refills.\n\nThanks,\n{{rep_name}}"
    },
    {
      id: "tankless-rinse",
      name: "Tankless RO reset/rinse",
      category: "Tankless RO",
      favorite: true,
      body:
        "Hi {{customer_first_name}},\n\nFor {{model}}, please reseat each filter, run the reset step until the display confirms, and complete a full rinse cycle.\n\nIf the alert continues, please send a short video of the display and clear photos of the filter labels.\n\nThanks,\n{{rep_name}}"
    },
    {
      id: "whole-house-pressure-drop",
      name: "Whole-house pressure drop",
      category: "Whole House",
      favorite: true,
      dailyUse: true,
      body:
        "Hi {{customer_first_name}},\n\nFor {{model}}, please place the system in bypass and compare water pressure at the same fixture before and after bypassing the filters.\n\nIf pressure improves in bypass, please send photos of the filter order, flow direction, and any pressure gauge readings. That will help us confirm whether the restriction is in the filter system or elsewhere in the plumbing.\n\nThanks,\n{{rep_name}}"
    },
    {
      id: "parts-sent",
      name: "Replacement parts sent + review request",
      category: "Replacement Parts",
      favorite: true,
      dailyUse: true,
      body:
        "Hi {{customer_first_name}},\n\nThe replacement part for {{model}} has been sent for {{ticket_number}}.\n\nPart: {{replacement_part}}. Please allow the carrier tracking to update, and let us know if anything looks incorrect when it arrives.\n\nAfter everything is working again, we would appreciate a quick review here: {{product_review_link}}\n\nThanks,\n{{rep_name}}"
    },
    {
      id: "return-policy",
      name: "Return policy explanation",
      category: "Returns",
      favorite: true,
      body:
        "Hi {{customer_first_name}},\n\nWe can help review return options for {{model}}. Return approval and return shipping depend on the order source, return window, and whether a product defect is confirmed.\n\nPlease send the order number, purchase source, and any photos or test results showing the issue so we can review it accurately.\n\nThanks,\n{{rep_name}}"
    },
    {
      id: "water-test",
      name: "Water test follow-up",
      category: "Water Tests",
      favorite: true,
      dailyUse: true,
      body:
        "Hi {{customer_first_name}},\n\nA complete water test will help us review {{model}} without guessing. Please send source water TDS, filtered water TDS, hardness, iron, manganese, pH, and sulfur if available.\n\nFor well water, please also include the test date and whether the sample was taken before or after the system.\n\nThanks,\n{{rep_name}}"
    },
    {
      id: "photo-video-request",
      name: "Photo/video request",
      category: "RO Troubleshooting",
      favorite: false,
      body:
        "Hi {{customer_first_name}},\n\nCould you please send clear photos or a short video showing the issue with {{model}}? Please include the model label, tubing/connection area, and the symptom you are seeing.\n\nThat will help us confirm the next step for {{ticket_number}}.\n\nThanks,\n{{rep_name}}"
    },
    {
      id: "whole-house-bypass-test",
      name: "Whole house bypass test",
      category: "Whole House",
      favorite: false,
      body:
        "Hi {{customer_first_name}},\n\nFor {{model}}, please place the system in bypass and compare the water pressure before and after bypassing the filters. This helps us confirm whether the restriction is inside the filter system or elsewhere in the plumbing.\n\nPlease reply with the results and any pressure gauge readings if available.\n\nThanks,\n{{rep_name}}"
    },
    {
      id: "review-request",
      name: "Review follow-up",
      category: "Reviews",
      favorite: true,
      dailyUse: true,
      body:
        "Hi {{customer_first_name}},\n\nI am glad we could help with {{model}}. If everything is working well now, we would appreciate a quick review or update here: {{product_review_link}}\n\nThank you for working with us on {{ticket_number}}.\n\nThanks,\n{{rep_name}}"
    }
  ]
};

const seedProfile = workspaceConfig.defaultProfile;
const supportedTicketStatuses = workspaceConfig.statuses;
const editableStatuses = supportedTicketStatuses;
const statuses = ["All statuses", ...editableStatuses];
const toolbarStatusActions = [
  { value: "", label: "Status" },
  ...editableStatuses.map((status) => ({ value: status, label: status })),
  { value: "view:follow-up", label: "Follow up" },
  { value: "view:needs-receipt", label: "Needs receipt" },
  { value: "view:customer-replied", label: "Customer replied" },
  { value: "view:overdue", label: "Overdue" }
];
const closedDateRangeOptions = ["Today", "Yesterday", "This Week", "This Month", "This Quarter"];
const seedPriorities = ["Urgent", "High", "Normal", "Low"];
const productFamilies = workspaceConfig.productFamilies;
const issueTypes = workspaceConfig.ticketCategories;
const activeWorkloadStatuses = workspaceConfig.activeWorkloadStatuses;
const userRoles = ["admin", "manager", "rep"];
const seedUsers = workspaceConfig.reps;
const macroCategories = workspaceConfig.macroCategories;
const macroLibrary = workspaceConfig.macros;
const knowledgeCategories = workspaceConfig.knowledgeVaultCategories;
const knowledgeStatuses = workspaceConfig.knowledgeVaultStatuses;
const closedQueueStatuses = ["Closed", "Resolved"];
const waitingQueueStatuses = ["Closed, Waiting On Response", "Waiting On Response", "Waiting Customer"];
const productLinkPlatforms = ["Amazon", "Home Depot", "Google Review", "Trustpilot", "Other"];
const seedProductLinks = [
  productLinkSeedEntry("RCC7", "Amazon", "https://www.amazon.com/dp/B003XELTTG"),
  productLinkSeedEntry("RCC7P", "Amazon", "https://www.amazon.com/dp/B003ZZUBHE"),
  productLinkSeedEntry("RCC7AK", "Amazon", "https://www.amazon.com/dp/B005LJ8EXU"),
  productLinkSeedEntry("RCC7P-AK", "Amazon", "https://www.amazon.com/dp/B005LKKMYS"),
  productLinkSeedEntry("RCC1UP-AK", "Amazon", "https://www.amazon.com/dp/B006X3YJKK"),
  productLinkSeedEntry("RCC7AK-UV", "Amazon", "https://www.amazon.com/dp/B006T3HYQ0"),
  productLinkSeedEntry("RCB3P", "Amazon", "https://www.amazon.com/dp/B007K1FDJA"),
  productLinkSeedEntry("RO500", "Amazon", "https://www.amazon.com/dp/B07WK457JX"),
  productLinkSeedEntry("RO500AK", "Amazon", "https://www.amazon.com/dp/B09CHBC9CP"),
  productLinkSeedEntry("RO5004F", "Amazon", "https://www.amazon.com/dp/B0DWZ6P9SK"),
  productLinkSeedEntry("RO800", "Amazon", "https://www.amazon.com/dp/B09RQ7ZJPJ"),
  productLinkSeedEntry("RO1000", "Amazon", "https://www.amazon.com/dp/B0CP9YXVY5"),
  productLinkSeedEntry("PH100", "Amazon", "https://www.amazon.com/dp/B0844HF76N"),
  productLinkSeedEntry("WGB32B", "Amazon", "https://www.amazon.com/dp/B008GNRMYK"),
  productLinkSeedEntry("WGB32BM", "Amazon", "https://www.amazon.com/dp/B01FI3BLYM"),
  productLinkSeedEntry("WGB32B-KS", "Amazon", "https://www.amazon.com/dp/B08HNJ9R62"),
  productLinkSeedEntry("WSP-50", "Amazon", "https://www.amazon.com/dp/B072YVNRZN"),
  productLinkSeedEntry("WSPARJ", "Amazon", "https://www.amazon.com/dp/B0BGQKS4GB"),
  productLinkSeedEntry("WSP50ARB", "Amazon", "https://www.amazon.com/dp/B07XLP2T2Y"),
  productLinkSeedEntry("WF150K", "Amazon", "https://www.amazon.com/dp/B08428Y5HV"),
  productLinkSeedEntry("WCFM500K", "Amazon", "https://www.amazon.com/dp/B08TMZYYQY"),
  productLinkSeedEntry("UVF55FS", "Amazon", "https://www.amazon.com/dp/B08HW1VRJC"),
  productLinkSeedEntry("T32M", "Amazon", "https://www.amazon.com/dp/B00439MYYE"),
  productLinkSeedEntry("T55M", "Amazon", "https://www.amazon.com/dp/B01CES39N0"),
  productLinkSeedEntry("T11M", "Amazon", "https://www.amazon.com/dp/B0043BKSMM"),
  productLinkSeedEntry("ED2000", "Amazon", "https://www.amazon.com/dp/B0744TC3PW"),
  productLinkSeedEntry("RCD100", "Amazon", "https://www.amazon.com/dp/B0C3RX6F82"),
  productLinkSeedEntry("", "Google Review", "https://www.google.com/search?sca_esv=8526ead1974f28d5&sxsrf=ANbL-n43LVGg0ICnAz2EoWiZEsaEYDRe3g:1777386206959&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOVZY_oDm8oNpKUZA1_NJWo_O2v5qtK7MspPrGnFuCqVayvcjVd-pAdPotN9nhsNyXnI9XRSixqigJlIEeJIXaAyzS4PWGmLYfPwshkxBSutLBif_qQ%3D%3D&q=iSpring+Water+Systems+Reviews&sa=X&ved=2ahUKEwiD-_nL35CUAxWb1skDHbhGCJUQ0bkNegQIJRAH&biw=1920&bih=911&dpr=1", "Google Review"),
  productLinkSeedEntry("", "Trustpilot", "https://www.trustpilot.com/review/ispringfilter.com", "Trustpilot"),
  productLinkSeedEntry("RCC7", "Home Depot", "https://www.homedepot.com/p/206396226"),
  productLinkSeedEntry("RCC7AK", "Home Depot", "https://www.homedepot.com/p/206467327"),
  productLinkSeedEntry("WGB32BM", "Home Depot", "https://www.homedepot.com/p/206880059")
];
const tableColumns = [
  { key: "select", label: "", className: "check-col" },
  { key: "id", label: "Ticket #" },
  { key: "updated", label: "Last Activity" },
  { key: "subject", label: "Subject" },
  { key: "customer", label: "Customer" },
  { key: "assignee", label: "Assigned To" },
  { key: "status", label: "Status" }
];
const tableColumnKeys = new Set(tableColumns.map((column) => column.key));

const viewConfig = [
  { id: "open", label: "Open", title: "Open Tickets", match: (ticket) => isActiveTicket(ticket) },
  { id: "closed", label: "Closed", title: "Closed Tickets", match: (ticket) => isClosedDisplayStatus(ticket) }
];

const queueTabConfig = [
  { id: "open", label: "Open", title: "Open Tickets", match: (ticket) => isActiveTicket(ticket) },
  { id: "assigned", label: "Assigned To Me", title: "Assigned To Me", match: (ticket) => assignedToCurrentDemoUser(ticket) && isActiveTicket(ticket) },
  { id: "closed", label: "Closed", title: "Closed Tickets", match: (ticket) => isClosedDisplayStatus(ticket) }
];

const allQueueViews = [...queueTabConfig];
const QUEUE_PAGE_SIZE = 50;

const notificationFilters = [
  { id: "all", label: "All", match: () => true },
  { id: "unread", label: "Unread", match: (item) => !item.read },
  { id: "assigned", label: "Assigned", match: (item) => ["assigned", "reassigned", "assignment"].includes(item.category) },
  { id: "customer", label: "Customer replies", match: (item) => item.category === "customer" },
  { id: "sla", label: "SLA", match: (item) => item.category === "sla" },
  { id: "receipts", label: "Receipts/Warranty", match: (item) => item.category === "receipts" }
];

const seedTickets = [
  buildTicket({
    id: "ISP-28501",
    subject: "RCC7P-AK tank not filling after filter change",
    customer: "Ellen Brooks",
    email: "ellen.brooks@example.com",
    phone: "615-555-0114",
    model: "RCC7P-AK",
    family: "Under Sink RO",
    source: "Email",
    assignee: "CS14 Robert",
    status: "Open",
    priority: "High",
    ageHours: 8,
    dueInHours: 16,
    tags: ["tank-not-filling", "needs-pressure", "follow-up-due"],
    missing: ["Needs Photos"],
    order: "IS-90341",
    warranty: "Registered",
    receipt: true,
    previousTickets: ["ISP-27192 low flow after install"],
    attachments: [
      attachment("under-sink-install.jpg", "install photo", "May 8"),
      attachment("receipt.pdf", "receipt", "May 8")
    ],
    issue: "Tank pressure or feed valve issue",
    firstTest: "Confirm feed valve is open and check empty tank pressure.",
    confirms: "Tank fills after pressure is reset to 7-10 PSI empty, or feed valve restores flow.",
    customerMessage:
      "The tank on my RCC7P-AK is not filling after I changed filters. The faucet only gives a small stream.",
    repReply: "Thanks Ellen. Let's first confirm tank pressure and whether the feed valve is fully open.",
    internalNote: "Receipt is attached. Ask for a photo of tank valve and tubing before replacement discussion."
  }),
  buildTicket({
    id: "ISP-28500",
    subject: "RO500AK beeping after filter replacement",
    customer: "Dana Mitchell",
    email: "dana.mitchell@example.com",
    phone: "404-555-0198",
    model: "RO500AK",
    family: "Tankless RO",
    source: "Amazon",
    assignee: "CS14 Robert",
    status: "Waiting Customer",
    priority: "High",
    ageHours: 31,
    dueInHours: -3,
    tags: ["beeping", "filter-light", "needs-video"],
    missing: ["Needs Photos"],
    order: "112-8901132-4589011",
    warranty: "Registered",
    receipt: true,
    previousTickets: ["ISP-27943 low flow after install"],
    attachments: [
      attachment("display-beeping.jpg", "install photo", "May 7"),
      attachment("amazon-receipt.pdf", "receipt", "May 7")
    ],
    issue: "Reset/rinse sequence incomplete",
    firstTest: "Confirm filter light color and whether reset was completed.",
    confirms: "Beeping stops after reset/rinse, or display shows normal blue filter lights.",
    customerMessage:
      "I replaced the filters on my RO500AK and now it keeps beeping. Water comes out but the light will not clear.",
    repReply: "Please send a short video of the display and the labels on the installed filters.",
    internalNote: "Do not promise replacement filters until part numbers are confirmed."
  }),
  buildTicket({
    id: "ISP-28499",
    subject: "WGB32B pressure drop throughout house",
    customer: "Parker Lane",
    email: "parker.lane@example.com",
    phone: "919-555-0128",
    model: "WGB32B",
    family: "Whole House",
    source: "Phone",
    assignee: "CS2 Julius",
    status: "Open",
    priority: "Normal",
    ageHours: 14,
    dueInHours: 30,
    tags: ["pressure-drop", "sediment", "bypass-test"],
    missing: [],
    order: "IS-90121",
    warranty: "Needs review",
    receipt: false,
    previousTickets: [],
    attachments: [attachment("filter-housing.jpg", "install photo", "May 8")],
    issue: "Sediment filter clogging or flow restriction",
    firstTest: "Run bypass test and compare pressure before/after filters.",
    confirms: "Pressure returns to normal in bypass, or sediment stage shows heavy loading.",
    customerMessage:
      "Pressure dropped in every fixture after changing the sediment filter in the WGB32B.",
    repReply: "Please run the bypass test and tell us whether pressure improves immediately.",
    internalNote: "Ask about well sediment load and replacement schedule."
  }),
  buildTicket({
    id: "ISP-28498",
    subject: "WGB32BM manganese still showing after install",
    customer: "Oak Ridge Cabin Supply",
    email: "service@oakridge.example.com",
    phone: "865-555-0142",
    model: "WGB32BM",
    family: "Whole House",
    source: "Web Form",
    assignee: "CS2 Julius",
    status: "Escalated",
    priority: "Urgent",
    ageHours: 92,
    dueInHours: -24,
    tags: ["manganese", "water-test", "escalated"],
    missing: ["Needs Water Test"],
    order: "IS-88402",
    warranty: "Needs registration",
    receipt: false,
    previousTickets: ["ISP-27910 install pressure question"],
    attachments: [
      attachment("raw-water-test.pdf", "water test", "May 6"),
      attachment("install-direction.jpg", "install photo", "May 6")
    ],
    issue: "Media limit exceeded or flow direction/install issue",
    firstTest: "Confirm flow direction and compare raw/treated manganese readings.",
    confirms: "Correct flow direction plus treated test still shows manganese above expected range.",
    customerMessage:
      "The WGB32BM helped at first, but manganese stains are returning and pressure is lower.",
    repReply: "Please send a bypass pressure reading and a photo showing the flow direction arrow.",
    internalNote: "Technical lead reviewing. Do not recommend media replacement before bypass test."
  }),
  buildTicket({
    id: "ISP-28497",
    subject: "WCS45KG no water in brine tank after startup",
    customer: "Harper Stone",
    email: "harper.stone@example.com",
    phone: "512-555-0182",
    model: "WCS45KG",
    family: "Water Softener",
    source: "Email",
    assignee: "CS14 Robert",
    status: "New",
    priority: "Normal",
    ageHours: 3,
    dueInHours: 21,
    tags: ["startup", "brine-tank", "softener"],
    missing: ["Needs Photos"],
    order: "IS-90779",
    warranty: "Registered",
    receipt: true,
    previousTickets: [],
    attachments: [],
    issue: "Startup fill cycle not completed or brine line not seated",
    firstTest: "Confirm valve completed startup and brine line is connected tightly.",
    confirms: "Manual regen fills brine tank and draw cycle pulls brine normally.",
    customerMessage:
      "I started up my WCS45KG but there is no water in the brine tank. I am not sure if that is normal.",
    repReply: "",
    internalNote: "Send startup fill explanation and ask for valve display photo."
  }),
  buildTicket({
    id: "ISP-28496",
    subject: "UVF55FS ballast alarm and lamp not turning on",
    customer: "Marisol Vega",
    email: "marisol.vega@example.com",
    phone: "210-555-0180",
    model: "UVF55FS",
    family: "UV",
    source: "Phone",
    assignee: "CS1 Nick",
    status: "Waiting iSpring",
    priority: "High",
    ageHours: 42,
    dueInHours: 6,
    tags: ["uv-alarm", "ballast", "lamp"],
    missing: [],
    order: "HD-441902",
    warranty: "Needs receipt",
    receipt: false,
    previousTickets: ["ISP-24618 faucet leak"],
    attachments: [attachment("ballast-label.jpg", "serial photo", "May 7")],
    issue: "Lamp/ballast connection or failed lamp",
    firstTest: "Confirm lamp pins are seated and ballast label matches model.",
    confirms: "Alarm clears with reseated lamp, or known-good lamp confirms ballast issue.",
    customerMessage: "The UV alarm keeps going and the lamp does not seem to turn on.",
    repReply: "Please send a photo of the ballast label and lamp connection.",
    internalNote: "Receipt missing. Consumables warning applies for UV lamps."
  }),
  buildTicket({
    id: "ISP-28495",
    subject: "WSP50ARB low flow due to sediment screen",
    customer: "Nora Williams",
    email: "nora.williams@example.com",
    phone: "602-555-0161",
    model: "WSP50ARB",
    family: "Sediment",
    source: "Email",
    assignee: "CS3 Sean",
    status: "Pending Parts",
    priority: "Normal",
    ageHours: 54,
    dueInHours: 18,
    tags: ["low-flow", "sediment-screen", "parts-sent"],
    missing: [],
    order: "IS-87229",
    warranty: "Registered",
    receipt: true,
    previousTickets: [],
    attachments: [attachment("sediment-screen.jpg", "damage photo", "May 6")],
    issue: "Sediment screen clogged or damaged",
    firstTest: "Flush screen and compare pressure before/after the spin-down filter.",
    confirms: "Flow returns after flushing, or screen shows visible clog/damage.",
    customerMessage: "The WSP50ARB is causing low flow and the screen looks packed with sediment.",
    repReply: "We sent the replacement screen and flushing instructions.",
    internalNote: "Parts sent. Follow up after delivery.",
    partsSent: true
  }),
  buildTicket({
    id: "ISP-28494",
    subject: "Warranty registration customer missing receipt",
    customer: "Chris Huang",
    email: "chris.huang@example.com",
    phone: "",
    model: "RCC7AK",
    family: "Warranty",
    source: "Web Form",
    assignee: "CS14 Robert",
    status: "Waiting Customer",
    priority: "Low",
    ageHours: 20,
    dueInHours: 44,
    tags: ["warranty", "missing-receipt", "needs-phone"],
    missing: ["Needs Receipt", "Needs Phone"],
    order: "",
    warranty: "Pending receipt",
    receipt: false,
    previousTickets: ["ISP-28014 faucet question"],
    attachments: [],
    issue: "Missing proof of purchase",
    firstTest: "Ask for complete receipt showing date and seller.",
    confirms: "Receipt matches eligible seller and date.",
    customerMessage: "I want to register my warranty but cannot find the receipt right now.",
    repReply: "",
    internalNote: "Customer has previous ticket; avoid asking for model twice."
  }),
  buildTicket({
    id: "ISP-28493",
    subject: "Amazon damaged shipment customer wants replacement",
    customer: "Olivia Carter",
    email: "olivia.carter@example.com",
    phone: "303-555-0177",
    model: "RCC7P-AK",
    family: "Under Sink RO",
    source: "Amazon",
    assignee: "CS5 Michelle",
    status: "Open",
    priority: "High",
    ageHours: 5,
    dueInHours: 10,
    tags: ["amazon", "damaged-shipment", "replacement"],
    missing: ["Needs Photos"],
    order: "113-4419021-1093842",
    warranty: "Not registered",
    receipt: true,
    previousTickets: [],
    attachments: [attachment("damaged-box.jpg", "damage photo", "May 8")],
    issue: "Carrier damage during Amazon shipment",
    firstTest: "Confirm damage photos and whether Amazon return/replacement path is required.",
    confirms: "Photos show shipping damage before install; Amazon order source confirmed.",
    customerMessage: "My Amazon shipment arrived damaged and I want a replacement sent.",
    repReply: "",
    internalNote: "Amazon shipping issues usually go through Amazon unless manager-approved."
  }),
  buildTicket({
    id: "ISP-28492",
    subject: "Water test recommendation for well iron manganese hardness",
    customer: "Benton Farm Supply",
    email: "maintenance@bentonfarm.example.com",
    phone: "731-555-0199",
    model: "TBD",
    family: "Whole House",
    source: "Phone",
    assignee: "CS14 Robert",
    status: "Open",
    priority: "Normal",
    ageHours: 11,
    dueInHours: 26,
    tags: ["water-test", "well-water", "iron", "manganese", "hardness"],
    missing: ["Needs Water Test"],
    order: "",
    warranty: "Pre-sale/support",
    receipt: false,
    previousTickets: [],
    attachments: [attachment("partial-lab-results.pdf", "water test", "May 8")],
    issue: "Need complete water chemistry before product recommendation",
    firstTest: "Collect iron, manganese, hardness, pH, sulfur, TDS, and flow rate.",
    confirms: "Complete well test supports correct product family and media choice.",
    customerMessage:
      "We have well water with iron, manganese, and hardness. What system should we use?",
    repReply: "Please send the complete water test and peak flow requirements before we recommend equipment.",
    internalNote: "Do not recommend a system until full water test is available."
  }),
  buildTicket({
    id: "ISP-28491",
    subject: "Harper Stone softener salt bridge and hard water returned",
    customer: "Harper Stone",
    email: "harper.stone@example.com",
    phone: "512-555-0182",
    model: "WCS45KG",
    family: "Water Softener",
    source: "Phone",
    assignee: "CS1 Nick",
    status: "Resolved",
    priority: "Normal",
    ageHours: 118,
    dueInHours: 0,
    tags: ["salt-bridge", "hard-water", "resolved"],
    missing: [],
    order: "IS-90779",
    warranty: "Registered",
    receipt: true,
    previousTickets: ["ISP-28497 startup brine tank"],
    attachments: [attachment("salt-level.jpg", "install photo", "May 4")],
    issue: "Salt bridge prevented brine draw",
    firstTest: "Break salt bridge and run manual regeneration.",
    confirms: "Soft water returns after bridge is cleared and regen completes.",
    customerMessage: "The water is hard again and the salt level does not seem to move.",
    repReply: "The salt bridge was cleared and the manual regeneration completed normally.",
    internalNote: "Resolved after coaching customer through salt bridge check."
  }),
  buildTicket({
    id: "ISP-28490",
    subject: "Harper Stone resin tank sweating after installation",
    customer: "Harper Stone",
    email: "harper.stone@example.com",
    phone: "512-555-0182",
    model: "WCS45KG",
    family: "Water Softener",
    source: "Email",
    assignee: "CS3 Sean",
    status: "Closed",
    priority: "Low",
    ageHours: 210,
    dueInHours: 0,
    tags: ["condensation", "installation", "closed"],
    missing: [],
    order: "IS-90779",
    warranty: "Registered",
    receipt: true,
    previousTickets: ["ISP-28491 salt bridge"],
    attachments: [attachment("tank-sweating.jpg", "install photo", "May 1")],
    issue: "Condensation on tank exterior",
    firstTest: "Confirm no active leak and compare room humidity.",
    confirms: "No leak found; condensation explained by temperature difference.",
    customerMessage: "The resin tank looks wet on the outside. Is it leaking?",
    repReply: "The photos look consistent with condensation, not a tank leak.",
    internalNote: "Closed after customer confirmed floor remained dry."
  }),
  buildTicket({
    id: "ISP-28489",
    subject: "Olivia Carter RCC7P-AK damaged faucet in box",
    customer: "Olivia Carter",
    email: "olivia.carter@example.com",
    phone: "303-555-0177",
    model: "RCC7P-AK",
    family: "Under Sink RO",
    source: "Amazon",
    assignee: "CS5 Michelle",
    status: "Overdue",
    priority: "High",
    ageHours: 74,
    dueInHours: -14,
    tags: ["amazon", "damaged-part", "replacement"],
    missing: ["Needs Photos"],
    order: "113-4419021-1093842",
    warranty: "Not registered",
    receipt: true,
    previousTickets: ["ISP-28493 damaged shipment"],
    attachments: [attachment("faucet-scratch.jpg", "damage photo", "May 6")],
    issue: "Damaged accessory from Amazon shipment",
    firstTest: "Confirm damage photos and exact faucet finish.",
    confirms: "Accessory damage documented before installation.",
    customerMessage: "The faucet included with my RCC7P-AK is scratched and bent.",
    repReply: "Please send one wider photo of the faucet and the packaging label.",
    internalNote: "Overdue. Amazon source; manager approval needed before direct replacement."
  }),
  buildTicket({
    id: "ISP-28488",
    subject: "Olivia Carter RO faucet air gap noise after install",
    customer: "Olivia Carter",
    email: "olivia.carter@example.com",
    phone: "303-555-0177",
    model: "RCC7P-AK",
    family: "Under Sink RO",
    source: "Amazon",
    assignee: "CS2 Julius",
    status: "Resolved",
    priority: "Normal",
    ageHours: 168,
    dueInHours: 0,
    tags: ["air-gap", "drain-line", "resolved"],
    missing: [],
    order: "113-4419021-1093842",
    warranty: "Not registered",
    receipt: true,
    previousTickets: ["ISP-28489 damaged faucet"],
    attachments: [attachment("drain-saddle.jpg", "install photo", "May 2")],
    issue: "Drain saddle position causing air-gap noise",
    firstTest: "Check drain saddle placement and tubing loop.",
    confirms: "Noise reduced after drain line was corrected.",
    customerMessage: "The faucet makes a gurgling sound whenever the system drains.",
    repReply: "Moving the drain saddle above the trap and smoothing the drain line should reduce the noise.",
    internalNote: "Resolved with installation correction."
  }),
  buildTicket({
    id: "ISP-28487",
    subject: "CS14 Robert test customer RO500 reset loop",
    customer: "CS14 Robert test customer",
    email: "robert.bradley.test@example.com",
    phone: "470-555-0104",
    model: "RO500AK",
    family: "Tankless RO",
    source: "Web Form",
    assignee: "CS14 Robert",
    status: "Open",
    priority: "High",
    ageHours: 6,
    dueInHours: 8,
    tags: ["test-customer", "reset-loop", "tankless"],
    missing: ["Needs Video"],
    order: "IS-90844",
    warranty: "Registered",
    receipt: true,
    previousTickets: [],
    attachments: [attachment("ro500-display-loop.mov", "display video", "May 9")],
    issue: "Tankless reset sequence may be incomplete",
    firstTest: "Confirm exact filter reset sequence and flush time.",
    confirms: "Display exits reset loop after proper sequence.",
    customerMessage: "This is Robert's test customer. RO500 keeps returning to the filter reset screen.",
    repReply: "",
    internalNote: "Use this record to test multiple-ticket customer history by email only."
  }),
  buildTicket({
    id: "ISP-28486",
    subject: "CS14 Robert test customer replacement filter question",
    customer: "CS14 Robert test customer",
    email: "robert.bradley.test@example.com",
    phone: "470-555-0104",
    model: "RO500AK",
    family: "Tankless RO",
    source: "iSpring direct",
    assignee: "CS14 Robert",
    status: "Closed",
    priority: "Low",
    ageHours: 96,
    dueInHours: 0,
    tags: ["test-customer", "filters", "closed"],
    missing: [],
    order: "IS-90844",
    warranty: "Registered",
    receipt: true,
    previousTickets: ["ISP-28487 reset loop"],
    attachments: [attachment("ispring-receipt-90844.pdf", "receipt", "May 5")],
    issue: "Filter set compatibility question",
    firstTest: "Confirm model and filter part numbers.",
    confirms: "Correct filter set identified.",
    customerMessage: "Can you confirm the replacement filter set for my RO500AK?",
    repReply: "For RO500AK, use the matching RO500 filter set listed for that model.",
    internalNote: "Closed after sending filter compatibility guidance."
  }),
  buildTicket({
    id: "ISP-28485",
    subject: "CS14 Robert test customer receipt upload verification",
    customer: "CS14 Robert test customer",
    email: "robert.bradley.test@example.com",
    phone: "470-555-0104",
    model: "RO500AK",
    family: "Warranty",
    source: "Email",
    assignee: "CS5 Michelle",
    status: "Resolved",
    priority: "Low",
    ageHours: 144,
    dueInHours: 0,
    tags: ["test-customer", "receipt", "warranty"],
    missing: [],
    order: "IS-90844",
    warranty: "Registered",
    receipt: true,
    previousTickets: ["ISP-28486 filters"],
    attachments: [attachment("receipt-verification.pdf", "receipt", "May 3")],
    issue: "Receipt verification for warranty registration",
    firstTest: "Confirm seller, order number, and purchase date.",
    confirms: "Receipt is verified and warranty remains registered.",
    customerMessage: "Please verify the receipt I uploaded for this test account.",
    repReply: "The receipt is verified and attached to the account history.",
    internalNote: "Good regression case for receipt and warranty card actions."
  }),
  buildTicket({
    id: "ISP-28484",
    subject: "Parker Lane WGB32B replacement O-ring request",
    customer: "Parker Lane",
    email: "parker.lane@example.com",
    phone: "919-555-0128",
    model: "WGB32B",
    family: "Whole House",
    source: "Email",
    assignee: "CS3 Sean",
    status: "Closed",
    priority: "Normal",
    ageHours: 180,
    dueInHours: 0,
    tags: ["oring", "replacement-parts", "closed"],
    missing: [],
    order: "IS-90121",
    warranty: "Needs review",
    receipt: false,
    previousTickets: ["ISP-28499 pressure drop"],
    attachments: [attachment("housing-oring.jpg", "damage photo", "May 2")],
    issue: "Housing O-ring flattened after service",
    firstTest: "Confirm housing size and O-ring condition.",
    confirms: "Correct replacement O-ring sent.",
    customerMessage: "The O-ring on my WGB32B housing looks flattened after I opened it.",
    repReply: "We identified the matching O-ring and sent replacement instructions.",
    internalNote: "Receipt not on file; low-cost parts exception approved."
  }),
  buildTicket({
    id: "ISP-28483",
    subject: "Parker Lane pressure gauge reads low before filters",
    customer: "Parker Lane",
    email: "parker.lane@example.com",
    phone: "919-555-0128",
    model: "WGB32B",
    family: "Whole House",
    source: "Phone",
    assignee: "CS2 Julius",
    status: "Overdue",
    priority: "Normal",
    ageHours: 66,
    dueInHours: -6,
    tags: ["pressure-gauge", "bypass-test", "overdue"],
    missing: ["Needs Pressure Reading"],
    order: "IS-90121",
    warranty: "Needs review",
    receipt: false,
    previousTickets: ["ISP-28484 O-ring"],
    attachments: [],
    issue: "Supply pressure may be low before filtration",
    firstTest: "Compare pressure before system, after system, and in bypass.",
    confirms: "Low inlet reading indicates plumbing/supply issue before filters.",
    customerMessage: "The pressure gauge before the filters also reads low now.",
    repReply: "Please capture inlet and outlet pressure readings with the system in bypass.",
    internalNote: "Overdue follow-up. Do not blame filter media until readings are provided."
  }),
  buildTicket({
    id: "ISP-28482",
    subject: "Dana Mitchell RO500AK leak at filter bay",
    customer: "Dana Mitchell",
    email: "dana.mitchell@example.com",
    phone: "404-555-0198",
    model: "RO500AK",
    family: "Tankless RO",
    source: "Amazon",
    assignee: "CS14 Robert",
    status: "Open",
    priority: "Urgent",
    ageHours: 4,
    dueInHours: 4,
    tags: ["leak", "filter-bay", "urgent"],
    missing: ["Needs Photos"],
    order: "112-8901132-4589011",
    warranty: "Registered",
    receipt: true,
    previousTickets: ["ISP-28500 beeping after filter replacement"],
    attachments: [attachment("filter-bay-leak.jpg", "damage photo", "May 9")],
    issue: "Filter cartridge may not be fully seated",
    firstTest: "Power off, reseat filter cartridge, and check O-ring area.",
    confirms: "Leak stops after reseating or damaged cartridge is identified.",
    customerMessage: "Now the RO500AK is leaking from the filter bay after the beeping issue.",
    repReply: "",
    internalNote: "Urgent water leak. Ask customer to shut off feed water before troubleshooting."
  }),
  buildTicket({
    id: "ISP-28481",
    subject: "Dana Mitchell Amazon invoice missing seller name",
    customer: "Dana Mitchell",
    email: "dana.mitchell@example.com",
    phone: "404-555-0198",
    model: "RO500AK",
    family: "Warranty",
    source: "Amazon",
    assignee: "CS1 Nick",
    status: "Resolved",
    priority: "Low",
    ageHours: 150,
    dueInHours: 0,
    tags: ["receipt", "amazon", "resolved"],
    missing: [],
    order: "112-8901132-4589011",
    warranty: "Registered",
    receipt: true,
    previousTickets: ["ISP-28482 leak"],
    attachments: [attachment("amazon-invoice.pdf", "receipt", "May 3")],
    issue: "Amazon invoice needed for warranty record",
    firstTest: "Request invoice view with seller and order date visible.",
    confirms: "Invoice shows eligible seller and purchase date.",
    customerMessage: "The invoice I downloaded does not show the seller name clearly.",
    repReply: "The updated invoice includes the required order and seller details.",
    internalNote: "Receipt verified and warranty record linked."
  }),
  buildTicket({
    id: "ISP-28480",
    subject: "Chris Huang RCC7AK faucet drip after shutdown",
    customer: "Chris Huang",
    email: "chris.huang@example.com",
    phone: "678-555-0164",
    model: "RCC7AK",
    family: "Under Sink RO",
    source: "Web Form",
    assignee: "CS3 Sean",
    status: "Open",
    priority: "Normal",
    ageHours: 18,
    dueInHours: 18,
    tags: ["faucet-drip", "air-gap", "needs-video"],
    missing: ["Needs Video"],
    order: "LOW-880174",
    warranty: "Pending receipt",
    receipt: false,
    previousTickets: ["ISP-28494 missing receipt"],
    attachments: [],
    issue: "Residual line pressure or faucet seal issue",
    firstTest: "Confirm whether drip stops after tank is empty and send faucet video.",
    confirms: "Drip stops after pressure equalizes or faucet cartridge issue is identified.",
    customerMessage: "My RCC7AK faucet keeps dripping for several minutes after I close it.",
    repReply: "Please send a short video showing the drip and tell us whether the tank is full.",
    internalNote: "Lowe's source detected from order. Receipt still missing."
  }),
  buildTicket({
    id: "ISP-28479",
    subject: "Chris Huang warranty registration follow-up",
    customer: "Chris Huang",
    email: "chris.huang@example.com",
    phone: "678-555-0164",
    model: "RCC7AK",
    family: "Warranty",
    source: "Lowe's",
    assignee: "CS5 Michelle",
    status: "Closed",
    priority: "Low",
    ageHours: 240,
    dueInHours: 0,
    tags: ["warranty", "lowes", "closed"],
    missing: [],
    order: "LOW-880174",
    warranty: "Not registered",
    receipt: false,
    previousTickets: ["ISP-28480 faucet drip"],
    attachments: [],
    issue: "Customer could not locate proof of purchase",
    firstTest: "Ask for Lowe's receipt or order lookup screenshot.",
    confirms: "Customer will reopen when receipt is available.",
    customerMessage: "I still cannot find the receipt for registration.",
    repReply: "No problem. Send the receipt whenever you locate it and we can continue registration.",
    internalNote: "Closed with no receipt on file."
  }),
  buildTicket({
    id: "ISP-28478",
    subject: "Harper Stone bypass valve orientation question",
    customer: "Harper Stone",
    email: "harper.stone@example.com",
    phone: "512-555-0182",
    model: "WCS45KG",
    family: "Water Softener",
    source: "Email",
    assignee: "CS2 Julius",
    status: "Overdue",
    priority: "High",
    ageHours: 80,
    dueInHours: -20,
    tags: ["bypass-valve", "startup", "overdue"],
    missing: ["Needs Photos"],
    order: "IS-90779",
    warranty: "Registered",
    receipt: true,
    previousTickets: ["ISP-28490 condensation", "ISP-28491 salt bridge"],
    attachments: [attachment("bypass-handle.jpg", "install photo", "May 5")],
    issue: "Bypass valve may be partially closed",
    firstTest: "Confirm bypass handle position and run manual regeneration.",
    confirms: "Service position restores flow through softener.",
    customerMessage: "Can you confirm if the bypass valve is facing the correct direction?",
    repReply: "Please send one wider photo that shows both inlet and outlet sides.",
    internalNote: "Overdue; linked to same email history as startup case."
  })
];
seedTickets.push(...generateExtendedLongThreadMockTickets());
seedTickets.push(...generateLongThreadMockTickets());
seedTickets.push(...generateReceiptTestTickets());
seedTickets.push(...generateFreshDemoTickets());
workspaceConfig.tickets = alignRepeatCustomerAssignments(seedTickets);

const seedWorkspaceSettings = workspaceConfig.defaultSettings;
let workspaceSettings = normalizeWorkspaceSettings(loadWorkspaceSettings());
applyWorkspaceSettings();
let tickets = normalizeTickets(loadTickets());
rebaselineOpenTicketSla(tickets);
if (ensureReceiptTestTickets(tickets)) localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
let backendSyncReady = false;
let backendSyncTimer = 0;
let backendSyncAvailable = false;
const backendSyncQueue = new Map();
let sessionUser = null;
let backendAssignmentUsers = [];
let lastUsedTicketNumber = loadLastUsedTicketNumber(tickets);
let profile = loadProfile();
let customerAccounts = loadCustomerAccounts(tickets);
let customerAccountReceiptDataChanged = ensureReceiptTestCustomerAccounts(tickets);
customerAccountReceiptDataChanged = ensureMockReceiptRecordsForTickets(tickets) || customerAccountReceiptDataChanged;
if (customerAccountReceiptDataChanged) persistCustomerAccounts();
if (tickets.some((ticket) => applyCustomerAccountToTicket(ticket))) persistTickets();
let users = loadUsers();
let knowledgeDocs = loadKnowledgeDocs();
let productLinks = loadProductLinks();
let notifications = loadNotifications(tickets);
let activeView = "open";
let queuePage = 1;
let selectedTicketId = "";
let selectedTicketIds = new Set();
let closingTicketIds = new Set();
let pendingStatusChanges = new Map();
let replyMode = "reply";
let activeProfileTab = "account";
let activeNotificationFilter = "all";
let notificationsOpen = false;
let closedRangeMenuOpen = false;
let customSelectObserver = null;
let customSelectRefreshFrame = 0;
let editableFieldObserver = null;
let activeCustomSelect = null;
let sidebarLabelsHidden = false;
let sidebarLayoutCollapsed = false;
let sidebarMotioning = false;
let sidebarMotionDirection = "";
let sidebarMotionTimer = 0;
let sidebarLabelTimer = 0;
let sidebarLayoutTimer = 0;
let sidebarTooltipPortal = null;
let activeSidebarTooltipButton = null;
let sidebarTooltipHideTimer = 0;
let shouldScrollThreadToBottom = false;
let shouldScrollToLatestOnOpen = false;
let detailFloatScrollHandler = null;
let detailFloatScrollRoot = null;
let queueDebugState = {
  renderTableCalled: false,
  renderError: "",
  recoveredTickets: false,
  localStorageTicketKey: "",
  localStorageTicketsFound: false
};
let cachedVisibleTickets = [];
let filters = {
  global: "",
  queue: "",
  status: "All statuses",
  closedDateRange: "This Week",
  sort: "newest",
  macroSearch: "",
  macroCategory: "All",
  knowledgeSearch: "",
  knowledgeCategory: "All",
  knowledgeStatus: "All",
  productLinkSearch: "",
  productLinkPlatform: "All",
  table: {},
  tableSort: { key: "updated", direction: "desc" }
};
let dashboardFilters = {
  timeframe: "Last 7 days",
  department: "All teams",
  rep: "All reps",
  productFamily: "All product families",
  source: "All channels",
  status: "All statuses"
};
let dashboardView = "manager";
let uiState = {
  activeScreen: "queue",
  queueMode: "table",
  activeQuickControl: "open",
  sidebarCollapsed: false,
  metricsCollapsed: false,
  contextCollapsed: false,
  filtersCollapsed: true
};
let lastRenderedScreen = uiState.activeScreen;
let isCreateTicketModalOpen = false;
let uploadApprovalPrompt = {
  docIds: [],
  fileNames: []
};
let pendingReceiptUpload = {
  ticketId: "",
  file: null
};

const el = {
  appShell: document.querySelector(".app-shell"),
  workspace: document.querySelector(".workspace"),
  ticketWorkspace: document.querySelector(".ticket-workspace"),
  viewNav: document.querySelector("#viewNav"),
  queueSearch: document.querySelector("#queueSearch"),
  brandTagline: document.querySelector("#brandTagline"),
  sidebarWorkspaceLabel: document.querySelector("#sidebarWorkspaceLabel"),
  topbarWorkspaceLabel: document.querySelector("#topbarWorkspaceLabel"),
  dashboardNavButton: document.querySelector("#dashboardNavButton"),
  ticketsNavButton: document.querySelector("#ticketsNavButton"),
  ticketNavCount: document.querySelector("#ticketNavCount"),
  statusFilter: document.querySelector("#statusFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  densityToggle: document.querySelector("#densityToggle"),
  cardViewButton: document.querySelector("#cardViewButton"),
  tableViewButton: document.querySelector("#tableViewButton"),
  quickOpenButton: document.querySelector("#quickOpenButton"),
  quickClosedButton: document.querySelector("#quickClosedButton"),
  quickSearchButton: document.querySelector("#quickSearchButton"),
  quickNewTicketButton: document.querySelector("#quickNewTicketButton"),
  quickUseFiltersButton: document.querySelector("#quickUseFiltersButton"),
  quickSortButton: document.querySelector("#quickSortButton"),
  quickResetFiltersButton: document.querySelector("#quickResetFiltersButton"),
  toggleSidebarButton: document.querySelector("#toggleSidebarButton"),
  toggleMetricsButton: document.querySelector("#toggleMetricsButton"),
  toggleContextButton: document.querySelector("#toggleContextButton"),
  adminNavButton: document.querySelector("#adminNavButton"),
  settingsNavButton: document.querySelector("#settingsNavButton"),
  knowledgeVaultNavButton: document.querySelector("#knowledgeVaultNavButton"),
  macroNavButton: document.querySelector("#macroNavButton"),
  notificationBellButton: document.querySelector("#notificationBellButton"),
  notificationUnreadCount: document.querySelector("#notificationUnreadCount"),
  notificationPanel: document.querySelector("#notificationPanel"),
  queueControls: document.querySelector(".queue-controls"),
  ticketActionToolbar: document.querySelector("#ticketActionToolbar"),
  bulkActions: document.querySelector("#bulkActions"),
  assignSelect: document.querySelector("#assignSelect"),
  mergeTicketsButton: document.querySelector("#mergeTicketsButton"),
  queueCopyLinkButton: document.querySelector("#queueCopyLinkButton"),
  refreshQueueButton: document.querySelector("#refreshQueueButton"),
  queueViewTabs: document.querySelector("#queueViewTabs"),
  queuePreview: document.querySelector("#queuePreview"),
  queueTitle: document.querySelector("#queueTitle"),
  metricStrip: document.querySelector("#metricStrip"),
  ticketList: document.querySelector("#ticketList"),
  conversationPanel: document.querySelector("#conversationPanel"),
  contextPanel: document.querySelector("#contextPanel"),
  adminPanel: document.querySelector("#adminPanel"),
  knowledgePanel: document.querySelector("#knowledgePanel"),
  dashboardPanel: document.querySelector("#dashboardPanel"),
  newTicketButton: document.querySelector("#newTicketButton"),
  copyTicketLinkButton: document.querySelector("#copyTicketLinkButton"),
  profileButton: document.querySelector("#profileButton"),
  profileButtonName: document.querySelector("#profileButtonName"),
  profileButtonRole: document.querySelector("#profileButtonRole"),
  profileInitials: document.querySelector("#profileInitials"),
  resetDemoDataButton: document.querySelector("#resetDemoDataButton"),
  ticketModal: document.querySelector("#ticketModal"),
  customerHistoryModal: document.querySelector("#customerHistoryModal"),
  workflowConfirmModal: document.querySelector("#workflowConfirmModal"),
  profileModal: document.querySelector("#profileModal"),
  knowledgeFileModal: document.querySelector("#knowledgeFileModal"),
  toast: document.querySelector("#toast"),
  ticketForm: null
};

init();

/* Animate a <dialog> closed (adds .closing CSS class, waits for animation, then runs afterFn).
   All close functions that use this must call e.preventDefault() on the cancel event. */
function animateDialogClose(dialog, afterFn) {
  if (!dialog || !dialog.open || dialog.classList.contains("closing")) {
    if (afterFn) afterFn();
    return;
  }
  dialog.classList.add("closing");
  setTimeout(() => {
    dialog.classList.remove("closing");
    if (afterFn) afterFn();
  }, cssDurationMs("--motion-fast", 140) + 20);
}

function init() {
  closeTicketModal();
  applyWorkspaceBranding();
  renderToolbarSelectOptions();
  setupCustomSelects();
  setupEditableFieldHardeners();
  applyProfilePreferences({ initialize: true });

  el.dashboardNavButton.addEventListener("click", showDashboardScreen);
  el.ticketsNavButton?.addEventListener("click", showQueueScreen);
  el.viewNav.addEventListener("click", handleViewClick);
  el.queueViewTabs.addEventListener("click", handleQueueTabClick);
  el.queueSearch.addEventListener("focus", () => setActiveQuickControl("search"));
  el.queueSearch.addEventListener("input", (event) => {
    setActiveQuickControl("search");
    updateFilter("queue", event.target.value);
  });
  el.statusFilter.addEventListener("change", handleToolbarStatusChange);
  el.assignSelect?.addEventListener("change", handleToolbarAssignChange);
  el.sortSelect.addEventListener("focus", () => setActiveQuickControl("sort"));
  el.sortSelect.addEventListener("change", (event) => {
    setActiveQuickControl("sort");
    updateFilter("sort", event.target.value);
  });
  el.densityToggle?.addEventListener("change", (event) => document.body.classList.toggle("compact", event.target.checked));
  el.cardViewButton?.addEventListener("click", () => setQueueMode("card"));
  el.tableViewButton?.addEventListener("click", () => setQueueMode("table"));
  el.quickOpenButton?.addEventListener("click", () => setQuickView("open"));
  el.quickClosedButton?.addEventListener("click", () => setQuickView("closed"));
  el.quickSearchButton?.addEventListener("click", () => {
    setActiveQuickControl("search");
    el.queueSearch.focus();
  });
  el.quickNewTicketButton?.addEventListener("click", () => {
    setActiveQuickControl("new");
    openTicketModal();
  });
  el.quickUseFiltersButton?.addEventListener("click", () => {
    setActiveQuickControl("filters");
    toggleUi("filtersCollapsed", false);
  });
  el.quickSortButton?.addEventListener("click", () => {
    setActiveQuickControl("sort");
    el.sortSelect.focus();
  });
  el.quickResetFiltersButton.addEventListener("click", () => clearFilters());
  el.mergeTicketsButton?.addEventListener("click", openMergeTicketsConfirmModal);
  el.queueCopyLinkButton?.addEventListener("click", copyQueueTicketLink);
  el.refreshQueueButton?.addEventListener("click", refreshQueueFromToolbar);
  el.toggleSidebarButton.addEventListener("click", () => toggleSidebar());
  setupSidebarTooltips();
  el.adminNavButton?.addEventListener("click", showAdminScreen);
  el.settingsNavButton.addEventListener("click", () => openProfileModal("account"));
  el.knowledgeVaultNavButton?.addEventListener("click", showKnowledgeVaultScreen);
  el.macroNavButton?.addEventListener("click", showMacroLibrary);
  el.notificationBellButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleNotificationsPanel();
  });
  el.notificationPanel?.addEventListener("click", handleNotificationPanelClick);
  el.toggleMetricsButton?.addEventListener("click", () => toggleUi("metricsCollapsed"));
  el.toggleContextButton?.addEventListener("click", () => toggleUi("contextCollapsed"));
  el.newTicketButton.addEventListener("click", openTicketModal);
  el.copyTicketLinkButton?.addEventListener("click", copyTicketLink);
  el.profileButton.addEventListener("click", openProfileModal);
  el.resetDemoDataButton?.addEventListener("click", resetDemoData);
  el.ticketModal.addEventListener("cancel", (e) => { e.preventDefault(); closeTicketModal(); });
  el.ticketModal.addEventListener("close", closeTicketModal);
  el.ticketModal.addEventListener("click", (event) => {
    if (event.target === el.ticketModal) closeTicketModal();
  });
  el.customerHistoryModal.addEventListener("cancel", (e) => { e.preventDefault(); closeCustomerHistory(); });
  el.customerHistoryModal.addEventListener("click", (event) => {
    if (event.target === el.customerHistoryModal) closeCustomerHistory();
  });
  el.workflowConfirmModal.addEventListener("cancel", (e) => { e.preventDefault(); closeWorkflowConfirmModal(); });
  el.workflowConfirmModal.addEventListener("click", (event) => {
    if (event.target === el.workflowConfirmModal) closeWorkflowConfirmModal();
  });
  el.profileModal.addEventListener("cancel", (e) => { e.preventDefault(); closeProfileModal(); });
  el.profileModal.addEventListener("click", (event) => {
    if (event.target === el.profileModal) closeProfileModal();
  });
  el.knowledgeFileModal.addEventListener("cancel", (e) => { e.preventDefault(); closeKnowledgeFileModal(); });
  el.knowledgeFileModal.addEventListener("click", (event) => {
    if (event.target === el.knowledgeFileModal) closeKnowledgeFileModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && notificationsOpen) closeNotificationsPanel();
    if (event.key === "Escape" && closedRangeMenuOpen) {
      closedRangeMenuOpen = false;
      render();
    }
    if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
      event.preventDefault();
      setActiveQuickControl("search");
      el.queueSearch?.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (notificationsOpen && !event.target.closest(".notification-center")) {
      closeNotificationsPanel();
    }
    if (closedRangeMenuOpen && !event.target.closest(".closed-tab, #closedRangeMenu")) {
      closedRangeMenuOpen = false;
      render();
    }
  });

  applyUiState();
  updateProfileButton();
  render();
  hydrateBackendState();
}

function applyWorkspaceBranding() {
  if (el.brandTagline) el.brandTagline.textContent = workspaceConfig.tagline;
  if (el.sidebarWorkspaceLabel) el.sidebarWorkspaceLabel.textContent = workspaceConfig.workspaceShortName;
  if (el.topbarWorkspaceLabel) el.topbarWorkspaceLabel.textContent = workspaceConfig.workspaceLabel;
}

function setupCustomSelects() {
  if (customSelectObserver) return;

  document.addEventListener("click", handleCustomSelectDocumentClick, true);
  document.addEventListener("keydown", handleCustomSelectKeydown, true);
  window.addEventListener("resize", positionActiveCustomSelect);
  document.addEventListener("scroll", positionActiveCustomSelect, true);

  customSelectObserver = new MutationObserver((mutations) => {
    if (!mutations.some(customSelectMutationNeedsRefresh)) return;
    scheduleCustomSelectRefresh();
  });
  customSelectObserver.observe(document.body, { childList: true, subtree: true });
  refreshCustomSelects();
}

function setupEditableFieldHardeners() {
  hardenEditableFields();
  if (editableFieldObserver) return;

  editableFieldObserver = new MutationObserver((mutations) => {
    const shouldHarden = mutations.some((mutation) => {
      const nodes = [...mutation.addedNodes].filter((node) => node.nodeType === Node.ELEMENT_NODE);
      return nodes.some((node) => (
        node.matches?.(`${textEntrySelector()}, ${grammarlyArtifactSelector()}`)
        || node.querySelector?.(`${textEntrySelector()}, ${grammarlyArtifactSelector()}`)
      ));
    });
    if (shouldHarden) hardenEditableFields();
  });
  editableFieldObserver.observe(document.body, { childList: true, subtree: true });
}

function textEntrySelector() {
  return [
    "input:not([type])",
    "input:is([type='date'], [type='datetime-local'], [type='email'], [type='month'], [type='number'], [type='password'], [type='search'], [type='tel'], [type='text'], [type='time'], [type='url'], [type='week'])",
    "textarea",
    "[contenteditable='true']"
  ].join(", ");
}

function grammarlyArtifactSelector() {
  return [
    "grammarly-desktop-integration",
    "grammarly-extension",
    "[data-grammarly-part]",
    "[data-grammarly-shadow-root]",
    "[class*='grammarly']",
    "[class*='Grammarly']",
    "[id*='grammarly']",
    "[id*='Grammarly']"
  ].join(", ");
}

function hardenEditableFields(root = document) {
  const scope = root.nodeType === Node.ELEMENT_NODE ? root : document;
  scope.querySelectorAll(textEntrySelector()).forEach((field) => {
    field.setAttribute("spellcheck", "false");
    field.setAttribute("data-gramm", "false");
    field.setAttribute("data-gramm_editor", "false");
    field.setAttribute("data-enable-grammarly", "false");
  });
  scope.querySelectorAll(grammarlyArtifactSelector()).forEach((node) => node.remove());
}

function customSelectMutationNeedsRefresh(mutation) {
  if (mutation.target.closest?.(".tessario-select-menu")) return false;
  if (mutation.target.matches?.("select, .tessario-select")) return true;
  const nodes = [...mutation.addedNodes, ...mutation.removedNodes].filter((node) => node.nodeType === Node.ELEMENT_NODE);
  if (!nodes.length) return false;
  return nodes.some((node) => {
    if (node.matches?.(".tessario-select-menu") || node.closest?.(".tessario-select-menu")) return false;
    return node.matches?.("select, option, .tessario-select") || node.querySelector?.("select, option, .tessario-select");
  });
}

function scheduleCustomSelectRefresh(root = document) {
  if (customSelectRefreshFrame) return;
  customSelectRefreshFrame = window.requestAnimationFrame(() => {
    customSelectRefreshFrame = 0;
    refreshCustomSelects(root);
  });
}

function refreshCustomSelects(root = document) {
  root.querySelectorAll("select").forEach(enhanceCustomSelect);
  root.querySelectorAll(".tessario-select select").forEach(syncCustomSelect);
  positionActiveCustomSelect();
}

function enhanceCustomSelect(select) {
  if (!select || select.dataset.tessarioSelectReady === "true") return;

  const wrapper = document.createElement("span");
  wrapper.className = "tessario-select";
  if (select.id) wrapper.dataset.selectId = select.id;
  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(select);

  const button = document.createElement("button");
  button.className = "tessario-select-trigger";
  button.type = "button";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = `
    <span class="tessario-select-value"></span>
    <span class="tessario-select-chevron" aria-hidden="true"></span>
  `;
  wrapper.appendChild(button);

  select.dataset.tessarioSelectReady = "true";
  select.classList.add("tessario-native-select");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleCustomSelect(select);
  });

  select.addEventListener("change", () => syncCustomSelect(select));
  syncCustomSelect(select);
}

function syncCustomSelect(select) {
  const wrapper = select?.closest(".tessario-select");
  if (!wrapper) return;

  const button = wrapper.querySelector(".tessario-select-trigger");
  const value = wrapper.querySelector(".tessario-select-value");
  const selectedOption = select.options[select.selectedIndex] || [...select.options].find((option) => !option.disabled) || select.options[0];
  const label = selectedOption?.textContent?.trim() || select.getAttribute("aria-label") || "Select";

  value.textContent = label;
  button.disabled = select.disabled;
  button.setAttribute("aria-label", select.getAttribute("aria-label") || label);
  wrapper.classList.toggle("is-disabled", select.disabled);
  wrapper.dataset.value = select.value || "";

  if (activeCustomSelect?.select === select) {
    syncActiveCustomSelectMenuState();
    positionActiveCustomSelect();
  }
}

function toggleCustomSelect(select) {
  if (activeCustomSelect?.select === select) {
    closeCustomSelect();
    return;
  }
  openCustomSelect(select);
}

function openCustomSelect(select) {
  if (!select || select.disabled) return;
  closeCustomSelect(true);

  const wrapper = select.closest(".tessario-select");
  const button = wrapper.querySelector(".tessario-select-trigger");
  const menu = document.createElement("div");
  const id = `tessario-select-${Math.random().toString(36).slice(2)}`;

  menu.className = "tessario-select-menu";
  menu.id = id;
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", select.getAttribute("aria-label") || "Select");
  mountCustomSelectMenu(select, menu);

  activeCustomSelect = {
    select,
    wrapper,
    button,
    menu,
    activeIndex: Math.max(0, select.selectedIndex)
  };

  button.setAttribute("aria-expanded", "true");
  button.setAttribute("aria-controls", id);
  wrapper.classList.add("is-open");
  renderCustomSelectMenu(activeCustomSelect);
  positionActiveCustomSelect();
  window.requestAnimationFrame(() => menu.classList.add("open"));
}

function closeCustomSelect(immediate = false) {
  if (!activeCustomSelect) return;

  const { wrapper, button, menu } = activeCustomSelect;
  wrapper.classList.remove("is-open");
  button.setAttribute("aria-expanded", "false");
  button.removeAttribute("aria-controls");
  activeCustomSelect = null;

  if (!menu) return;
  if (immediate) {
    hideCustomSelectPopover(menu);
    menu.remove();
    return;
  }
  menu.classList.remove("open");
  menu.classList.add("closing");
  window.setTimeout(() => {
    hideCustomSelectPopover(menu);
    menu.remove();
  }, cssDurationMs("--motion-fast", 140) + 20);
}

function mountCustomSelectMenu(select, menu) {
  document.body.appendChild(menu);
  if (typeof menu.showPopover !== "function") {
    const dialog = select.closest("dialog[open]");
    if (dialog) dialog.appendChild(menu);
    return;
  }

  menu.popover = "manual";
  try {
    menu.showPopover();
  } catch (error) {
    menu.removeAttribute("popover");
    const dialog = select.closest("dialog[open]");
    (dialog || document.body).appendChild(menu);
  }
}

function hideCustomSelectPopover(menu) {
  if (menu?.matches?.(":popover-open") && typeof menu.hidePopover === "function") {
    menu.hidePopover();
  }
}

function renderCustomSelectMenu(state) {
  if (!state?.menu) return;
  const options = [...state.select.options];
  state.activeIndex = clampCustomSelectIndex(state.activeIndex, options);

  state.menu.innerHTML = "";
  options.forEach((option, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "tessario-select-option";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(option.selected));
    item.dataset.optionIndex = String(index);
    item.dataset.optionKey = option.value || option.textContent || String(index);
    item.textContent = option.textContent;
    item.disabled = option.disabled;
    item.classList.toggle("selected", option.selected);
    item.classList.toggle("active", index === state.activeIndex);
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectCustomOption(index);
    });
    item.addEventListener("mouseenter", () => {
      if (option.disabled) return;
      activeCustomSelect.activeIndex = index;
      syncActiveCustomSelectMenuState();
    });
    state.menu.appendChild(item);
  });
}

function syncActiveCustomSelectMenuState() {
  if (!activeCustomSelect?.menu) return;
  activeCustomSelect.menu.querySelectorAll(".tessario-select-option").forEach((item) => {
    const index = Number(item.dataset.optionIndex);
    const option = activeCustomSelect.select.options[index];
    item.classList.toggle("selected", Boolean(option?.selected));
    item.classList.toggle("active", index === activeCustomSelect.activeIndex);
    item.setAttribute("aria-selected", String(Boolean(option?.selected)));
  });
}

function positionActiveCustomSelect() {
  if (!activeCustomSelect?.menu) return;
  if (!document.body.contains(activeCustomSelect.button)) {
    closeCustomSelect(true);
    return;
  }

  const { button, menu } = activeCustomSelect;
  const rect = button.getBoundingClientRect();
  const gutter = 8;
  const availableBelow = window.innerHeight - rect.bottom - gutter;
  const availableAbove = rect.top - gutter;
  const placement = availableBelow < 190 && availableAbove > availableBelow ? "top" : "bottom";
  const maxHeight = Math.max(148, Math.min(280, placement === "top" ? availableAbove - gutter : availableBelow - gutter));
  const width = Math.max(rect.width, 150);
  const left = Math.min(Math.max(gutter, rect.left), window.innerWidth - width - gutter);
  const top = placement === "top" ? Math.max(gutter, rect.top - maxHeight - 6) : Math.min(window.innerHeight - gutter, rect.bottom + 6);

  menu.dataset.placement = placement;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.minWidth = `${width}px`;
  menu.style.maxHeight = `${maxHeight}px`;
}

function handleCustomSelectDocumentClick(event) {
  if (!activeCustomSelect) return;
  if (activeCustomSelect.wrapper.contains(event.target) || activeCustomSelect.menu.contains(event.target)) return;
  closeCustomSelect();
}

function handleCustomSelectKeydown(event) {
  const trigger = event.target.closest?.(".tessario-select-trigger");
  if (!activeCustomSelect && trigger) {
    const select = trigger.closest(".tessario-select")?.querySelector("select");
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openCustomSelect(select);
    }
    return;
  }

  if (!activeCustomSelect) return;
  if (event.key === "Escape") {
    event.preventDefault();
    const button = activeCustomSelect.button;
    closeCustomSelect();
    button?.focus();
    return;
  }
  if (event.key === "Tab") {
    closeCustomSelect(true);
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    moveCustomSelectActive(event.key === "ArrowDown" ? 1 : -1);
    return;
  }
  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    activeCustomSelect.activeIndex = event.key === "Home" ? firstEnabledOptionIndex(activeCustomSelect.select.options) : lastEnabledOptionIndex(activeCustomSelect.select.options);
    syncActiveCustomSelectMenuState();
    scrollActiveCustomOptionIntoView();
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    selectCustomOption(activeCustomSelect.activeIndex);
  }
}

function moveCustomSelectActive(delta) {
  const options = [...activeCustomSelect.select.options];
  let index = activeCustomSelect.activeIndex;
  for (let step = 0; step < options.length; step += 1) {
    index = (index + delta + options.length) % options.length;
    if (!options[index].disabled) break;
  }
  activeCustomSelect.activeIndex = index;
  syncActiveCustomSelectMenuState();
  scrollActiveCustomOptionIntoView();
}

function scrollActiveCustomOptionIntoView() {
  activeCustomSelect?.menu
    ?.querySelector(`.tessario-select-option[data-option-index="${activeCustomSelect.activeIndex}"]`)
    ?.scrollIntoView({ block: "nearest" });
}

function selectCustomOption(index) {
  if (!activeCustomSelect) return;
  const { select, button } = activeCustomSelect;
  const option = select.options[index];
  if (!option || option.disabled) return;

  select.selectedIndex = index;
  syncCustomSelect(select);
  closeCustomSelect(true);
  select.dispatchEvent(new Event("change", { bubbles: true }));
  button.focus();
}

function clampCustomSelectIndex(index, options) {
  if (!options.length) return 0;
  if (!options[index]?.disabled) return index;
  return firstEnabledOptionIndex(options);
}

function firstEnabledOptionIndex(options) {
  return Math.max(0, [...options].findIndex((option) => !option.disabled));
}

function lastEnabledOptionIndex(options) {
  const reversedIndex = [...options].reverse().findIndex((option) => !option.disabled);
  return reversedIndex < 0 ? 0 : options.length - 1 - reversedIndex;
}

function buildTicket(config) {
  const createdAt = hoursAgo(config.ageHours);
  const dueAt = hoursFromNow(config.dueInHours);
  const lastCustomerAt = hoursAgo(Math.max(1, config.ageHours - 2));
  const lastRepAt = config.repReply ? hoursAgo(Math.max(0.5, config.ageHours - 4)) : "";
  const detectedPurchaseSource = detectPurchaseSourceFromTicketConfig(config);

  return {
    id: config.id,
    subject: config.subject,
    customer: {
      name: config.customer,
      email: config.email,
      phone: config.phone,
      address: config.address || "Not provided",
      previousTickets: config.previousTickets || [],
      notes: config.previousTickets?.length ? "Customer has previous support history. Review before asking repeat questions." : "No prior support notes."
    },
    model: config.model,
    family: config.family,
    source: config.source,
    purchaseSource: config.purchaseSource || (detectedPurchaseSource !== "Unknown" ? "Not verified" : "Unknown"),
    purchaseSourceMode: config.purchaseSourceMode || (config.purchaseSource ? "manual" : detectedPurchaseSource !== "Unknown" ? "ai-detected" : ""),
    detectedPurchaseSource: config.detectedPurchaseSource || (!config.purchaseSource && detectedPurchaseSource !== "Unknown" ? detectedPurchaseSource : ""),
    assignee: config.assignee,
    status: config.status,
    priority: config.priority,
    createdAt,
    dueAt,
    lastCustomerAt,
    lastRepAt,
    tags: config.tags,
    missing: config.missing,
    order: config.order,
    warranty: config.warranty,
    receipt: config.receipt,
    attachments: config.attachments,
    diagnosis: {
      issue: config.issue,
      firstTest: config.firstTest,
      confirms: config.confirms
    },
    conversation: buildConversation(config, createdAt, lastCustomerAt, lastRepAt),
    checklist: checklistFor(config),
    guardrails: guardrailsFor(config),
    similar: similarFor(config),
    partsSent: Boolean(config.partsSent),
    escalated: config.status === "Escalated",
    aiAssignment: config.aiAssignment || null,
    draft: ""
  };

}

function buildConversation(config, createdAt, lastCustomerAt, lastRepAt) {
  const messages = [
    {
      type: "customer",
      author: config.customer,
      timestamp: createdAt,
      body: config.customerMessage,
      attachments: config.attachments || []
    }
  ];

  messages.push({
    type: "timeline",
    author: "System",
    timestamp: hoursAgo(Math.max(0.5, config.ageHours - 1)),
    body: `Assigned to ${config.assignee}.`
  });

  const detectedPurchaseSource = detectPurchaseSourceFromTicketConfig(config);
  if (detectedPurchaseSource !== "Unknown") {
    messages.push({
      type: "timeline",
      author: "System",
      timestamp: hoursAgo(Math.max(0.45, config.ageHours - 0.75)),
      body: `System detected possible purchase source from attachment: ${detectedPurchaseSource}. Needs rep review.`
    });
  }

  if (config.repReply) {
    messages.push({
      type: "rep",
      author: config.assignee,
      timestamp: lastRepAt,
      body: config.repReply
    });
  }

  messages.push({
    type: "note",
    author: config.assignee,
    timestamp: hoursAgo(Math.max(0.25, config.ageHours - 3)),
    body: config.internalNote
  });

  if (config.partsSent) {
    messages.push({
      type: "timeline",
      author: "System",
      timestamp: hoursAgo(6),
      body: "Parts sent and follow-up due after delivery."
    });
  }

  if (config.status !== "New") {
    messages.push({
      type: "timeline",
      author: config.assignee,
      timestamp: lastCustomerAt,
      body: `Status changed to ${config.status}.`
    });
  }

  return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function longThreadMessage(type, author, ageHours, body) {
  return { type, author, timestamp: hoursAgo(ageHours), body };
}

function buildLongThreadTicket(config) {
  const ticket = buildTicket({
    ...config,
    customerMessage: config.thread.find((message) => message.type === "customer")?.body || config.customerMessage,
    repReply: "",
    internalNote: config.internalNote || "Long-thread layout test ticket."
  });
  ticket.conversation = config.thread
    .map((message) => longThreadMessage(message.type, message.author || (message.type === "customer" ? config.customer : config.assignee), message.ageHours, message.body))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const firstCustomerMessage = ticket.conversation.find((message) => message.type === "customer");
  if (firstCustomerMessage && config.attachments?.length) firstCustomerMessage.attachments = config.attachments;
  ticket.lastCustomerAt = ticket.conversation.filter((message) => message.type === "customer").at(-1)?.timestamp || ticket.lastCustomerAt;
  ticket.lastRepAt = ticket.conversation.filter((message) => message.type === "rep").at(-1)?.timestamp || ticket.lastRepAt;
  ticket.escalated = Boolean(config.escalated) || ticket.status === "Escalated";
  return ticket;
}

function extendedThreadForCase(config) {
  const rep = config.assignee;
  const lead = config.lead || "CS14 Robert";
  const specialist = config.specialist || lead;
  const receiptFile = config.receiptFile || config.attachments?.find((file) => file.type === "receipt")?.file || "receipt.pdf";
  const evidenceFile = config.evidenceFile || config.attachments?.find((file) => file.type !== "receipt")?.file || "troubleshooting-photo.jpg";
  const source = config.purchaseSource || config.source || "Unknown";
  const midStatus = config.midStatus || "Waiting Customer";
  const reviewStatus = config.reviewStatus || "Open";
  const finalStatus = config.finalStatus || config.status;
  return [
    { type: "customer", ageHours: config.ageHours, body: config.opening },
    { type: "timeline", author: "System", ageHours: config.ageHours - 0.2, body: `Assigned to ${rep}.` },
    { type: "timeline", author: "System", ageHours: config.ageHours - 0.4, body: `System detected possible purchase source from attachment: ${source}. Needs rep review.` },
    { type: "rep", author: rep, ageHours: config.ageHours - 2, body: config.intakeReply },
    { type: "customer", ageHours: config.ageHours - 10, body: config.customerDetail },
    { type: "timeline", author: "System", ageHours: config.ageHours - 10.2, body: `Attachment received: ${receiptFile}.` },
    { type: "note", author: rep, ageHours: config.ageHours - 11, body: config.firstNote },
    { type: "rep", author: rep, ageHours: config.ageHours - 16, body: config.checkOne },
    { type: "customer", ageHours: config.ageHours - 28, body: config.resultOne },
    { type: "timeline", author: rep, ageHours: config.ageHours - 28.3, body: `Status changed to ${midStatus}.` },
    { type: "rep", author: rep, ageHours: config.ageHours - 34, body: config.checkTwo },
    { type: "customer", ageHours: config.ageHours - 48, body: config.resultTwo },
    { type: "timeline", author: "System", ageHours: config.ageHours - 48.2, body: `Attachment received: ${evidenceFile}.` },
    { type: "note", author: rep, ageHours: config.ageHours - 49, body: config.secondNote },
    { type: "timeline", author: "System", ageHours: config.ageHours - 52, body: `Reassigned from ${rep} to ${specialist} for ${config.reassignReason}.` },
    { type: "rep", author: specialist, ageHours: config.ageHours - 56, body: config.checkThree },
    { type: "customer", ageHours: config.ageHours - 70, body: config.resultThree },
    { type: "timeline", author: specialist, ageHours: config.ageHours - 70.2, body: `Status changed to ${reviewStatus}.` },
    { type: "rep", author: specialist, ageHours: config.ageHours - 76, body: config.checkFour },
    { type: "customer", ageHours: config.ageHours - 92, body: config.resultFour },
    { type: "note", author: lead, ageHours: config.ageHours - 93, body: config.leadNote },
    { type: "timeline", author: "System", ageHours: config.ageHours - 96, body: config.activityEvent },
    { type: "rep", author: specialist, ageHours: config.ageHours - 101, body: config.nextReply },
    { type: "customer", ageHours: config.ageHours - 116, body: config.customerFollowup },
    { type: "timeline", author: specialist, ageHours: config.ageHours - 116.2, body: `Status changed to ${finalStatus}.` },
    { type: "note", author: specialist, ageHours: config.ageHours - 117, body: config.wrapNote }
  ];
}

function buildExtendedThreadTicket(config) {
  return buildLongThreadTicket({
    ...config,
    tags: [...(config.tags || []), "extended-thread"],
    thread: extendedThreadForCase(config)
  });
}

function generateExtendedLongThreadMockTickets() {
  const lead = "CS14 Robert";
  return [
    buildExtendedThreadTicket({
      id: "ISP-28720",
      subject: "RCC7P-AK tank still not filling after multiple checks",
      customer: "Alicia Grant",
      email: "alicia.grant@example.com",
      phone: "704-555-0134",
      model: "RCC7P-AK",
      family: "Under Sink RO",
      source: "iSpring direct",
      purchaseSource: "iSpring direct",
      assignee: "CS5 Michelle",
      specialist: lead,
      status: "Open",
      priority: "High",
      ageHours: 180,
      dueInHours: 8,
      tags: ["tank-not-filling", "tank-pressure", "receipt", "internal-note"],
      missing: ["Needs Video"],
      order: "IS-928720",
      warranty: "Registered",
      receipt: true,
      previousTickets: ["ISP-28620 tank not filling"],
      attachments: [attachment("ispring-order-928720.pdf", "receipt", "May 1"), attachment("tank-pressure-and-valves.mov", "troubleshooting video", "May 7")],
      receiptFile: "ispring-order-928720.pdf",
      evidenceFile: "tank-pressure-and-valves.mov",
      issue: "Tank pressure, tank valve, or feed pressure issue",
      firstTest: "Confirm the tank valve is open and check tank air pressure only when the tank is empty.",
      confirms: "Empty tank pressure is around 7-10 psi and the tank starts gaining weight after refill.",
      internalNote: "Twenty-plus message tank-fill case for sticky composer and scroll testing.",
      reassignReason: "senior RO tank review",
      midStatus: "Waiting Customer",
      reviewStatus: "Open",
      finalStatus: "Open",
      opening: "The RCC7P-AK tank is still not filling. We have changed filters, drained it twice, and barely get one glass from the faucet.",
      intakeReply: "Please send the order receipt, a photo of the tank valve, and the empty tank pressure reading. Only check pressure after the tank is fully drained.",
      customerDetail: "Receipt is attached. Empty tank pressure was 4 psi, so I raised it to 8 psi. It still feels light after sitting overnight.",
      firstNote: "Tank pressure was low and corrected. Need confirm tank valve and production flow before suggesting parts.",
      checkOne: "Thanks. Next, confirm the blue tank valve is parallel with the tubing and leave the system unused for 3 hours.",
      resultOne: "The valve is parallel. After 3 hours the tank gained a little weight, but faucet flow still stops quickly.",
      checkTwo: "Please disconnect the line going into the tank briefly and confirm whether the system is producing a steady stream into a cup.",
      resultTwo: "Video attached. Water comes out of the line slowly but steadily. The tank itself still is not taking much water.",
      secondNote: "Production flow exists. Slow fill could be feed pressure or tank acceptance. Escalate before replacement.",
      checkThree: "I reviewed the video. Please confirm feed pressure at the cold-water supply and make sure no tubing is kinked behind the cabinet.",
      resultThree: "Feed pressure is 48 psi and I do not see kinks. I also opened the feed valve all the way.",
      checkFour: "That helps. Leave the tank valve open, close the faucet, and weigh or lift the tank again after 4 hours so we know if it is accepting water slowly.",
      resultFour: "It is slightly heavier but still nowhere near full. This has been going on for days.",
      leadNote: "Do not repeat basic drain/refill steps. If final 4-hour test shows no weight change, review tank replacement.",
      activityEvent: "Warranty receipt verified: ispring-order-928720.pdf.",
      nextReply: "The next check is whether the tank keeps gaining weight over several hours. If it stops gaining after pressure and valve checks, we can review the tank under warranty.",
      customerFollowup: "Understood. I will leave it untouched this afternoon and send the weight difference."
    }),
    buildExtendedThreadTicket({
      id: "ISP-28719",
      subject: "High TDS after membrane and filter change",
      customer: "Benicio Torres",
      email: "benicio.torres@example.com",
      phone: "210-555-0188",
      model: "RCC7AK",
      family: "Under Sink RO",
      source: "Amazon",
      purchaseSource: "Amazon",
      assignee: lead,
      specialist: "CS1 Nick",
      status: "Waiting Customer",
      priority: "High",
      ageHours: 168,
      dueInHours: 18,
      tags: ["high-tds", "membrane", "frustrated", "receipt"],
      missing: ["Needs TDS Readings"],
      order: "113-928719-4451002",
      warranty: "Registered",
      receipt: true,
      previousTickets: ["ISP-28611 high TDS after membrane change"],
      attachments: [attachment("amazon-membrane-order.pdf", "receipt", "May 2"), attachment("tds-three-readings.jpg", "water test photo", "May 8")],
      receiptFile: "amazon-membrane-order.pdf",
      evidenceFile: "tds-three-readings.jpg",
      issue: "Membrane not seated, insufficient flush, or TDS creep after membrane change",
      firstTest: "Flush membrane, compare tap/tank/faucet TDS, and confirm membrane orientation.",
      confirms: "TDS drops after flush/reseat or readings isolate membrane bypass.",
      internalNote: "Long TDS case with frustrated tone and repeated readings.",
      reassignReason: "membrane rejection review",
      midStatus: "Waiting Customer",
      reviewStatus: "Open",
      finalStatus: "Waiting Customer",
      opening: "My TDS went up after replacing filters and the membrane. Tap is about 390 and RO water is still 140-160.",
      intakeReply: "Please send the membrane receipt, how many tanks were flushed, and TDS readings for tap, tank, and faucet water.",
      customerDetail: "Receipt is attached. I flushed three tanks. Tap is 392, tank is 155, faucet is 148.",
      firstNote: "Readings are too high after flush. Need isolate first-cup TDS creep from steady production.",
      checkOne: "Please let the system run for 5 minutes, then test the water while it is still producing. Compare that number to the first cup.",
      resultOne: "First cup was 151. After 5 minutes it dropped to 47, but then it goes back up later.",
      checkTwo: "That points toward TDS creep while water sits. Please also confirm the membrane is fully seated and the flow restrictor line was not moved.",
      resultTwo: "Photo attached. I pushed the membrane in again and it felt like it clicked farther than before.",
      secondNote: "Membrane may not have been fully seated. Need another flush and steady-production reading.",
      checkThree: "After reseating, flush one full tank and send the steady-production reading again after 5 minutes of flow.",
      resultThree: "It is now 31 after running for a few minutes. The first cup is still around 80 in the morning.",
      checkFour: "That steady reading is in a much better range. Morning first-cup readings can be higher because water sits in the line.",
      resultFour: "I wish that was explained earlier. I was worried the new membrane was defective.",
      leadNote: "Acknowledge frustration. Explain first-cup creep clearly and ask for one more morning/after-flow comparison.",
      activityEvent: "Warranty receipt verified: amazon-membrane-order.pdf.",
      nextReply: "The key confirming result is the steady-production reading after a few minutes. If it stays near 31, the membrane is rejecting normally.",
      customerFollowup: "I will test again tomorrow morning and after running it for five minutes."
    }),
    buildExtendedThreadTicket({
      id: "ISP-28718",
      subject: "RO500AK beeping after filter replacement for several days",
      customer: "Carmen Ellis",
      email: "carmen.ellis@example.com",
      phone: "404-555-0168",
      model: "RO500AK",
      family: "Tankless RO",
      source: "Amazon",
      purchaseSource: "Amazon",
      assignee: "CS1 Nick",
      specialist: lead,
      status: "Open",
      priority: "High",
      ageHours: 156,
      dueInHours: 10,
      tags: ["ro500ak", "beeping", "filter-reset", "receipt"],
      missing: ["Needs Video"],
      order: "112-928718-3391810",
      warranty: "Registered",
      receipt: true,
      previousTickets: ["ISP-28619 beeping after filter replacement"],
      attachments: [attachment("amazon-ro500-filter-order.pdf", "receipt", "May 2"), attachment("ro500ak-beep-pattern.mov", "display video", "May 8")],
      receiptFile: "amazon-ro500-filter-order.pdf",
      evidenceFile: "ro500ak-beep-pattern.mov",
      issue: "Filter reset or rinse cycle not completed",
      firstTest: "Confirm which filter was replaced, reset that filter light, and complete the rinse cycle.",
      confirms: "Beeping stops and the filter light returns to normal.",
      internalNote: "Long tankless reset case with video and repeated customer updates.",
      reassignReason: "RO500AK reset sequence review",
      midStatus: "Waiting Customer",
      reviewStatus: "Open",
      finalStatus: "Open",
      opening: "The RO500AK keeps beeping after I changed F1 and F2. I reset the lights but it starts again every few minutes.",
      intakeReply: "Please send the filter order receipt, photos of the filter labels, and a short video of the display when it beeps.",
      customerDetail: "I attached the Amazon order and the video. The display flashes F2 and then beeps three times.",
      firstNote: "Likely reset/rinse not completing or F2 not seated. Need exact filter labels before replacement.",
      checkOne: "Remove and reseat the F2 cartridge, then hold reset for that filter until the light changes. After that, run the rinse cycle fully.",
      resultOne: "I reseated it and reset F2. It stopped for an hour, then the beep came back.",
      checkTwo: "Please confirm whether water was flowing during the full rinse cycle and whether the unit was power-cycled afterward.",
      resultTwo: "Video attached. It looks like the rinse starts but stops after about two minutes.",
      secondNote: "Rinse appears interrupted. Reassign for senior review before sending filter set.",
      checkThree: "I reviewed the video. Please check inlet valve position and confirm the feed pressure is not dropping during rinse.",
      resultThree: "The inlet valve was not fully open. I opened it and the rinse ran longer, but the filter light still shows warning.",
      checkFour: "Run the F2 reset once more now that feed is fully open, then complete one uninterrupted rinse cycle.",
      resultFour: "The beep stopped after that, but I want to make sure it will not return.",
      leadNote: "Likely resolved by open feed valve plus completed reset/rinse. Keep open for 24-hour confirmation.",
      activityEvent: "Warranty receipt verified: amazon-ro500-filter-order.pdf.",
      nextReply: "If the beep stays off and the F2 light remains normal after the completed rinse, that confirms the reset/rinse sequence fixed it.",
      customerFollowup: "I will watch it overnight and reply if it comes back."
    }),
    buildExtendedThreadTicket({
      id: "ISP-28717",
      subject: "Whole-house pressure drop after WGB32B install",
      customer: "Lakeside Manor",
      email: "maintenance@lakesidemanor.example.com",
      phone: "843-555-0181",
      model: "WGB32B",
      family: "Whole House",
      source: "Phone",
      purchaseSource: "iSpring direct",
      assignee: "CS2 Julius",
      specialist: lead,
      status: "Overdue",
      priority: "Urgent",
      ageHours: 190,
      dueInHours: -14,
      tags: ["whole-house", "pressure-drop", "sediment", "overdue", "frustrated"],
      missing: ["Needs Pressure Reading"],
      order: "IS-928717",
      warranty: "Needs review",
      receipt: true,
      previousTickets: ["ISP-28618 pressure drop after install"],
      attachments: [attachment("ispring-wgb32b-receipt.pdf", "receipt", "May 1"), attachment("bypass-pressure-readings.jpg", "troubleshooting photo", "May 8")],
      receiptFile: "ispring-wgb32b-receipt.pdf",
      evidenceFile: "bypass-pressure-readings.jpg",
      issue: "Sediment restriction",
      firstTest: "Bypass the system and compare pressure.",
      confirms: "If pressure returns on bypass, the filter train is restricted.",
      internalNote: "Escalated long thread for whole-house pressure and overdue testing.",
      escalated: true,
      reassignReason: "overdue pressure-drop escalation",
      midStatus: "Waiting Customer",
      reviewStatus: "Escalated",
      finalStatus: "Overdue",
      opening: "Since installing the WGB32B, the building pressure drops whenever two fixtures run. Tenants are complaining.",
      intakeReply: "Please compare pressure in service mode versus bypass and send inlet/outlet readings if gauges are installed.",
      customerDetail: "Receipt is attached. In bypass we get about 56 psi. In service it drops near 28 psi with two faucets open.",
      firstNote: "Bypass restores pressure. Likely filter train restriction, cartridge load, or install direction.",
      checkOne: "Please confirm the flow direction arrow and remove the first sediment cartridge briefly for inspection if safe to do so.",
      resultOne: "The arrow is correct. The sediment cartridge is already brown after a week.",
      checkTwo: "That suggests heavy sediment load. Please flush upstream if possible and send a photo of the cartridge and housing.",
      resultTwo: "Photos attached. There is a lot of sand-like material in the first housing.",
      secondNote: "Heavy sediment before carbon stages. Discuss prefilter maintenance; product defect not indicated yet.",
      checkThree: "The sediment load is restricting the train. Replace or clean the sediment cartridge, then repeat service-mode pressure.",
      resultThree: "New sediment cartridge brought pressure to 45 psi, but it still drops after a day.",
      checkFour: "That confirms sediment restriction. For this water load, increase sediment maintenance frequency or add upstream spin-down prefiltration.",
      resultFour: "I need a written answer because the installer says the system is undersized.",
      leadNote: "Customer frustrated. Provide clear bypass-confirmed explanation and avoid sizing promises without flow/water analysis.",
      activityEvent: "Status changed to Overdue after SLA timer passed.",
      nextReply: "The bypass comparison confirms the restriction is in the filter train. The fast sediment loading means the next step is sediment prefiltration or more frequent first-stage service.",
      customerFollowup: "Send that summary so I can share it with the property manager."
    }),
    buildExtendedThreadTicket({
      id: "ISP-28716",
      subject: "WCS45KG brine tank has no water during startup",
      customer: "Denise Wallace",
      email: "denise.wallace@example.com",
      phone: "515-555-0174",
      model: "WCS45KG",
      family: "Water Softener",
      source: "iSpring direct",
      purchaseSource: "iSpring direct",
      assignee: "CS3 Sean",
      specialist: "CS2 Julius",
      status: "Open",
      priority: "Normal",
      ageHours: 162,
      dueInHours: 20,
      tags: ["wcs45kg", "brine", "startup", "receipt"],
      missing: ["Needs Photos"],
      order: "IS-928716",
      warranty: "Registered",
      receipt: true,
      previousTickets: ["ISP-28614 brine tank startup issue"],
      attachments: [attachment("wcs45kg-order-928716.pdf", "receipt", "May 2"), attachment("brine-line-startup-photo.jpg", "install photo", "May 8")],
      receiptFile: "wcs45kg-order-928716.pdf",
      evidenceFile: "brine-line-startup-photo.jpg",
      issue: "Startup fill cycle not completed or brine line not seated",
      firstTest: "Confirm valve completed startup and brine line is connected tightly.",
      confirms: "Manual regeneration fills brine tank and draw cycle pulls brine normally.",
      internalNote: "Long water softener startup thread for timeline readability.",
      reassignReason: "water softener startup review",
      midStatus: "Waiting Customer",
      reviewStatus: "Open",
      finalStatus: "Open",
      opening: "The WCS45KG brine tank has almost no water after startup. The manual says there should be water, so I think something is wrong.",
      intakeReply: "Please send a photo of the valve display, brine line connection, and the receipt so we can confirm the exact model and setup.",
      customerDetail: "Receipt and photos attached. The display is on service, but the brine tank looks dry except for a little water at the bottom.",
      firstNote: "Need explain startup behavior and verify brine line seating before part decision.",
      checkOne: "A small amount of water can be normal, but please confirm the brine line nut is seated and run a manual regeneration fill step.",
      resultOne: "The brine line nut was a little loose. I tightened it and started manual regen, but I do not see much water entering.",
      checkTwo: "Please watch the fill stage for several minutes and send a short video of the drain line and brine tank during that stage.",
      resultTwo: "Video attached. I hear the valve running but the brine level only rises slightly.",
      secondNote: "Fill may be short or customer may be expecting too much standing water. Reassign to softener lead.",
      checkThree: "I reviewed the video. The fill is happening, but slowly. Please let the cycle complete and mark the water line with tape before/after.",
      resultThree: "After the full cycle the water line rose about two inches, then later it went down during draw.",
      checkFour: "That confirms the brine tank filled and drew brine. The tank will not stay full like a storage tank.",
      resultFour: "That makes sense now. I thought it had to fill halfway.",
      leadNote: "Education case. No part needed if fill/draw confirmed.",
      activityEvent: "Warranty receipt verified: wcs45kg-order-928716.pdf.",
      nextReply: "The confirming result is that the tank gains water during fill and the level drops during draw. That means the brine cycle is working.",
      customerFollowup: "Thanks. I will monitor the next regeneration and send a picture if it changes."
    }),
    buildExtendedThreadTicket({
      id: "ISP-28715",
      subject: "UVF55FS lamp alarm after reseating lamp",
      customer: "Green Valley Clinic",
      email: "facilities@greenvalleyclinic.example.com",
      phone: "770-555-0199",
      model: "UVF55FS",
      family: "UV",
      source: "Web Form",
      purchaseSource: "iSpring direct",
      assignee: "CS1 Nick",
      specialist: lead,
      status: "Pending Parts",
      priority: "High",
      ageHours: 174,
      dueInHours: 16,
      tags: ["uvf55fs", "lamp", "ballast", "replacement-parts"],
      missing: [],
      order: "IS-928715",
      warranty: "Registered",
      receipt: true,
      previousTickets: ["ISP-28613 UVF55FS ballast troubleshooting"],
      attachments: [attachment("uvf55fs-invoice.pdf", "receipt", "May 1"), attachment("ballast-label-and-lamp-pins.jpg", "troubleshooting photo", "May 8")],
      receiptFile: "uvf55fs-invoice.pdf",
      evidenceFile: "ballast-label-and-lamp-pins.jpg",
      issue: "Lamp seating, ballast, or consumable lamp failure",
      firstTest: "Confirm lamp pins and ballast label.",
      confirms: "Alarm clears after reseating or known-good lamp test.",
      internalNote: "Replacement ballast sent after senior review.",
      partsSent: true,
      reassignReason: "UV ballast warranty review",
      midStatus: "Waiting Customer",
      reviewStatus: "Pending Parts",
      finalStatus: "Pending Parts",
      opening: "Our UVF55FS alarm keeps sounding. We reseated the lamp and checked the sleeve, but the lamp still will not stay on.",
      intakeReply: "Please send the receipt, ballast label, lamp connector photo, and confirm whether the lamp flashes at startup.",
      customerDetail: "Invoice and photos attached. The lamp flashes once, then the ballast alarm returns.",
      firstNote: "Lamp flashes then alarm returns. Need confirm lamp age and pins before warranty replacement.",
      checkOne: "Please unplug the unit, reseat the four-pin lamp connector firmly, and inspect for bent pins or moisture.",
      resultOne: "Pins look straight and dry. Reseating did not clear the alarm.",
      checkTwo: "Please send a short video of the startup behavior and confirm the lamp part number printed on the sleeve.",
      resultTwo: "Video attached. The part number matches the manual. Alarm returns in about five seconds.",
      secondNote: "Part number matches. Behavior points toward ballast or lamp failure; receipt is on file.",
      checkThree: "Because the lamp flashes and the label matches, we are reviewing the ballast under warranty before sending parts.",
      resultThree: "This is for a clinic, so we need the UV running as soon as possible.",
      checkFour: "Understood. Keep the water system bypassed according to your local safety process until the UV issue is corrected.",
      resultFour: "Please send whatever part is most likely. We can swap it immediately.",
      leadNote: "Approve ballast replacement. Remind customer to verify operation after install; do not give health compliance advice.",
      activityEvent: "Replacement ballast sent and follow-up due after delivery.",
      nextReply: "A replacement ballast is being sent. What confirms the fix is the lamp staying on without the alarm after the ballast is installed.",
      customerFollowup: "Thank you. Send tracking when available."
    }),
    buildExtendedThreadTicket({
      id: "ISP-28714",
      subject: "WSP50ARB low flow from sediment screen clogging",
      customer: "Miguel Santos",
      email: "miguel.santos@example.com",
      phone: "720-555-0186",
      model: "WSP50ARB",
      family: "Sediment",
      source: "Email",
      purchaseSource: "iSpring direct",
      assignee: "CS3 Sean",
      specialist: "CS2 Julius",
      status: "Resolved",
      priority: "Normal",
      ageHours: 150,
      dueInHours: 0,
      tags: ["wsp50arb", "sediment", "low-flow", "replacement-parts"],
      missing: [],
      order: "IS-928714",
      warranty: "Registered",
      receipt: true,
      previousTickets: ["ISP-28612 sediment clogging"],
      attachments: [attachment("wsp50arb-order.pdf", "receipt", "May 3"), attachment("packed-sediment-screen.jpg", "troubleshooting photo", "May 8")],
      receiptFile: "wsp50arb-order.pdf",
      evidenceFile: "packed-sediment-screen.jpg",
      issue: "Screen clogged with sediment",
      firstTest: "Flush the filter and turn the scraper knob several times.",
      confirms: "Flow improves after flushing/cleaning.",
      internalNote: "Resolved WSP low-flow thread with replacement screen.",
      partsSent: true,
      reassignReason: "sediment screen replacement review",
      midStatus: "Waiting Customer",
      reviewStatus: "Pending Parts",
      finalStatus: "Resolved",
      opening: "The WSP50ARB drops the house flow every few days. Flushing helps for a little while, then it clogs again.",
      intakeReply: "Please send the receipt and a close-up photo of the screen after flushing. Also confirm whether turning the scraper knob improves flow.",
      customerDetail: "Receipt attached. The screen photo shows sediment stuck in the mesh even after flushing.",
      firstNote: "Heavy sediment plus possible damaged mesh. Need before/after pressure if available.",
      checkOne: "Flush with a bucket under the drain port and turn the scraper knob several times while flushing.",
      resultOne: "Flow improved right away, but by the next day it slowed again.",
      checkTwo: "Please inspect the screen for bent or torn mesh and send one close photo in good light.",
      resultTwo: "Photo attached. There is a dent and a small torn spot in the screen.",
      secondNote: "Damaged screen confirmed. Receipt on file; send replacement screen.",
      checkThree: "The torn screen can trap sediment unevenly. We are sending a replacement screen.",
      resultThree: "I installed the new screen and flushed until clear. Flow is much better.",
      checkFour: "Great. Please monitor for 48 hours and flush when you see sediment building in the bowl.",
      resultFour: "It has been two days and flow is still normal.",
      leadNote: "Confirmed resolved. Good test case for parts-sent timeline and final status.",
      activityEvent: "Replacement sediment screen delivered.",
      nextReply: "That confirms the clogged/damaged screen was the issue. Keep flushing when sediment is visible to prevent another restriction.",
      customerFollowup: "Thanks, this fixed it."
    }),
    buildExtendedThreadTicket({
      id: "ISP-28713",
      subject: "Amazon damaged shipment replacement request escalated",
      customer: "Priya Nair",
      email: "priya.nair@example.com",
      phone: "408-555-0149",
      model: "RCC7AK",
      family: "Under Sink RO",
      source: "Amazon",
      purchaseSource: "Amazon",
      assignee: "CS5 Michelle",
      specialist: lead,
      status: "Escalated",
      priority: "Urgent",
      ageHours: 184,
      dueInHours: -8,
      tags: ["amazon", "damaged-shipment", "replacement-parts", "frustrated", "escalated"],
      missing: [],
      order: "113-928713-8842001",
      warranty: "Not registered",
      receipt: true,
      previousTickets: ["ISP-28616 damaged shipment replacement dispute"],
      attachments: [attachment("amazon-order-928713.pdf", "receipt", "May 1"), attachment("cracked-housing-in-box.jpg", "damage photo", "May 8")],
      receiptFile: "amazon-order-928713.pdf",
      evidenceFile: "cracked-housing-in-box.jpg",
      issue: "Amazon shipping damage and replacement ownership dispute",
      firstTest: "Confirm damage happened before installation and whether Amazon replacement path is available.",
      confirms: "Damage photos and Amazon order details confirm shipping issue.",
      internalNote: "Frustrated customer; manager exception review required.",
      escalated: true,
      partsSent: true,
      reassignReason: "Amazon damage exception review",
      midStatus: "Waiting Customer",
      reviewStatus: "Escalated",
      finalStatus: "Escalated",
      opening: "The RCC7AK arrived with a cracked housing. Amazon says contact iSpring, and I am tired of being pushed around.",
      intakeReply: "I am sorry it arrived that way. Please send the Amazon order page, box label, and photos showing the cracked housing before installation.",
      customerDetail: "Everything is attached. The crack is visible while it is still in the packaging.",
      firstNote: "Photos support pre-install shipping damage. Amazon source. Need exception approval before direct shipment.",
      checkOne: "Thank you. Please confirm whether Amazon is still showing a return or replacement option on the order page.",
      resultOne: "Amazon only shows contact seller/manufacturer. I need a working system, not another loop.",
      checkTwo: "Understood. Please also send your shipping address and phone number so we have it ready if an exception is approved.",
      resultTwo: "Attached screenshot and address. I do not want to pay return shipping for a broken item.",
      secondNote: "Customer is frustrated. Escalate with complete evidence and avoid blaming Amazon.",
      checkThree: "I have the evidence needed and am sending this for manager exception review.",
      resultThree: "Please hurry. This was supposed to be installed this weekend.",
      checkFour: "We reviewed the photos and order details. We can send the damaged housing part as an exception.",
      resultFour: "Thank you. Please send tracking as soon as it ships.",
      leadNote: "Exception approved for housing part only. Keep tone calm and document Amazon source.",
      activityEvent: "Replacement housing sent and follow-up due after delivery.",
      nextReply: "The replacement part has been approved as an exception. Tracking will confirm shipment, and the damaged housing photo confirms why the exception was granted.",
      customerFollowup: "I appreciate the exception. I will watch for tracking."
    }),
    buildExtendedThreadTicket({
      id: "ISP-28712",
      subject: "Warranty registration still missing receipt after upload",
      customer: "Rachel Kim",
      email: "rachel.kim@example.com",
      phone: "646-555-0190",
      model: "RO500AK",
      family: "Warranty",
      source: "Home Depot",
      purchaseSource: "Home Depot",
      assignee: lead,
      specialist: "CS5 Michelle",
      status: "Waiting Customer",
      priority: "Low",
      ageHours: 146,
      dueInHours: 28,
      tags: ["warranty", "missing-receipt", "registration", "receipt"],
      missing: ["Needs Receipt"],
      order: "HD-928712",
      warranty: "Pending receipt",
      receipt: false,
      previousTickets: ["ISP-28617 missing receipt"],
      attachments: [attachment("home-depot-order-summary.png", "order screenshot", "May 3"), attachment("home-depot-cart-page.png", "order screenshot", "May 8")],
      receiptFile: "home-depot-order-summary.png",
      evidenceFile: "home-depot-cart-page.png",
      issue: "Warranty registration needs proof of purchase with seller/date/model",
      firstTest: "Collect receipt or order confirmation showing seller, date, and model.",
      confirms: "Receipt details match model and eligible seller.",
      internalNote: "Long warranty intake thread with repeated non-receipt uploads.",
      reassignReason: "receipt verification review",
      midStatus: "Waiting Customer",
      reviewStatus: "Waiting Customer",
      finalStatus: "Waiting Customer",
      opening: "The warranty registration page still says my receipt is missing even though I uploaded a Home Depot screenshot.",
      intakeReply: "Please upload a receipt or invoice that shows Home Depot, purchase date, order number, and the RO500AK model.",
      customerDetail: "I attached the order summary. It has the order number but I do not see the model on that page.",
      firstNote: "Uploaded screenshot is incomplete. Need invoice/item detail page.",
      checkOne: "The order number helps, but registration needs the item line showing RO500AK. Home Depot usually has an invoice or item detail view.",
      resultOne: "I found a cart page with the product picture. Is that enough?",
      checkTwo: "Please send it so we can review, but the best document is still the invoice or receipt with date and seller.",
      resultTwo: "Cart page attached. I cannot find the invoice email.",
      secondNote: "Cart page still not proof of purchase. Reassign to receipt review for cleaner wording.",
      checkThree: "I reviewed both uploads. They show the product, but not a completed purchase date. Please try the Home Depot order details page or email confirmation.",
      resultThree: "I may have used a different email for Home Depot. I can check tonight.",
      checkFour: "That is fine. Once you find the confirmation email, send the full page or PDF and we can complete registration.",
      resultFour: "Will do. I just wanted to make sure this ticket stays open.",
      leadNote: "Keep open. Do not mark receipt on file until true proof of purchase is uploaded.",
      activityEvent: "Receipt review marked Needs Review: home-depot-order-summary.png.",
      nextReply: "The next step is the actual Home Depot receipt or confirmation email. What confirms it is a document showing seller, purchase date, order number, and RO500AK.",
      customerFollowup: "I will send the confirmation email once I find it."
    }),
    buildExtendedThreadTicket({
      id: "ISP-28711",
      subject: "Frustrated return and replacement request after troubleshooting",
      customer: "Owen Bradley",
      email: "owen.bradley@example.com",
      phone: "314-555-0172",
      model: "WGB32BM",
      family: "Whole House",
      source: "Home Depot",
      purchaseSource: "Home Depot",
      assignee: "CS2 Julius",
      specialist: lead,
      status: "Escalated",
      priority: "Urgent",
      ageHours: 188,
      dueInHours: -18,
      tags: ["return-policy", "replacement", "frustrated", "escalated", "water-test"],
      missing: ["Needs Water Test"],
      order: "HD-928711",
      warranty: "Needs review",
      receipt: true,
      previousTickets: ["ISP-28615 return policy after install"],
      attachments: [attachment("home-depot-receipt-928711.pdf", "receipt", "May 1"), attachment("staining-after-install.jpg", "water photo", "May 8")],
      receiptFile: "home-depot-receipt-928711.pdf",
      evidenceFile: "staining-after-install.jpg",
      issue: "Return request after installation with water chemistry still under review",
      firstTest: "Review return source/window and confirm whether product defect is shown by test results.",
      confirms: "Return path depends on seller policy, date, and defect confirmation.",
      internalNote: "Messy escalated return/replacement case with frustrated tone.",
      escalated: true,
      reassignReason: "manager return-policy escalation",
      midStatus: "Waiting Customer",
      reviewStatus: "Escalated",
      finalStatus: "Escalated",
      opening: "I want either a replacement system or a return approval. The WGB32BM did not fix the staining and I am done troubleshooting.",
      intakeReply: "I understand. Please send your receipt, current water test results, and photos of the staining so we can review the right path.",
      customerDetail: "Receipt and photos attached. I do not have a lab test, but the staining is obvious.",
      firstNote: "Customer wants return/replacement without water data. Need policy-safe explanation.",
      checkOne: "The photos show staining, but we need water numbers to know whether this is media limit, flow rate, or a product issue.",
      resultOne: "That sounds like another hoop. I bought the system because it said manganese reduction.",
      checkTwo: "I hear you. Please send iron, manganese, pH, hardness, and flow rate if available. Those values determine whether the system is operating within range.",
      resultTwo: "Photo attached from a test strip. I know it is not a lab, but it shows high iron.",
      secondNote: "Test strip not enough for manganese/media decision. Escalate due tone and return request.",
      checkThree: "I am escalating this for manager review. A lab test is still the best way to confirm whether replacement, return path, or pre-treatment is appropriate.",
      resultThree: "I need a direct answer, not a maybe. The return window is closing.",
      checkFour: "The direct answer is that we cannot approve a manufacturer replacement from photos alone. We can help review the seller return path and the water-test path in parallel.",
      resultFour: "Fine. Send me exactly what test you need and what return documentation I should keep.",
      leadNote: "Escalated. Provide concise checklist; avoid arguing policy. Mention seller return window without legal language.",
      activityEvent: "Manager review opened for return/replacement exception.",
      nextReply: "The next step is a complete water test plus the Home Depot receipt. What confirms the path is whether the water values are within the system limits and whether the seller return window is still active.",
      customerFollowup: "Send the checklist. I will try to get the lab test this week."
    })
  ];
}

function generateLongThreadMockTickets() {
  const lead = "CS14 Robert";
  return [
    buildLongThreadTicket({
      id: "ISP-28620",
      subject: "RCC7P-AK tank not filling after pressure reset attempts",
      customer: "Ellen Brooks",
      email: "ellen.brooks@example.com",
      phone: "615-555-0114",
      model: "RCC7P-AK",
      family: "Under Sink RO",
      source: "Email",
      assignee: lead,
      status: "Open",
      priority: "High",
      ageHours: 70,
      dueInHours: 10,
      tags: ["long-thread", "tank-not-filling", "tank-pressure", "needs-video"],
      missing: ["Needs Video"],
      order: "IS-90341",
      warranty: "Registered",
      receipt: true,
      previousTickets: ["ISP-28501 tank not filling after filter change"],
      attachments: [attachment("receipt-is-90341.pdf", "receipt", "May 7"), attachment("tank-pressure-gauge.jpg", "troubleshooting photo", "May 8")],
      issue: "Tank pressure, feed valve, or check valve restriction after filter service",
      firstTest: "Drain the tank completely, confirm 7-10 PSI empty, then verify feed valve and tank valve positions.",
      confirms: "Tank begins filling after pressure correction or check valve restriction is cleared.",
      internalNote: "Customer has already tried partial pressure reset; avoid repeating the same steps without checking valve position.",
      thread: [
        { type: "customer", ageHours: 70, body: "The RCC7P-AK tank still is not filling after I changed filters. Faucet flow dies after one cup." },
        { type: "timeline", author: "System", ageHours: 69.8, body: "Assigned to CS14 Robert." },
        { type: "timeline", author: "System", ageHours: 69.6, body: "System detected possible purchase source from attachment: iSpring direct. Needs rep review." },
        { type: "rep", ageHours: 68, body: "Thanks Ellen. Please drain the tank fully, check empty tank pressure, and confirm the tank valve handle is parallel with the tubing." },
        { type: "customer", ageHours: 52, body: "The tank was around 3 PSI empty, so I raised it to 8. It filled some overnight but still runs out fast." },
        { type: "note", author: lead, ageHours: 51.5, body: "Pressure was low, but refill is still slow. Next check feed valve, ASO/check valve, and possible post-filter restriction." },
        { type: "rep", ageHours: 49, body: "Good, that confirms pressure was part of it. Next, please send one wide photo under the sink showing the feed valve, tank valve, and tubing path." },
        { type: "customer", ageHours: 24, body: "Photo attached. The blue valve on the tank is open, but I am not sure about the feed valve." },
        { type: "timeline", author: "System", ageHours: 23.8, body: "Attachment received: under-sink-wide-photo.jpg." },
        { type: "rep", ageHours: 22, body: "The tank valve looks open. Please turn the feed valve fully counterclockwise, then let the system run for 2 hours without drawing water." },
        { type: "customer", ageHours: 7, body: "It improved, but the tank is still not getting full. Should I replace the tank?" },
        { type: "note", author: lead, ageHours: 6.5, body: "Do not recommend tank replacement yet. Need video of production line flow before part decision." }
      ]
    }),
    buildLongThreadTicket({
      id: "ISP-28619",
      subject: "RO500AK beeping after filter replacement and reset loop",
      customer: "Dana Mitchell",
      email: "dana.mitchell@example.com",
      phone: "404-555-0198",
      model: "RO500AK",
      family: "Tankless RO",
      source: "Amazon",
      assignee: "CS1 Nick",
      status: "Waiting Customer",
      priority: "High",
      ageHours: 62,
      dueInHours: 14,
      tags: ["long-thread", "ro500ak", "beeping", "filter-reset"],
      missing: ["Needs Video"],
      order: "112-8901132-4589011",
      warranty: "Registered",
      receipt: true,
      previousTickets: ["ISP-28500 beeping after filter replacement", "ISP-28482 filter bay leak"],
      attachments: [attachment("amazon-invoice.pdf", "receipt", "May 7"), attachment("ro500-display-reset-loop.mov", "display video", "May 8")],
      issue: "Filter reset sequence or filter recognition issue after replacement",
      firstTest: "Confirm exact filter part numbers and complete reset/rinse sequence from the display.",
      confirms: "Beeping clears after reset/rinse or part label confirms mismatched filter.",
      internalNote: "Repeat customer. Check prior leak ticket before suggesting new filter set.",
      thread: [
        { type: "customer", ageHours: 62, body: "My RO500AK started beeping right after I replaced the filters. I held reset but it keeps coming back." },
        { type: "timeline", author: "System", ageHours: 61.8, body: "Assigned to CS14 Robert." },
        { type: "rep", author: lead, ageHours: 60.5, body: "Please send photos of the filter labels and a short video of the display after you press reset." },
        { type: "customer", ageHours: 48, body: "I uploaded the video. It shows F1, then beeps, then goes back to the same warning." },
        { type: "timeline", author: "System", ageHours: 47.8, body: "Attachment received: ro500-display-reset-loop.mov." },
        { type: "note", author: lead, ageHours: 47.4, body: "Video shows reset acknowledged but not completing rinse. Ask for filter label photo before part replacement." },
        { type: "timeline", author: "System", ageHours: 46, body: "Reassigned from CS14 Robert to CS1 Nick for tankless RO review." },
        { type: "rep", author: "CS1 Nick", ageHours: 44, body: "Thanks Dana. The video helps. Please also send a close-up of the filter labels, especially the small part numbers." },
        { type: "customer", ageHours: 18, body: "The labels say RO500-F1 and RO500-F2. I bought them from Amazon with the system." },
        { type: "rep", author: "CS1 Nick", ageHours: 12, body: "Those labels look right. Please run the rinse cycle for 10 minutes after reset, then power cycle the unit once." },
        { type: "customer", ageHours: 4, body: "I will try tonight. The unit is usable but the beep is driving us crazy." },
        { type: "timeline", author: "System", ageHours: 3.8, body: "Status changed to Waiting Customer." }
      ]
    }),
    buildLongThreadTicket({
      id: "ISP-28618",
      subject: "WGB32B whole-house pressure drop after new install",
      customer: "Parker Lane",
      email: "parker.lane@example.com",
      phone: "919-555-0128",
      model: "WGB32B",
      family: "Whole House",
      source: "Phone",
      assignee: "CS2 Julius",
      status: "Escalated",
      priority: "Urgent",
      ageHours: 96,
      dueInHours: -18,
      tags: ["long-thread", "pressure-drop", "whole-house", "escalated"],
      missing: ["Needs Pressure Reading"],
      order: "IS-90121",
      warranty: "Needs review",
      receipt: false,
      previousTickets: ["ISP-28499 pressure drop", "ISP-28483 pressure gauge reads low"],
      attachments: [attachment("wgb32b-install-direction.jpg", "install photo", "May 6"), attachment("pressure-gauge-before-after.jpg", "troubleshooting photo", "May 8")],
      issue: "Severe pressure drop may be upstream pressure, clogged sediment stage, or install direction",
      firstTest: "Compare inlet/outlet pressure and bypass results with clean sediment cartridge.",
      confirms: "Pressure returns in bypass or readings isolate the restriction.",
      internalNote: "Escalated because customer reports whole-house usability issue and conflicting readings.",
      escalated: true,
      thread: [
        { type: "customer", ageHours: 96, body: "Ever since the WGB32B install, our whole house pressure is terrible. Showers barely run." },
        { type: "timeline", author: "System", ageHours: 95.7, body: "Assigned to CS2 Julius." },
        { type: "rep", author: "CS2 Julius", ageHours: 94, body: "Please put the system in bypass and let us know if pressure returns immediately." },
        { type: "customer", ageHours: 76, body: "In bypass it is better, but not as strong as before. The installer says the filters are too restrictive." },
        { type: "note", author: "CS2 Julius", ageHours: 75.5, body: "Bypass improves pressure, but inlet may also be low. Need pressure readings before confirming media restriction." },
        { type: "rep", author: "CS2 Julius", ageHours: 72, body: "Please send inlet pressure before the system, outlet pressure after the system, and a photo of the flow direction arrow." },
        { type: "customer", ageHours: 40, body: "Photos attached. Inlet reads 38 PSI and outlet is around 20 PSI with water running." },
        { type: "timeline", author: "System", ageHours: 39.8, body: "Attachment received: pressure-gauge-before-after.jpg." },
        { type: "timeline", author: "System", ageHours: 38, body: "Status changed to Escalated." },
        { type: "note", author: "CS14 Robert", ageHours: 37.5, body: "Manager review: inlet 38 PSI is already low. Avoid saying filter is defective until fresh sediment stage and inlet pressure are confirmed." },
        { type: "rep", author: "CS2 Julius", ageHours: 34, body: "The outlet drop is meaningful, but the inlet pressure is also low. Please test with a fresh sediment cartridge and no other fixtures running." },
        { type: "customer", ageHours: 10, body: "This is frustrating. We bought the system to improve water, not lose pressure. I need a clear answer today." }
      ]
    }),
    buildLongThreadTicket({
      id: "ISP-28617",
      subject: "Warranty registration blocked by missing receipt",
      customer: "Chris Huang",
      email: "chris.huang@example.com",
      phone: "678-555-0164",
      model: "RCC7AK",
      family: "Warranty",
      source: "Lowe's",
      assignee: lead,
      status: "Waiting Customer",
      priority: "Low",
      ageHours: 58,
      dueInHours: 30,
      tags: ["long-thread", "warranty", "receipt", "registration"],
      missing: ["Needs Receipt"],
      order: "LOW-880174",
      warranty: "Pending receipt",
      receipt: false,
      previousTickets: ["ISP-28494 missing receipt", "ISP-28480 faucet drip"],
      attachments: [attachment("lowes-order-screenshot.png", "order screenshot", "May 8")],
      issue: "Warranty registration needs proof of purchase with seller/date/model",
      firstTest: "Collect receipt or order confirmation showing seller, date, and model.",
      confirms: "Receipt details match model and eligible seller.",
      internalNote: "Use this long warranty case to test receipt/warranty cards and history.",
      thread: [
        { type: "customer", ageHours: 58, body: "I keep trying to register my RCC7AK but the site says my receipt is missing." },
        { type: "timeline", author: "System", ageHours: 57.8, body: "Assigned to CS14 Robert." },
        { type: "rep", ageHours: 56, body: "Please upload a receipt or order confirmation that shows Lowe's, purchase date, and the model number." },
        { type: "customer", ageHours: 44, body: "I attached a screenshot from Lowe's. It shows the order number but not the model." },
        { type: "timeline", author: "System", ageHours: 43.8, body: "Attachment received: lowes-order-screenshot.png." },
        { type: "note", author: lead, ageHours: 43.4, body: "Screenshot is not enough for full registration. Need item details or invoice view." },
        { type: "rep", ageHours: 41, body: "Thanks. That confirms the order source, but we still need the item line or invoice view showing RCC7AK." },
        { type: "customer", ageHours: 26, body: "I found a PDF but it has my address. Is that okay to send?" },
        { type: "rep", ageHours: 24, body: "Yes, you can send it here. We only use it to verify purchase source, date, and model for the warranty record." },
        { type: "timeline", author: "System", ageHours: 22, body: "Status changed to Waiting Customer." }
      ]
    }),
    buildLongThreadTicket({
      id: "ISP-28616",
      subject: "Amazon damaged shipment replacement dispute",
      customer: "Olivia Carter",
      email: "olivia.carter@example.com",
      phone: "303-555-0177",
      model: "RCC7P-AK",
      family: "Under Sink RO",
      source: "Amazon",
      assignee: "CS5 Michelle",
      status: "Escalated",
      priority: "High",
      ageHours: 88,
      dueInHours: -9,
      tags: ["long-thread", "amazon", "damaged-shipment", "frustrated", "escalated"],
      missing: [],
      order: "113-4419021-1093842",
      warranty: "Not registered",
      receipt: true,
      previousTickets: ["ISP-28493 damaged shipment", "ISP-28489 damaged faucet"],
      attachments: [attachment("amazon-box-crushed.jpg", "damage photo", "May 6"), attachment("amazon-order-1134419021.pdf", "receipt", "May 6")],
      issue: "Amazon shipping damage and replacement ownership dispute",
      firstTest: "Confirm damage happened before installation and whether Amazon replacement path is available.",
      confirms: "Damage photos and Amazon order details confirm shipping issue.",
      internalNote: "Frustrated customer. Manager approval required before direct replacement outside Amazon path.",
      escalated: true,
      thread: [
        { type: "customer", ageHours: 88, body: "The box arrived crushed and one fitting is cracked. Amazon told me to contact iSpring." },
        { type: "timeline", author: "System", ageHours: 87.8, body: "Assigned to CS5 Michelle." },
        { type: "timeline", author: "System", ageHours: 87.6, body: "System detected possible purchase source from attachment: Amazon. Needs rep review." },
        { type: "rep", author: "CS5 Michelle", ageHours: 85, body: "I am sorry it arrived damaged. Please send photos of the box label, damaged part, and Amazon order page." },
        { type: "customer", ageHours: 61, body: "I already uploaded all of that. I do not want to be bounced between Amazon and iSpring." },
        { type: "timeline", author: "System", ageHours: 60.8, body: "Attachments received: amazon-box-crushed.jpg, cracked-fitting.jpg, amazon-order-1134419021.pdf." },
        { type: "note", author: "CS5 Michelle", ageHours: 60.2, body: "Photos show shipping damage before install. Amazon source. Review exception before promising replacement." },
        { type: "rep", author: "CS5 Michelle", ageHours: 57, body: "Thank you for sending those. Because this was purchased through Amazon and appears shipping-related, we need to review the replacement path carefully." },
        { type: "customer", ageHours: 29, body: "This is unacceptable. I paid for a working system, and I need the broken fitting replaced now." },
        { type: "timeline", author: "System", ageHours: 28.5, body: "Status changed to Escalated." },
        { type: "note", author: lead, ageHours: 27, body: "Escalated for manager review. Offer clear next step, but do not state replacement approval until exception is confirmed." },
        { type: "rep", author: lead, ageHours: 24, body: "I understand the frustration. I am escalating this for exception review and will update you with the approved next step as soon as we confirm it." }
      ]
    }),
    buildLongThreadTicket({
      id: "ISP-28615",
      subject: "Customer frustrated about return policy after install",
      customer: "Marcus Reed",
      email: "marcus.reed@example.com",
      phone: "901-555-0219",
      model: "WGB32BM",
      family: "Whole House",
      source: "Home Depot",
      assignee: "CS14 Robert",
      status: "Overdue",
      priority: "Urgent",
      ageHours: 110,
      dueInHours: -30,
      tags: ["long-thread", "return-policy", "frustrated", "overdue", "whole-house"],
      missing: ["Needs Water Test"],
      order: "HD-28615",
      warranty: "Needs review",
      receipt: true,
      previousTickets: [],
      attachments: [attachment("home-depot-receipt.pdf", "receipt", "May 5"), attachment("treated-water-test.jpg", "water test photo", "May 7")],
      issue: "Return request after installation with water chemistry still under review",
      firstTest: "Review return source/window and confirm whether product defect is shown by test results.",
      confirms: "Return path depends on seller policy, date, and defect confirmation.",
      internalNote: "Frustrated tone; avoid policy argument. Provide one clear path and manager review option.",
      thread: [
        { type: "customer", ageHours: 110, body: "I want to return this WGB32BM. It did not solve the staining and Home Depot says I need manufacturer approval." },
        { type: "timeline", author: "System", ageHours: 109.8, body: "Assigned to CS14 Robert." },
        { type: "rep", ageHours: 108, body: "I can help review the options. Please send the receipt, purchase date, and raw/treated water test results so we can see what changed." },
        { type: "customer", ageHours: 84, body: "Receipt is attached. I do not have a raw test from before install. I just know my fixtures are still staining." },
        { type: "timeline", author: "System", ageHours: 83.8, body: "Attachment received: home-depot-receipt.pdf." },
        { type: "note", author: lead, ageHours: 82, body: "Home Depot source. Return approval may need seller path. Need water data before defect conclusion." },
        { type: "rep", ageHours: 78, body: "Thanks. To separate product performance from water chemistry, please send current iron, manganese, hardness, pH, and flow rate if available." },
        { type: "customer", ageHours: 39, body: "This is exactly the runaround I was worried about. I installed what you sell and my water still looks bad." },
        { type: "timeline", author: "System", ageHours: 38.5, body: "Status changed to Overdue." },
        { type: "note", author: lead, ageHours: 37, body: "Overdue escalation risk. Acknowledge frustration and set expectation; do not approve return without policy/defect review." },
        { type: "rep", ageHours: 34, body: "I hear you. I am not trying to send you in circles. The next useful step is reviewing the current water test so we can determine whether this is a product issue, water chemistry limit, or return-policy path." }
      ]
    }),
    buildLongThreadTicket({
      id: "ISP-28614",
      subject: "WCS45KG brine tank startup issue with repeat updates",
      customer: "Harper Stone",
      email: "harper.stone@example.com",
      phone: "512-555-0182",
      model: "WCS45KG",
      family: "Water Softener",
      source: "iSpring direct",
      assignee: "CS3 Sean",
      status: "Open",
      priority: "Normal",
      ageHours: 74,
      dueInHours: 20,
      tags: ["long-thread", "wcs45kg", "brine", "startup"],
      missing: [],
      order: "IS-90779",
      warranty: "Registered",
      receipt: true,
      previousTickets: ["ISP-28497 brine tank startup", "ISP-28491 salt bridge"],
      attachments: [attachment("ispring-receipt-90779.pdf", "receipt", "May 5"), attachment("valve-display-startup.jpg", "install photo", "May 8")],
      issue: "Brine tank startup fill/draw cycle or brine line seating issue",
      firstTest: "Confirm valve display, brine line seating, and manual regeneration cycle.",
      confirms: "Manual regeneration fills and draws brine normally.",
      internalNote: "Repeat softener customer. Keep steps concise and avoid re-asking for order details.",
      thread: [
        { type: "customer", ageHours: 74, body: "The WCS45KG brine tank still looks almost empty after startup. I saw your note that some water is normal, but this seems like none." },
        { type: "timeline", author: "System", ageHours: 73.8, body: "Assigned to CS3 Sean." },
        { type: "rep", author: "CS3 Sean", ageHours: 72, body: "Please send a photo of the valve display and the brine line connection at the valve." },
        { type: "customer", ageHours: 58, body: "Photos attached. The display says service, and the brine line is pushed in but I can pull it slightly." },
        { type: "timeline", author: "System", ageHours: 57.8, body: "Attachment received: valve-display-startup.jpg." },
        { type: "note", author: "CS3 Sean", ageHours: 57, body: "Brine line may not be fully seated. Ask customer to reseat before manual regen." },
        { type: "rep", author: "CS3 Sean", ageHours: 54, body: "Please push the brine line firmly into the fitting until it bottoms out, then start a manual regeneration." },
        { type: "customer", ageHours: 28, body: "After regeneration, I see some water now. It pulled down during the cycle, so I think it is working." },
        { type: "rep", author: "CS3 Sean", ageHours: 26, body: "That behavior sounds correct. Please monitor one more regeneration cycle and tell us if the level fails to change." },
        { type: "timeline", author: "System", ageHours: 25, body: "Status changed to Open." }
      ]
    }),
    buildLongThreadTicket({
      id: "ISP-28613",
      subject: "UVF55FS ballast and lamp troubleshooting",
      customer: "Marisol Vega",
      email: "marisol.vega@example.com",
      phone: "210-555-0180",
      model: "UVF55FS",
      family: "UV",
      source: "Phone",
      assignee: "CS1 Nick",
      status: "Pending Parts",
      priority: "High",
      ageHours: 80,
      dueInHours: 18,
      tags: ["long-thread", "uv", "ballast", "replacement-parts"],
      missing: [],
      order: "HD-441902",
      warranty: "Needs receipt",
      receipt: false,
      previousTickets: ["ISP-28496 ballast alarm"],
      attachments: [attachment("ballast-label-closeup.jpg", "serial photo", "May 6"), attachment("lamp-pin-photo.jpg", "troubleshooting photo", "May 7")],
      issue: "Ballast or lamp failure after reseating lamp pins",
      firstTest: "Confirm lamp pins are seated and label matches UVF55FS ballast.",
      confirms: "Known-good lamp or replacement ballast clears alarm.",
      internalNote: "Lamp may be consumable; ballast exception approved after label review.",
      partsSent: true,
      thread: [
        { type: "customer", ageHours: 80, body: "The UVF55FS alarm still sounds after I reseated the lamp. The lamp does not glow." },
        { type: "timeline", author: "System", ageHours: 79.8, body: "Assigned to CS1 Nick." },
        { type: "rep", author: "CS1 Nick", ageHours: 78, body: "Please unplug the system, reseat the lamp pins, and send photos of the lamp connector and ballast label." },
        { type: "customer", ageHours: 54, body: "Photos attached. I reseated it twice. The alarm comes back within a few seconds." },
        { type: "timeline", author: "System", ageHours: 53.8, body: "Attachments received: ballast-label-closeup.jpg, lamp-pin-photo.jpg." },
        { type: "note", author: "CS1 Nick", ageHours: 52, body: "Pins look seated. Ballast label matches UVF55FS. Receipt missing; check warranty before replacement language." },
        { type: "rep", author: "CS1 Nick", ageHours: 49, body: "The connection looks correct. Please send proof of purchase so we can review whether a replacement ballast is covered." },
        { type: "customer", ageHours: 22, body: "I do not have the receipt handy, but this is less than a year old." },
        { type: "timeline", author: "System", ageHours: 20, body: "Replacement ballast exception approved by CS14 Robert." },
        { type: "timeline", author: "System", ageHours: 19.8, body: "Parts sent and follow-up due after delivery." },
        { type: "rep", author: "CS1 Nick", ageHours: 19, body: "We are sending a replacement ballast as an exception. Please keep the lamp and sleeve installed until the replacement arrives." }
      ]
    }),
    buildLongThreadTicket({
      id: "ISP-28612",
      subject: "WSP50ARB low flow after sediment clogging",
      customer: "Nora Williams",
      email: "nora.williams@example.com",
      phone: "602-555-0161",
      model: "WSP50ARB",
      family: "Sediment",
      source: "Email",
      assignee: "CS3 Sean",
      status: "Resolved",
      priority: "Normal",
      ageHours: 86,
      dueInHours: 0,
      tags: ["long-thread", "wsp50arb", "sediment", "replacement-parts"],
      missing: [],
      order: "IS-87229",
      warranty: "Registered",
      receipt: true,
      previousTickets: ["ISP-28495 low flow sediment screen"],
      attachments: [attachment("sediment-screen-packed.jpg", "damage photo", "May 6"), attachment("receipt-is-87229.pdf", "receipt", "May 6")],
      issue: "Sediment screen clogging from heavy load and possible damaged mesh",
      firstTest: "Flush screen, inspect mesh, compare flow before/after spin-down filter.",
      confirms: "Flow returns after cleaning or replacement mesh resolves recurring clog.",
      internalNote: "Replacement screen sent; resolved after customer confirmed flow restored.",
      partsSent: true,
      thread: [
        { type: "customer", ageHours: 86, body: "The WSP50ARB keeps clogging every few days, and the house flow drops until I flush it." },
        { type: "timeline", author: "System", ageHours: 85.8, body: "Assigned to CS3 Sean." },
        { type: "rep", author: "CS3 Sean", ageHours: 84, body: "Please flush the screen fully and send a close-up photo of the mesh after flushing." },
        { type: "customer", ageHours: 63, body: "Photo attached. The mesh has a bent area that still traps sediment." },
        { type: "note", author: "CS3 Sean", ageHours: 62, body: "Screen mesh appears damaged. Receipt registered; replacement screen is reasonable." },
        { type: "timeline", author: "System", ageHours: 61.5, body: "Status changed to Pending Parts." },
        { type: "timeline", author: "System", ageHours: 60, body: "Parts sent and follow-up due after delivery." },
        { type: "rep", author: "CS3 Sean", ageHours: 59, body: "We are sending a replacement screen. After installing it, flush until the bowl runs clear." },
        { type: "customer", ageHours: 14, body: "The new screen is installed and flow is back to normal." },
        { type: "timeline", author: "System", ageHours: 13.5, body: "Status changed to Resolved." }
      ]
    }),
    buildLongThreadTicket({
      id: "ISP-28611",
      subject: "High TDS after membrane change on RCC7AK",
      customer: "Leah Morrison",
      email: "leah.morrison@example.com",
      phone: "813-555-0206",
      model: "RCC7AK",
      family: "Under Sink RO",
      source: "Amazon",
      assignee: lead,
      status: "Open",
      priority: "High",
      ageHours: 52,
      dueInHours: 12,
      tags: ["long-thread", "high-tds", "membrane", "frustrated"],
      missing: ["Needs TDS Readings"],
      order: "113-4465211-2861100",
      warranty: "Registered",
      receipt: true,
      previousTickets: [],
      attachments: [attachment("amazon-membrane-receipt.pdf", "receipt", "May 8"), attachment("tds-meter-reading.jpg", "troubleshooting photo", "May 9")],
      issue: "Membrane not seated, insufficient flush, or TDS creep after membrane change",
      firstTest: "Flush membrane, compare tap/tank/faucet TDS, and confirm membrane orientation.",
      confirms: "TDS drops after flush/reseat or readings isolate membrane bypass.",
      internalNote: "Frustrated tone. Do not promise membrane defect until flush and readings are confirmed.",
      thread: [
        { type: "customer", ageHours: 52, body: "I changed the membrane and now my TDS is higher than before. Tap is 420 and RO is reading 170." },
        { type: "timeline", author: "System", ageHours: 51.8, body: "Assigned to CS14 Robert." },
        { type: "rep", ageHours: 50, body: "Please flush the new membrane for at least one full tank and send readings for tap water, tank water, and faucet water." },
        { type: "customer", ageHours: 34, body: "I flushed two tanks. It is still 150-170. This is very frustrating because the old membrane was better." },
        { type: "timeline", author: "System", ageHours: 33.8, body: "Attachment received: tds-meter-reading.jpg." },
        { type: "note", author: lead, ageHours: 33, body: "Need isolate tank vs membrane output. Possible membrane not fully seated or TDS creep." },
        { type: "rep", ageHours: 30, body: "I understand the frustration. Please bypass the tank reading by testing the first cup directly after the system starts producing, then test again after 5 minutes." },
        { type: "customer", ageHours: 11, body: "First cup is high, after five minutes it dropped to 38. Is that normal?" },
        { type: "rep", ageHours: 9, body: "That pattern sounds like TDS creep from sitting water rather than failed rejection. Please test after the system has been running for several minutes and compare that number." }
      ]
    }),
    buildLongThreadTicket({
      id: "ISP-28610",
      subject: "RO tank not filling and replacement tank sent",
      customer: "Trevor Kim",
      email: "trevor.kim@example.com",
      phone: "206-555-0202",
      model: "RCC7P-AK",
      family: "Under Sink RO",
      source: "iSpring direct",
      assignee: "CS5 Michelle",
      status: "Pending Parts",
      priority: "High",
      ageHours: 90,
      dueInHours: 16,
      tags: ["long-thread", "tank-not-filling", "replacement-parts", "warranty"],
      missing: [],
      order: "IS-91020",
      warranty: "Registered",
      receipt: true,
      previousTickets: [],
      attachments: [attachment("ispring-receipt-91020.pdf", "receipt", "May 5"), attachment("tank-valve-video.mov", "troubleshooting video", "May 7")],
      issue: "Tank bladder or valve fault after pressure/flow tests",
      firstTest: "Confirm empty tank pressure, valve position, and production line flow.",
      confirms: "Tank fails after correct pressure and confirmed production flow.",
      internalNote: "Replacement tank approved after video showed production flow but tank not accepting water.",
      partsSent: true,
      thread: [
        { type: "customer", ageHours: 90, body: "The RO tank is still empty after overnight. I checked the feed valve and filters." },
        { type: "timeline", author: "System", ageHours: 89.8, body: "Assigned to CS5 Michelle." },
        { type: "rep", author: "CS5 Michelle", ageHours: 88, body: "Please drain the tank, check empty tank pressure, and send a short video showing water from the production line before the tank." },
        { type: "customer", ageHours: 67, body: "Pressure is 8 PSI empty. The video shows water coming from the line, but the tank stays light." },
        { type: "note", author: "CS5 Michelle", ageHours: 66.5, body: "Production flow confirmed and tank pressure corrected. Possible tank valve/bladder fault." },
        { type: "timeline", author: "System", ageHours: 66, body: "Warranty receipt verified: ispring-receipt-91020.pdf." },
        { type: "rep", author: "CS5 Michelle", ageHours: 62, body: "Thanks. Since production flow is confirmed and tank pressure is correct, we are reviewing the tank under warranty." },
        { type: "timeline", author: "System", ageHours: 58, body: "Replacement tank approved by CS14 Robert." },
        { type: "timeline", author: "System", ageHours: 57.5, body: "Parts sent and follow-up due after delivery." },
        { type: "rep", author: "CS5 Michelle", ageHours: 56, body: "A replacement tank is being sent. Please keep the current tank installed until the replacement arrives so we can compare behavior." },
        { type: "customer", ageHours: 18, body: "Thank you. I will update once the replacement arrives." }
      ]
    }),
    buildLongThreadTicket({
      id: "ISP-28609",
      subject: "Tankless RO low flow and filter bay leak after replacement",
      customer: "Renee Alvarez",
      email: "renee.alvarez@example.com",
      phone: "559-555-0208",
      model: "RO500AK",
      family: "Tankless RO",
      source: "Walmart",
      assignee: "CS1 Nick",
      status: "Open",
      priority: "Urgent",
      ageHours: 46,
      dueInHours: 6,
      tags: ["long-thread", "tankless", "low-flow", "leak"],
      missing: ["Needs Photos"],
      order: "WM-28609",
      warranty: "Needs receipt",
      receipt: false,
      previousTickets: [],
      attachments: [attachment("filter-bay-water.jpg", "leak photo", "May 9")],
      issue: "Filter cartridge seating or O-ring leak causing low flow",
      firstTest: "Shut off feed water, reseat filters, inspect O-rings, and confirm display error.",
      confirms: "Leak stops after reseating or damaged O-ring/filter is identified.",
      internalNote: "Urgent leak; safety first. Receipt missing for warranty review.",
      thread: [
        { type: "customer", ageHours: 46, body: "After changing RO500AK filters, flow is low and I see water in the filter bay." },
        { type: "timeline", author: "System", ageHours: 45.8, body: "Assigned to CS1 Nick." },
        { type: "rep", author: "CS1 Nick", ageHours: 45, body: "Please shut off the feed water first. Then send a photo of the filter bay and confirm which filters were replaced." },
        { type: "customer", ageHours: 31, body: "Photo attached. It looks like water is coming from the left cartridge." },
        { type: "timeline", author: "System", ageHours: 30.8, body: "Attachment received: filter-bay-water.jpg." },
        { type: "note", author: "CS1 Nick", ageHours: 30, body: "Leak appears near cartridge seal. Need O-ring/photo of removed filter before replacement." },
        { type: "rep", author: "CS1 Nick", ageHours: 27, body: "Please remove and reseat the left cartridge, making sure it locks fully. If the O-ring is twisted or nicked, send a close-up photo." },
        { type: "customer", ageHours: 7, body: "Reseating stopped the leak. Flow is still lower than before though." },
        { type: "rep", author: "CS1 Nick", ageHours: 5, body: "Good news on the leak. For flow, please run the rinse cycle fully and check whether the display shows any filter warning." }
      ]
    }),
    buildLongThreadTicket({
      id: "ISP-28608",
      subject: "Whole-house manganese case with water test follow-up",
      customer: "Oak Ridge Cabin Supply",
      email: "service@oakridge.example.com",
      phone: "865-555-0142",
      model: "WGB32BM",
      family: "Whole House",
      source: "Web Form",
      assignee: "CS2 Julius",
      status: "Waiting Customer",
      priority: "High",
      ageHours: 72,
      dueInHours: 22,
      tags: ["long-thread", "manganese", "water-test", "internal-note"],
      missing: ["Needs Water Test"],
      order: "IS-88402",
      warranty: "Needs registration",
      receipt: false,
      previousTickets: ["ISP-28498 manganese still showing"],
      attachments: [attachment("raw-water-test.pdf", "water test", "May 6"), attachment("treated-sample-photo.jpg", "water photo", "May 8")],
      issue: "Manganese may exceed media limit or require pre-treatment",
      firstTest: "Compare raw/treated manganese and confirm flow rate and pH.",
      confirms: "Treated test confirms whether media is reducing manganese within expected limits.",
      internalNote: "Good long water-test readability case; no customer-facing policy promises.",
      thread: [
        { type: "customer", ageHours: 72, body: "Our WGB32BM reduced staining for a few weeks, but the manganese stains are back." },
        { type: "timeline", author: "System", ageHours: 71.8, body: "Assigned to CS2 Julius." },
        { type: "rep", author: "CS2 Julius", ageHours: 70, body: "Please send both raw and treated water test results, plus your estimated peak flow rate." },
        { type: "customer", ageHours: 50, body: "Raw test is attached. Treated sample photo shows some brown tint, but I do not have treated lab numbers yet." },
        { type: "timeline", author: "System", ageHours: 49.8, body: "Attachment received: raw-water-test.pdf." },
        { type: "note", author: "CS2 Julius", ageHours: 49, body: "Raw manganese appears high. Need treated lab result before media conclusion." },
        { type: "rep", author: "CS2 Julius", ageHours: 45, body: "The raw test helps. We still need treated manganese numbers after the system to understand how much reduction is happening." },
        { type: "customer", ageHours: 20, body: "The lab can run treated water tomorrow. Should we stop using the system?" },
        { type: "rep", author: "CS2 Julius", ageHours: 18, body: "You can continue using it unless there is a pressure or leak issue. The test will help determine whether pre-treatment or flow adjustment is needed." },
        { type: "timeline", author: "System", ageHours: 17.5, body: "Status changed to Waiting Customer." }
      ]
    }),
    buildLongThreadTicket({
      id: "ISP-28607",
      subject: "Replacement faucet sent after damaged RCC7AK part",
      customer: "Avery Coleman",
      email: "avery.coleman@example.com",
      phone: "614-555-0220",
      model: "RCC7AK",
      family: "Under Sink RO",
      source: "iSpring direct",
      assignee: "CS5 Michelle",
      status: "Resolved",
      priority: "Normal",
      ageHours: 82,
      dueInHours: 0,
      tags: ["long-thread", "replacement-parts", "damaged-part", "resolved"],
      missing: [],
      order: "IS-91107",
      warranty: "Registered",
      receipt: true,
      previousTickets: [],
      attachments: [attachment("receipt-is-91107.pdf", "receipt", "May 5"), attachment("damaged-faucet-photo.jpg", "damage photo", "May 6")],
      issue: "Damaged faucet accessory confirmed before installation",
      firstTest: "Confirm damage photo and faucet finish.",
      confirms: "Replacement faucet arrives and customer confirms install.",
      internalNote: "Clean/simple long thread with parts sent and resolved.",
      partsSent: true,
      thread: [
        { type: "customer", ageHours: 82, body: "The faucet in my RCC7AK box has a dent before I installed anything." },
        { type: "timeline", author: "System", ageHours: 81.8, body: "Assigned to CS5 Michelle." },
        { type: "rep", author: "CS5 Michelle", ageHours: 80, body: "Please send a photo of the faucet damage and your order confirmation." },
        { type: "customer", ageHours: 64, body: "Both are attached. The faucet is brushed nickel." },
        { type: "timeline", author: "System", ageHours: 63.8, body: "Attachments received: receipt-is-91107.pdf, damaged-faucet-photo.jpg." },
        { type: "note", author: "CS5 Michelle", ageHours: 63, body: "Receipt verified. Damage confirmed before install. Send brushed nickel faucet." },
        { type: "timeline", author: "System", ageHours: 60, body: "Parts sent and follow-up due after delivery." },
        { type: "rep", author: "CS5 Michelle", ageHours: 59, body: "We are sending a brushed nickel replacement faucet. You can continue the rest of the installation when it arrives." },
        { type: "customer", ageHours: 16, body: "Replacement arrived and looks good. Thank you." },
        { type: "timeline", author: "System", ageHours: 15.5, body: "Status changed to Resolved." }
      ]
    }),
    buildLongThreadTicket({
      id: "ISP-28606",
      subject: "Warranty receipt verified and registration completed",
      customer: "Mina Shah",
      email: "mina.shah@example.com",
      phone: "312-555-0211",
      model: "RO500AK",
      family: "Warranty",
      source: "Amazon",
      assignee: lead,
      status: "Closed",
      priority: "Low",
      ageHours: 120,
      dueInHours: 0,
      tags: ["long-thread", "warranty", "receipt", "closed"],
      missing: [],
      order: "113-4465211-2860600",
      warranty: "Registered",
      receipt: true,
      previousTickets: [],
      attachments: [attachment("amazon-ro500ak-invoice.pdf", "receipt", "May 4")],
      issue: "Warranty registration completed after receipt verification",
      firstTest: "Verify seller, date, model, and customer email.",
      confirms: "Receipt is accepted and warranty registration is recorded.",
      internalNote: "Clean warranty activity case for customer history receipt/warranty testing.",
      thread: [
        { type: "customer", ageHours: 120, body: "Can you confirm whether my RO500AK warranty registration went through? I uploaded the Amazon invoice." },
        { type: "timeline", author: "System", ageHours: 119.8, body: "Assigned to CS14 Robert." },
        { type: "timeline", author: "System", ageHours: 119.6, body: "System detected possible purchase source from attachment: Amazon. Needs rep review." },
        { type: "rep", ageHours: 118, body: "I can check. Please confirm the email you want tied to the warranty record." },
        { type: "customer", ageHours: 98, body: "Use this email address. The invoice is attached to the ticket." },
        { type: "timeline", author: "System", ageHours: 97.8, body: "Receipt verified: amazon-ro500ak-invoice.pdf." },
        { type: "note", author: lead, ageHours: 97, body: "Receipt shows eligible seller/date/model. Register warranty under customer email." },
        { type: "timeline", author: "System", ageHours: 96, body: "Warranty registered by CS14 Robert." },
        { type: "rep", ageHours: 94, body: "Your RO500AK warranty registration is complete under this email address." },
        { type: "timeline", author: "System", ageHours: 93.8, body: "Status changed to Closed." }
      ]
    })
  ];
}

function attachment(file, type, uploaded, uploadedBy = "Customer", metadata = {}) {
  return { file, type, uploaded, uploadedBy, ...metadata };
}

function receiptTestFixtures() {
  return [
    { id: "ISP-29001", customer: "Maya Patel", email: "maya.patel@example.com", phone: "678-555-0201", source: "Amazon", fileName: "amazon-receipt-113-4409001-1001901-rcc7p-ak.pdf", fileType: "PDF", order: "113-4409001-1001901", model: "RCC7P-AK", family: "Under Sink RO", purchaseDate: "2026-03-12", receiptTotal: "$229.99", assignee: "CS14 Robert", subject: "RCC7P-AK Amazon receipt warranty verification" },
    { id: "ISP-29002", customer: "Trevor Kim", email: "trevor.kim@example.com", phone: "206-555-0202", source: "iSpring direct", fileName: "ispring-direct-invoice-is-29002-ro500ak.pdf", fileType: "PDF", order: "IS-29002", model: "RO500AK", family: "Tankless RO", purchaseDate: "2026-03-14", receiptTotal: "$499.00", assignee: "CS1 Nick", subject: "RO500AK iSpring receipt linked to account" },
    { id: "ISP-29003", customer: "Grace Holloway", email: "grace.holloway@example.com", phone: "617-555-0203", source: "Home Depot", fileName: "home-depot-receipt-hd-29003-wgb32b.pdf", fileType: "PDF", order: "HD-29003", model: "WGB32B", family: "Whole House", purchaseDate: "2026-03-16", receiptTotal: "$412.37", assignee: "CS2 Julius", subject: "WGB32B Home Depot receipt review" },
    { id: "ISP-29004", customer: "Santos Family Cabin", email: "santos.cabin@example.com", phone: "720-555-0204", source: "Lowe's", fileName: "lowes-receipt-low-29004-wsp50arb.png", fileType: "PNG", order: "LOW-29004", model: "WSP50ARB", family: "Sediment", purchaseDate: "2026-03-17", receiptTotal: "$86.42", assignee: "CS3 Sean", subject: "WSP50ARB Lowe's receipt screenshot attached" },
    { id: "ISP-29005", customer: "Willow Bend Dental", email: "ops@willowbend.example.com", phone: "214-555-0205", source: "Walmart", fileName: "walmart-order-wm-29005-uvf55fs.jpg", fileType: "JPG", order: "WM-29005", model: "UVF55FS", family: "UV", purchaseDate: "2026-03-19", receiptTotal: "$248.10", assignee: "CS4 Jonathan", subject: "UVF55FS Walmart order screenshot for warranty" },
    { id: "ISP-29006", customer: "Leah Morrison", email: "leah.morrison@example.com", phone: "813-555-0206", source: "Amazon", fileName: "amazon-invoice-113-4409006-1001918-rcc7ak.pdf", fileType: "PDF", order: "113-4409006-1001918", model: "RCC7AK", family: "Under Sink RO", purchaseDate: "2026-03-21", receiptTotal: "$199.95", assignee: "CS5 Michelle", subject: "RCC7AK Amazon receipt on file" },
    { id: "ISP-29007", customer: "Franklin Groves", email: "fgroves@example.com", phone: "513-555-0207", source: "iSpring direct", fileName: "ispring-order-is-29007-wcs45kg.pdf", fileType: "PDF", order: "IS-29007", model: "WCS45KG", family: "Water Softener", purchaseDate: "2026-03-22", receiptTotal: "$739.00", assignee: "CS1 Nick", subject: "WCS45KG iSpring direct invoice saved" },
    { id: "ISP-29008", customer: "Renee Alvarez", email: "renee.alvarez@example.com", phone: "559-555-0208", source: "Home Depot", fileName: "home-depot-invoice-hd-29008-ro500ak.pdf", fileType: "PDF", order: "HD-29008", model: "RO500AK", family: "Tankless RO", purchaseDate: "2026-03-24", receiptTotal: "$521.64", assignee: "CS2 Julius", subject: "RO500AK Home Depot PDF receipt" },
    { id: "ISP-29009", customer: "Blue Ridge Rentals", email: "maintenance@blueridge.example.com", phone: "828-555-0209", source: "Lowe's", fileName: "lowes-order-low-29009-wgb32bm-screenshot.jpg", fileType: "JPG", order: "LOW-29009", model: "WGB32BM", family: "Whole House", purchaseDate: "2026-03-25", receiptTotal: "$604.18", assignee: "CS3 Sean", subject: "WGB32BM Lowe's screenshot proof of purchase" },
    { id: "ISP-29010", customer: "Carter Nguyen", email: "carter.nguyen@example.com", phone: "415-555-0210", source: "Walmart", fileName: "walmart-receipt-wm-29010-rcc7p-ak.png", fileType: "PNG", order: "WM-29010", model: "RCC7P-AK", family: "Under Sink RO", purchaseDate: "2026-03-27", receiptTotal: "$236.78", assignee: "CS4 Jonathan", subject: "RCC7P-AK Walmart receipt screenshot" },
    { id: "ISP-29011", customer: "Mina Shah", email: "mina.shah@example.com", phone: "312-555-0211", source: "Amazon", fileName: "amazon-receipt-113-4409011-1001933-ro500ak.pdf", fileType: "PDF", order: "113-4409011-1001933", model: "RO500AK", family: "Tankless RO", purchaseDate: "2026-03-29", receiptTotal: "$489.50", assignee: "CS5 Michelle", subject: "RO500AK Amazon invoice verified" },
    { id: "ISP-29012", customer: "Josephine Clarke", email: "josephine.clarke@example.com", phone: "718-555-0212", source: "iSpring direct", fileName: "ispring-invoice-is-29012-wgb32b.pdf", fileType: "PDF", order: "IS-29012", model: "WGB32B", family: "Whole House", purchaseDate: "2026-03-30", receiptTotal: "$399.00", assignee: "CS14 Robert", subject: "WGB32B iSpring invoice attached" },
    { id: "ISP-29013", customer: "Westfield Coffee Lab", email: "service@westfieldcoffee.example.com", phone: "317-555-0213", source: "Home Depot", fileName: "home-depot-receipt-hd-29013-wcs45kg.pdf", fileType: "PDF", order: "HD-29013", model: "WCS45KG", family: "Water Softener", purchaseDate: "2026-04-01", receiptTotal: "$762.33", assignee: "CS1 Nick", subject: "WCS45KG Home Depot receipt saved" },
    { id: "ISP-29014", customer: "Noah Bennett", email: "noah.bennett@example.com", phone: "757-555-0214", source: "Lowe's", fileName: "lowes-receipt-low-29014-uvf55fs.png", fileType: "PNG", order: "LOW-29014", model: "UVF55FS", family: "UV", purchaseDate: "2026-04-03", receiptTotal: "$259.89", assignee: "CS2 Julius", subject: "UVF55FS Lowe's image receipt" },
    { id: "ISP-29015", customer: "Talia Brooks", email: "talia.brooks@example.com", phone: "303-555-0215", source: "Walmart", fileName: "walmart-order-wm-29015-wsp50arb.jpg", fileType: "JPG", order: "WM-29015", model: "WSP50ARB", family: "Sediment", purchaseDate: "2026-04-04", receiptTotal: "$92.16", assignee: "CS3 Sean", subject: "WSP50ARB Walmart screenshot received" },
    { id: "ISP-29016", customer: "Evan Mercer", email: "evan.mercer@example.com", phone: "503-555-0216", source: "Amazon", fileName: "amazon-invoice-113-4409016-1001948-wgb32bm.pdf", fileType: "PDF", order: "113-4409016-1001948", model: "WGB32BM", family: "Whole House", purchaseDate: "2026-04-06", receiptTotal: "$589.20", assignee: "CS4 Jonathan", subject: "WGB32BM Amazon receipt for registration" },
    { id: "ISP-29017", customer: "Garden Gate HOA", email: "water@gardengate.example.com", phone: "904-555-0217", source: "iSpring direct", fileName: "ispring-direct-receipt-is-29017-uvf55fs.pdf", fileType: "PDF", order: "IS-29017", model: "UVF55FS", family: "UV", purchaseDate: "2026-04-07", receiptTotal: "$244.00", assignee: "CS5 Michelle", subject: "UVF55FS iSpring direct receipt" },
    { id: "ISP-29018", customer: "Priya Raman", email: "priya.raman@example.com", phone: "408-555-0218", source: "Home Depot", fileName: "home-depot-order-hd-29018-rcc7ak.pdf", fileType: "PDF", order: "HD-29018", model: "RCC7AK", family: "Under Sink RO", purchaseDate: "2026-04-09", receiptTotal: "$214.47", assignee: "CS14 Robert", subject: "RCC7AK Home Depot PDF receipt" },
    { id: "ISP-29019", customer: "Marcus Reed", email: "marcus.reed@example.com", phone: "901-555-0219", source: "Lowe's", fileName: "lowes-screenshot-low-29019-ro500ak.jpg", fileType: "JPG", order: "LOW-29019", model: "RO500AK", family: "Tankless RO", purchaseDate: "2026-04-10", receiptTotal: "$518.74", assignee: "CS1 Nick", subject: "RO500AK Lowe's receipt image" },
    { id: "ISP-29020", customer: "Avery Coleman", email: "avery.coleman@example.com", phone: "614-555-0220", source: "Walmart", fileName: "walmart-receipt-wm-29020-rcc7p-ak.png", fileType: "PNG", order: "WM-29020", model: "RCC7P-AK", family: "Under Sink RO", purchaseDate: "2026-04-12", receiptTotal: "$231.58", assignee: "CS2 Julius", subject: "RCC7P-AK Walmart proof of purchase" }
  ];
}

function receiptAttachmentFromFixture(fixture) {
  const normalizedType = String(fixture.fileType || "").toUpperCase();
  const isImage = ["PNG", "JPG", "JPEG"].includes(normalizedType);
  return attachment(fixture.fileName, "receipt", "May 10", fixture.customer, {
    fileType: fixture.fileType,
    mimeType: isImage ? normalizedType === "PNG" ? "image/png" : "image/jpeg" : "application/pdf",
    source: fixture.source,
    orderNumber: fixture.order,
    model: fixture.model,
    customerName: fixture.customer,
    customerEmail: fixture.email,
    purchaseDate: fixture.purchaseDate,
    receiptTotal: fixture.receiptTotal,
    status: "Verified"
  });
}

function generateReceiptTestTickets() {
  return receiptTestFixtures().map((fixture, index) => buildTicket({
    id: fixture.id,
    subject: fixture.subject,
    customer: fixture.customer,
    email: fixture.email,
    phone: fixture.phone,
    model: fixture.model,
    family: fixture.family,
    source: fixture.source,
    purchaseSource: fixture.source,
    purchaseSourceMode: "manual",
    assignee: fixture.assignee,
    status: index % 5 === 0 ? "Closed" : "Open",
    priority: index % 4 === 0 ? "High" : "Normal",
    ageHours: 20 + index * 2,
    dueInHours: 18 + index,
    tags: ["receipt", "warranty", slugify(fixture.source), slugify(fixture.model)],
    missing: [],
    order: fixture.order,
    warranty: index % 3 === 0 ? "Needs registration" : "Registered",
    receipt: true,
    previousTickets: [],
    attachments: [receiptAttachmentFromFixture(fixture)],
    issue: "Receipt proof of purchase verification",
    firstTest: "Open receipt preview and confirm seller, model, order number, and purchase date.",
    confirms: "Receipt details match the customer account and ticket model.",
    customerMessage: `Please attach this ${fixture.source} receipt to my ${fixture.model} account history.`,
    repReply: "Thanks. The receipt is on file and linked to this customer history.",
    internalNote: `Receipt test case: ${fixture.fileName} / ${fixture.order} / ${fixture.receiptTotal}.`
  }));
}

function ensureReceiptTestTickets(sourceTickets) {
  if (!Array.isArray(sourceTickets)) return false;
  const existingIds = new Set(sourceTickets.map((ticket) => ticket.id));
  const missing = generateReceiptTestTickets().filter((ticket) => !existingIds.has(ticket.id));
  if (!missing.length) return false;
  sourceTickets.push(...missing);
  return true;
}

function generateFreshDemoTickets() {
  return [
    buildTicket({
      id: "ISP-29101",
      subject: "WGB32B low pressure throughout house after install",
      customer: "Devin Walsh",
      email: "devin.walsh@example.com",
      phone: "503-555-0241",
      model: "WGB32B",
      family: "Whole House",
      source: "Home Depot",
      assignee: "CS2 Julius",
      status: "Open",
      priority: "High",
      ageHours: 14,
      dueInHours: 9,
      tags: ["whole-house", "pressure-drop", "install"],
      missing: [],
      order: "HD-441231",
      warranty: "Registered",
      receipt: true,
      previousTickets: [],
      attachments: [attachment("wgb32b-install.jpg", "install photo", "Jun 14")],
      issue: "Sediment/carbon restriction or bypass setting after install",
      firstTest: "Put the system in bypass and compare inlet/outlet pressure.",
      confirms: "Pressure recovers in bypass or the readings isolate the restricted stage.",
      customerMessage: "Ever since the WGB32B went in, water pressure is low at every faucet upstairs.",
      repReply: "Thanks Devin. Please set the unit to bypass and tell me whether pressure returns, then send a photo of the inlet and outlet gauges.",
      internalNote: "Receipt on file. Confirm the bypass test before suggesting a pre-filter."
    }),
    buildTicket({
      id: "ISP-29102",
      subject: "RO500AK slow to fill and low flow after filter change",
      customer: "Priya Anand",
      email: "priya.anand@example.com",
      phone: "408-555-0242",
      model: "RO500AK",
      family: "Tankless RO",
      source: "iSpring direct",
      assignee: "CS1 Nick",
      status: "Open",
      priority: "Normal",
      ageHours: 30,
      dueInHours: 20,
      tags: ["ro500ak", "tankless", "low-flow"],
      missing: [],
      order: "IS-93142",
      warranty: "Registered",
      receipt: true,
      previousTickets: [],
      attachments: [attachment("ro500ak-display.jpg", "display photo", "Jun 19")],
      issue: "Filter reset/rinse cycle or filter compatibility after replacement",
      firstTest: "Confirm the filter part numbers and run a full reset and rinse cycle.",
      confirms: "Flow returns after a complete rinse or a label mismatch is identified.",
      customerMessage: "After changing the RO500AK filters the flow is weak and it takes a long time to fill a glass.",
      repReply: "Thanks Priya. Please send a photo of the installed filter labels and run a full rinse cycle, then let me know if flow improves.",
      internalNote: "Check that the membrane was not swapped with a sediment cartridge."
    }),
    buildTicket({
      id: "ISP-29103",
      subject: "WCS45KG using too much salt and water still feels hard",
      customer: "Carla Jimenez",
      email: "carla.jimenez@example.com",
      phone: "915-555-0243",
      model: "WCS45KG",
      family: "Water Softener",
      source: "Lowe's",
      assignee: "CS3 Sean",
      status: "Closed, Waiting On Response",
      priority: "Normal",
      ageHours: 40,
      dueInHours: 0,
      tags: ["softener", "regeneration", "salt"],
      missing: [],
      order: "LOW-31188",
      warranty: "Registered",
      receipt: true,
      previousTickets: [],
      attachments: [attachment("wcs45kg-valve.jpg", "valve photo", "Jun 18")],
      issue: "Regeneration timing or salt-dose setting needs review",
      firstTest: "Check the regeneration schedule and salt-dose setting on the valve head.",
      confirms: "Salt use normalizes and hardness drops after the schedule is corrected.",
      customerMessage: "The WCS45KG seems to run through salt very fast and my water still tests hard.",
      repReply: "Let's check the valve settings. Please send a photo of the regeneration schedule screen and a hardness test before and after the unit.",
      internalNote: "Waiting on customer to send the hardness reading; likely an over-frequent regen schedule."
    }),
    buildTicket({
      id: "ISP-29104",
      subject: "UVF55FS ballast alarm will not clear after lamp swap",
      customer: "Theo Nakamura",
      email: "theo.nakamura@example.com",
      phone: "206-555-0244",
      model: "UVF55FS",
      family: "UV",
      source: "Amazon",
      assignee: "CS4 Jonathan",
      status: "Open",
      priority: "Urgent",
      ageHours: 60,
      dueInHours: -6,
      tags: ["uv", "ballast", "alarm"],
      missing: ["Needs Photos"],
      order: "113-5512876-2204117",
      warranty: "Needs review",
      receipt: true,
      previousTickets: [],
      attachments: [attachment("uvf55fs-ballast.jpg", "ballast label", "Jun 17")],
      issue: "Lamp seating or ballast/lamp compatibility after replacement",
      firstTest: "Confirm the lamp pins are seated and match the ballast and model labels.",
      confirms: "Alarm clears after reseating or a known-good lamp isolates the failed part.",
      customerMessage: "I replaced the UV lamp but the ballast alarm keeps beeping and the light stays red.",
      repReply: "Thanks Theo. Please send a clear photo of the lamp pins and the ballast label so we can confirm the right part.",
      internalNote: "Overdue. Verify warranty against the Amazon receipt before approving a ballast replacement."
    }),
    buildTicket({
      id: "ISP-29105",
      subject: "WSP50ARB spin-down housing leaking at the o-ring",
      customer: "Roy Castellano",
      email: "roy.castellano@example.com",
      phone: "702-555-0245",
      model: "WSP50ARB",
      family: "Sediment",
      source: "Home Depot",
      assignee: "CS5 Michelle",
      status: "Open",
      priority: "High",
      ageHours: 20,
      dueInHours: 12,
      tags: ["sediment", "spin-down", "leak"],
      missing: [],
      order: "HD-552901",
      warranty: "Registered",
      receipt: true,
      previousTickets: [],
      attachments: [attachment("wsp50arb-leak.jpg", "leak photo", "Jun 19")],
      issue: "O-ring seating or housing over-tightening on the spin-down filter",
      firstTest: "Depressurize, remove the housing, and inspect the o-ring for nicks or twists.",
      confirms: "Leak stops after the o-ring is reseated or replaced.",
      customerMessage: "There is a steady drip where the clear WSP50ARB housing screws onto the head.",
      repReply: "Thanks Roy. Please shut off the inlet, unscrew the housing, and send a close-up of the o-ring so we can check for damage.",
      internalNote: "Likely a pinched o-ring; have a replacement o-ring ready if the photo shows a nick."
    }),
    buildTicket({
      id: "ISP-29106",
      subject: "RCC7AK warranty registration help, receipt attached",
      customer: "Marina Petrov",
      email: "marina.petrov@example.com",
      phone: "312-555-0246",
      model: "RCC7AK",
      family: "Under Sink RO",
      source: "Amazon",
      assignee: "CS14 Robert",
      status: "Open",
      priority: "Normal",
      ageHours: 18,
      dueInHours: 22,
      tags: ["warranty", "receipt", "registration"],
      missing: [],
      order: "113-6620114-7781902",
      warranty: "Needs registration",
      receipt: true,
      previousTickets: [],
      attachments: [attachment("amazon-receipt-rcc7ak.pdf", "receipt", "Jun 18")],
      issue: "Proof of purchase confirmed; warranty record not yet created",
      firstTest: "Verify the receipt seller, date, and model, then register the warranty.",
      confirms: "Warranty record is created and the customer receives confirmation.",
      customerMessage: "I just installed my RCC7AK and want to register the warranty. My Amazon receipt is attached.",
      repReply: "Thanks Marina. The receipt looks good. I'll register your warranty and send a confirmation shortly.",
      internalNote: "Receipt verified; register warranty against the Amazon order and mark receipt verified."
    }),
    buildTicket({
      id: "ISP-29107",
      subject: "RO500AK arrived damaged from Amazon, requesting replacement",
      customer: "Sam Okafor",
      email: "sam.okafor@example.com",
      phone: "404-555-0247",
      model: "RO500AK",
      family: "Tankless RO",
      source: "Amazon",
      assignee: "CS5 Michelle",
      status: "Open",
      priority: "High",
      ageHours: 10,
      dueInHours: 14,
      tags: ["return", "damaged", "replacement"],
      missing: ["Needs Receipt", "Needs Photos"],
      order: "113-7781290-4410117",
      warranty: "Needs receipt",
      receipt: false,
      previousTickets: [],
      attachments: [],
      issue: "Shipment-damage replacement; proof of purchase and damage photos needed",
      firstTest: "Collect the order number, damage photos, and confirm the Amazon purchase.",
      confirms: "Damage photos plus the order confirm eligibility for a direct replacement.",
      customerMessage: "My RO500AK showed up with a cracked housing. I'd like a replacement sent out.",
      repReply: "I'm sorry about that, Sam. Please send photos of the damage and the packaging, plus your Amazon order confirmation, and we'll get a replacement moving.",
      internalNote: "Amazon source; manager approval needed before a direct replacement. No receipt on file yet."
    }),
    buildTicket({
      id: "ISP-29108",
      subject: "RCC7P-AK review follow-up after resolved leak",
      customer: "Hannah Reyes",
      email: "hannah.reyes@example.com",
      phone: "619-555-0248",
      model: "RCC7P-AK",
      family: "Under Sink RO",
      source: "iSpring direct",
      assignee: "CS1 Nick",
      status: "Closed",
      priority: "Low",
      ageHours: 120,
      dueInHours: 0,
      tags: ["review-follow-up", "resolved"],
      missing: [],
      order: "IS-90551",
      warranty: "Registered",
      receipt: true,
      previousTickets: ["ISP-28499 RCC7P-AK leak at filter bay"],
      attachments: [],
      issue: "Resolved leak; customer confirmed the fix and is review-eligible",
      firstTest: "Confirm the system is operating normally before sending the review link.",
      confirms: "Customer confirms the fix and accepts the review/product link.",
      customerMessage: "Reseating the cartridge fixed the leak completely, thanks for the help.",
      repReply: "Glad to hear it, Hannah. If you have a minute, here is a link to share your experience. Reach out anytime.",
      internalNote: "Closed and resolved. Review link sent; no further action needed."
    }),
    buildTicket({
      id: "ISP-29109",
      subject: "RCC7P-AK faucet dripping after filter replacement",
      customer: "Lior Ben-David",
      email: "lior.bendavid@example.com",
      phone: "646-555-0249",
      model: "RCC7P-AK",
      family: "Under Sink RO",
      source: "Email",
      assignee: "CS3 Sean",
      status: "Open",
      priority: "High",
      ageHours: 80,
      dueInHours: -10,
      tags: ["faucet", "leak", "filter-change"],
      missing: ["Needs Photos"],
      order: "IS-90612",
      warranty: "Registered",
      receipt: true,
      previousTickets: [],
      attachments: [attachment("rcc7p-faucet.jpg", "faucet photo", "Jun 16")],
      issue: "Faucet connection or air-gap drip after a filter service",
      firstTest: "Check the faucet base and tubing connections for a loose fit after the change.",
      confirms: "Drip stops after the connection is reseated or a fitting is corrected.",
      customerMessage: "Since replacing the filters, the RO faucet base drips every few minutes.",
      repReply: "Thanks Lior. Please send a close-up of the faucet base and the connections underneath so we can spot the loose fitting.",
      internalNote: "Overdue. Customer is patient but follow up today with the connection check."
    }),
    buildTicket({
      id: "ISP-29110",
      subject: "WGB32BM manganese staining returning on fixtures",
      customer: "Cassie Monroe",
      email: "cassie.monroe@example.com",
      phone: "919-555-0250",
      model: "WGB32BM",
      family: "Whole House",
      source: "iSpring direct",
      assignee: "CS14 Robert",
      status: "Closed, Waiting On Response",
      priority: "Normal",
      ageHours: 50,
      dueInHours: 0,
      tags: ["manganese", "water-test", "staining"],
      missing: ["Needs Water Test"],
      order: "IS-90733",
      warranty: "Registered",
      receipt: true,
      previousTickets: [],
      attachments: [],
      issue: "Water chemistry may exceed media limits or flow direction may be off",
      firstTest: "Compare raw and treated water tests and confirm the flow direction.",
      confirms: "Correct install plus the treated test shows whether the media is overloaded.",
      customerMessage: "The WGB32BM helped at first but the orange staining is showing up again in the toilet tank.",
      repReply: "Let's compare the numbers, Cassie. Please send a raw and treated water test plus one photo showing the flow-direction arrow.",
      internalNote: "Waiting on water test results to decide media replacement vs. install correction."
    }),
    buildTicket({
      id: "ISP-29111",
      subject: "RCC7AK taste changed after annual filter kit",
      customer: "Derek Lin",
      email: "derek.lin@example.com",
      phone: "510-555-0251",
      model: "RCC7AK",
      family: "Under Sink RO",
      source: "Lowe's",
      assignee: "CS2 Julius",
      status: "Closed",
      priority: "Normal",
      ageHours: 160,
      dueInHours: 0,
      tags: ["taste", "filter-change", "resolved"],
      missing: [],
      order: "LOW-29844",
      warranty: "Registered",
      receipt: true,
      previousTickets: [],
      attachments: [],
      issue: "Carbon taste after a filter change cleared by a longer flush",
      firstTest: "Flush the system for the full recommended time and recheck the taste.",
      confirms: "Taste normalizes after the extended flush.",
      customerMessage: "There was a carbon taste after my annual filter change, but flushing it longer fixed it.",
      repReply: "Perfect, Derek. A longer flush after new carbon is exactly right. Closing this out, reach out if it returns.",
      internalNote: "Resolved by extended flush. Closed."
    }),
    buildTicket({
      id: "ISP-29112",
      subject: "UVF55FS flow sensor light question after power outage",
      customer: "Bianca Foster",
      email: "bianca.foster@example.com",
      phone: "813-555-0252",
      model: "UVF55FS",
      family: "UV",
      source: "Walmart",
      assignee: "CS4 Jonathan",
      status: "Open",
      priority: "Low",
      ageHours: 6,
      dueInHours: 30,
      tags: ["uv", "flow-sensor", "question"],
      missing: ["Needs Receipt"],
      order: "WM-880142",
      warranty: "Needs receipt",
      receipt: false,
      previousTickets: [],
      attachments: [],
      issue: "Flow-sensor indicator behavior after a power interruption",
      firstTest: "Confirm whether the indicator is a normal status light or an active alarm.",
      confirms: "Light is identified as normal status or the alarm condition is isolated.",
      customerMessage: "After a power outage my UVF55FS has a small light on the flow sensor. Is that normal?",
      repReply: "Good question, Bianca. That is usually a status light. Please send a short video of the sensor and any panel lights so I can confirm.",
      internalNote: "Likely normal status indicator. Ask for the Walmart receipt to keep the warranty on file."
    })
  ];
}

function generateAdditionalMockTickets(count) {
  const customers = [
    { name: "Maya Patel", email: "maya.patel@example.com", phone: "678-555-0201" },
    { name: "Trevor Kim", email: "trevor.kim@example.com", phone: "206-555-0202" },
    { name: "Grace Holloway", email: "grace.holloway@example.com", phone: "617-555-0203" },
    { name: "Santos Family Cabin", email: "santos.cabin@example.com", phone: "720-555-0204" },
    { name: "Willow Bend Dental", email: "ops@willowbend.example.com", phone: "214-555-0205" },
    { name: "Leah Morrison", email: "leah.morrison@example.com", phone: "813-555-0206" },
    { name: "Franklin Groves", email: "fgroves@example.com", phone: "513-555-0207" },
    { name: "Renee Alvarez", email: "renee.alvarez@example.com", phone: "559-555-0208" },
    { name: "Blue Ridge Rentals", email: "maintenance@blueridge.example.com", phone: "828-555-0209" },
    { name: "Carter Nguyen", email: "carter.nguyen@example.com", phone: "415-555-0210" },
    { name: "Mina Shah", email: "mina.shah@example.com", phone: "312-555-0211" },
    { name: "Josephine Clarke", email: "josephine.clarke@example.com", phone: "718-555-0212" },
    { name: "Westfield Coffee Lab", email: "service@westfieldcoffee.example.com", phone: "317-555-0213" },
    { name: "Noah Bennett", email: "noah.bennett@example.com", phone: "757-555-0214" },
    { name: "Talia Brooks", email: "talia.brooks@example.com", phone: "303-555-0215" },
    { name: "Evan Mercer", email: "evan.mercer@example.com", phone: "503-555-0216" },
    { name: "Garden Gate HOA", email: "water@gardengate.example.com", phone: "904-555-0217" },
    { name: "Priya Raman", email: "priya.raman@example.com", phone: "408-555-0218" },
    { name: "Marcus Reed", email: "marcus.reed@example.com", phone: "901-555-0219" },
    { name: "Avery Coleman", email: "avery.coleman@example.com", phone: "614-555-0220" },
    { name: "Daniel Foster", email: "daniel.foster@example.com", phone: "646-555-0221" },
    { name: "Harborview Apartments", email: "facilities@harborview.example.com", phone: "206-555-0222" },
    { name: "Sofia Reyes", email: "sofia.reyes@example.com", phone: "915-555-0223" },
    { name: "Cedar Creek Lodge", email: "stay@cedarcreek.example.com", phone: "406-555-0224" },
    { name: "Marcus Whitfield", email: "marcus.whitfield@example.com", phone: "704-555-0225" },
    { name: "Nina Castellano", email: "nina.castellano@example.com", phone: "702-555-0226" },
    { name: "Brightwater Cafe", email: "hello@brightwatercafe.example.com", phone: "503-555-0227" },
    { name: "Omar Haddad", email: "omar.haddad@example.com", phone: "313-555-0228" },
    { name: "Eleanor Pruitt", email: "eleanor.pruitt@example.com", phone: "207-555-0229" },
    { name: "Summit Veterinary", email: "office@summitvet.example.com", phone: "801-555-0230" },
    { name: "Jamal Carter", email: "jamal.carter@example.com", phone: "404-555-0231" },
    { name: "Lindsey Vaughn", email: "lindsey.vaughn@example.com", phone: "615-555-0232" },
    { name: "Pinecrest HOA", email: "board@pinecrest.example.com", phone: "919-555-0233" },
    { name: "Hector Salinas", email: "hector.salinas@example.com", phone: "956-555-0234" },
    { name: "Yuki Tanaka", email: "yuki.tanaka@example.com", phone: "808-555-0235" },
    { name: "Rosewood Bistro", email: "kitchen@rosewoodbistro.example.com", phone: "504-555-0236" }
  ];
  const cases = [
    {
      model: "RCC7P-AK",
      family: "Under Sink RO",
      subjects: ["tank slow to refill", "faucet sputters after filter change", "booster pump humming", "alkaline stage cloudy water", "low pressure at RO faucet", "drain runs constantly", "membrane replacement timing", "TDS creeping up after six months"],
      tags: ["tank-pressure", "under-sink-ro"],
      issue: "Tank pressure, feed valve, or post-filter restriction",
      firstTest: "Drain the tank and check empty tank pressure, then confirm feed valve position.",
      confirms: "Flow returns after pressure correction or valve/tubing restriction is cleared.",
      message: "My RCC7P-AK is not producing as much water as before and the faucet slows down quickly.",
      reply: "Please check the empty tank pressure and send a photo of the tubing under the sink."
    },
    {
      model: "RCC7AK",
      family: "Under Sink RO",
      subjects: ["taste changed after annual filters", "air gap faucet noise", "TDS reading is higher than expected", "leak at canister after filter change", "slow drip from air gap", "noisy fill right after install", "carbon taste returning", "where canister meets head is weeping"],
      tags: ["rcc7ak", "filter-change"],
      issue: "Filter seating, drain line routing, or membrane performance needs confirmation",
      firstTest: "Confirm filter order, flush time, and TDS from source and RO water.",
      confirms: "TDS and taste normalize after flush, reseating, or membrane review.",
      message: "After replacing filters on my RCC7AK, the taste and flow do not seem normal.",
      reply: "Please send source and filtered TDS readings, plus a photo of the filter order."
    },
    {
      model: "RO500AK",
      family: "Tankless RO",
      subjects: ["beeping after filter reset", "display stuck on rinse", "low flow from tankless system", "filter light will not clear", "error code E2 on display", "pump cycling on and off", "no water after power outage", "rinse cycle never finishes"],
      tags: ["ro500ak", "tankless", "reset"],
      issue: "Filter reset/rinse sequence or filter compatibility needs review",
      firstTest: "Confirm filter part numbers, display state, and complete reset/rinse sequence.",
      confirms: "Alert clears or display pattern identifies the next part to review.",
      message: "The RO500AK display is still alerting after I changed filters.",
      reply: "Please send a short video of the display and photos of the installed filter labels."
    },
    {
      model: "WGB32B",
      family: "Whole House",
      subjects: ["whole house pressure dropped", "carbon filter changed and flow is low", "bypass test question", "chlorine taste after install", "sediment in cold lines after install", "flow dropped upstairs only", "fitting weeping at outlet", "do I need a pre-filter"],
      tags: ["whole-house", "pressure-drop"],
      issue: "Sediment/carbon restriction, bypass setting, or install direction issue",
      firstTest: "Run a bypass test and compare inlet/outlet pressure readings.",
      confirms: "Pressure improves in bypass or readings isolate the restricted stage.",
      message: "Since installing the WGB32B, water pressure is lower at several fixtures.",
      reply: "Please put the system in bypass and compare pressure before and after the filters."
    },
    {
      model: "WGB32BM",
      family: "Whole House",
      subjects: ["manganese stain came back", "iron smell after media change", "treated water test still high", "well water staining fixtures", "rotten egg smell in the mornings", "media replacement interval question", "staining in the toilet tank", "flow direction sticker is unclear"],
      tags: ["manganese", "water-test"],
      issue: "Water chemistry may exceed media limits or flow direction may be incorrect",
      firstTest: "Compare raw and treated water tests and confirm flow direction.",
      confirms: "Correct installation plus treated test confirms whether media is overloaded.",
      message: "My WGB32BM helped at first, but stains are showing again.",
      reply: "Please send raw and treated water test results, plus one photo showing the flow direction."
    },
    {
      model: "WCS45KG",
      family: "Water Softener",
      subjects: ["no water in brine tank", "salt bridge suspected", "hard water after regeneration", "startup valve display question", "regeneration runs at the wrong time", "salt usage seems high", "error on the head unit", "water still feels hard"],
      tags: ["softener", "brine"],
      issue: "Startup cycle, brine draw, or salt bridge needs confirmation",
      firstTest: "Check brine line seating, salt bridge, and manual regeneration behavior.",
      confirms: "Brine fills/draws normally after line or salt bridge correction.",
      message: "The WCS45KG is installed but the brine tank level does not look right.",
      reply: "Please send a photo of the valve display and the brine line connection."
    },
    {
      model: "UVF55FS",
      family: "UV",
      subjects: ["ballast alarm after lamp replacement", "UV lamp will not turn on", "flow sensor light question", "quartz sleeve replacement help", "countdown timer reset question", "lamp flickers intermittently", "alarm beeps every few hours", "how often to clean the sleeve"],
      tags: ["uv", "lamp", "ballast"],
      issue: "Lamp seating, ballast label, or consumable part status needs review",
      firstTest: "Confirm lamp pins are seated and match ballast/model labels.",
      confirms: "Alarm clears after reseating or known-good lamp/ballast test isolates the part.",
      message: "The UVF55FS alarm is on and I cannot tell if the lamp is working.",
      reply: "Please send photos of the lamp pins, ballast label, and any alarm lights."
    },
    {
      model: "WSP50ARB",
      family: "Sediment",
      subjects: ["spin-down screen packed with sediment", "auto flush not clearing screen", "low flow after storm", "screen replacement request", "flush handle stiff to turn", "o-ring leak at the housing", "pressure gauge reads zero", "mesh size for fine sediment"],
      tags: ["sediment", "spin-down"],
      issue: "Sediment screen clogging, damaged mesh, or flush cycle issue",
      firstTest: "Flush the screen and compare pressure before and after the spin-down filter.",
      confirms: "Flow returns after flushing or visible screen damage confirms replacement need.",
      message: "The WSP50ARB screen is clogging quickly and pressure drops after heavy sediment.",
      reply: "Please flush the screen and send a clear photo of the mesh condition."
    },
    {
      model: "TBD",
      family: "Warranty",
      subjects: ["warranty registration receipt missing", "need help registering product", "receipt upload status check", "order source verification", "transfer warranty to new owner", "lost original order number", "replacement under warranty claim", "registration confirmation not received"],
      tags: ["warranty", "receipt"],
      issue: "Proof of purchase or model information is missing",
      firstTest: "Collect model, order source, purchase date, and receipt image.",
      confirms: "Receipt and model details are enough to complete registration review.",
      message: "I am trying to register my warranty but I am not sure which receipt to send.",
      reply: "Please send the receipt or order confirmation showing seller, date, and model."
    },
    {
      model: "RCC7P-AK",
      family: "Under Sink RO",
      subjects: ["replacement part review follow-up", "damaged faucet replacement delivered", "check valve replacement request", "review update after resolved case", "wrong part shipped in replacement", "tracking shows delivered but not received", "install help for replacement valve", "follow-up after parts arrived"],
      tags: ["replacement-parts", "review-follow-up"],
      issue: "Replacement part follow-up and customer review timing",
      firstTest: "Confirm part arrived and the system is operating normally.",
      confirms: "Customer confirms fix and can be sent the correct review/product link.",
      message: "The replacement arrived and I want to confirm this is the right part.",
      reply: "Please confirm the part installed correctly and the system is working normally."
    }
  ];
  const sources = ["Amazon", "Home Depot", "iSpring direct", "Lowe's", "Walmart", "eBay", "Unknown"];
  const statuses = ["Open", "Closed, Waiting On Response", "Closed"];
  const reps = ["CS14 Robert", "CS1 Nick", "CS2 Julius", "CS3 Sean", "CS4 Jonathan", "CS5 Michelle"];
  const ticketsByEmail = new Map();
  const assigneeByEmail = new Map();

  return Array.from({ length: count }, (_, index) => {
    const ticketNumber = 28378 - index;
    const customer = customers[index % customers.length];
    const scenario = cases[index % cases.length];
    const source = sources[(index * 3) % sources.length];
    const status = statuses[(index * 5) % statuses.length];
    const priority = seedPriorities[(index * 7) % seedPriorities.length];
    const order = orderForSource(source, ticketNumber);
    const receipt = !["Unknown", "eBay"].includes(source) && index % 4 !== 0;
    const warranty = receipt ? (index % 5 === 0 ? "Needs review" : index % 3 === 0 ? "Needs registration" : "Registered") : "Needs receipt";
    const history = ticketsByEmail.get(customer.email) || [];
    const priorAssignee = assigneeByEmail.get(customer.email);
    const assignee = priorAssignee || reps[index % reps.length];
    if (!priorAssignee) assigneeByEmail.set(customer.email, assignee);
    const subjectPhrase = scenario.subjects[Math.floor(index / cases.length) % scenario.subjects.length];
    const subject = `${scenario.model} ${subjectPhrase}`;
    const missing = [
      !receipt ? "Needs Receipt" : "",
      index % 6 === 0 ? "Needs Photos" : "",
      index % 8 === 0 ? "Needs Water Test" : "",
      index % 11 === 0 ? "Needs Video" : ""
    ].filter(Boolean);
    const attachments = [
      receipt ? attachment(`${source.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "order"}-${ticketNumber}.pdf`, "receipt", "May 8") : null,
      index % 3 === 0 ? attachment(`${scenario.model.toLowerCase()}-${ticketNumber}.jpg`, "install photo", "May 9") : null,
      index % 10 === 0 ? attachment(`water-test-${ticketNumber}.pdf`, "water test", "May 7") : null
    ].filter(Boolean);

    history.unshift(`ISP-${ticketNumber} ${subjectPhrase}`);
    ticketsByEmail.set(customer.email, history.slice(0, 5));

    return buildTicket({
      id: `ISP-${ticketNumber}`,
      subject,
      customer: customer.name,
      email: customer.email,
      phone: customer.phone,
      model: scenario.model,
      family: scenario.family,
      source,
      assignee,
      status,
      priority,
      ageHours: 2 + index * 3,
      dueInHours: status === "Closed" ? 0 : index % 9 === 0 ? -12 - index : 4 + (index % 48),
      tags: [...scenario.tags, source.toLowerCase().replace(/[^a-z0-9]+/g, "-"), status.toLowerCase().replace(/[^a-z0-9]+/g, "-")],
      missing,
      order,
      warranty,
      receipt,
      previousTickets: history.slice(1, 4),
      attachments,
      issue: scenario.issue,
      firstTest: scenario.firstTest,
      confirms: scenario.confirms,
      customerMessage: scenario.message,
      repReply: ["Closed, Waiting On Response", "Closed"].includes(status) ? scenario.reply : "",
      internalNote: `${source} case. Receipt: ${receipt ? "on file" : "missing"}. History count: ${history.length - 1}.`,
      partsSent: scenario.tags.includes("replacement-parts")
    });
  });
}

function alignRepeatCustomerAssignments(sourceTickets) {
  const groups = sourceTickets.reduce((byEmail, ticket) => {
    const email = String(ticket.customer?.email || "").trim().toLowerCase();
    if (!email) return byEmail;
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email).push(ticket);
    return byEmail;
  }, new Map());

  groups.forEach((group) => {
    if (group.length < 2) return;
    const owner = [...group]
      .sort((a, b) => new Date(lastUpdatedAt(b)) - new Date(lastUpdatedAt(a)))
      .find((ticket) => activeAssignmentUsersFromSeed().includes(ticket.assignee))?.assignee;
    if (!owner) return;
    group.forEach((ticket) => {
      if (!ticket.assignee || ticket.assignee === owner || ticketHasClearReassignment(ticket)) return;
      const previousAssignee = ticket.assignee;
      ticket.assignee = owner;
      ticket.conversation.push({
        type: "timeline",
        author: owner,
        timestamp: lastUpdatedAt(ticket),
        body: `Reassigned from ${previousAssignee} to ${owner} for repeat-customer continuity.`
      });
      ticket.aiAssignment = {
        assignedTo: owner,
        assignedAt: lastUpdatedAt(ticket),
        reason: `Assigned to ${owner} based on customer history for ${ticket.customer.email}.`,
        workloadAtAssignment: 0
      };
    });
  });

  return sourceTickets;
}

function activeAssignmentUsersFromSeed() {
  return seedUsers.filter((user) => !user.removed && user.assignmentEligible).map((user) => user.name);
}

function ticketHasClearReassignment(ticket) {
  return visibleThreadMessages(ticket).some((message) => message.type === "timeline" && /reassigned from .* to /i.test(message.body));
}

function orderForSource(source, seed) {
  if (source === "Amazon") return `113-${String(4400000 + seed).slice(-7)}-${String(1000000 + seed * 3).slice(-7)}`;
  if (source === "Home Depot") return `HD-${seed}`;
  if (source === "iSpring direct") return `IS-${seed}`;
  if (source === "Lowe's") return `LOW-${seed}`;
  if (source === "Walmart") return `WM-${seed}`;
  if (source === "eBay") return `EB-${seed}`;
  return "";
}

function checklistFor(ticket) {
  const base = ["Confirm model and order details", "Check warranty and receipt status"];
  return [...base, ...(workspaceConfig.products[ticket.family]?.checklist || ["Capture missing customer information"])];
}

function guardrailsFor(ticket) {
  const conditionalWarnings = workspaceConfig.conditionalGuardrails
    .filter((guardrail) => guardrail.when(ticket))
    .map((guardrail) => guardrail.text);
  return [...conditionalWarnings, ...workspaceConfig.brandGuardrails];
}

function similarFor(ticket) {
  return workspaceConfig.products[ticket.family]?.similarTickets || workspaceConfig.products.Warranty.similarTickets;
}

function detectPurchaseSourceFromTicketConfig(config) {
  return detectPurchaseSourceFromAttachments(config.attachments);
}

function detectPurchaseSource(ticket) {
  return detectPurchaseSourceFromAttachments(ticket.attachments);
}

function isVerifiedPurchaseSource(source) {
  return verifiedPurchaseSources.includes(source);
}

function purchaseSourceFromText(text) {
  const value = String(text || "").toLowerCase();
  if (/amazon|amzn|\b11\d{1,}-\d{4,}-\d{4,}\b/.test(value)) return "Amazon";
  if (/home\s*depot|homedepot|\bhd[-\s]?\d+/i.test(value)) return "Home Depot";
  if (/lowe'?s|lowes/.test(value)) return "Lowe's";
  if (/walmart|wal[-\s]?mart/.test(value)) return "Walmart";
  if (/\bebay\b|e-bay/.test(value)) return "eBay";
  if (/ispringfilter|ispring direct|ispring order|\bis[-\s]?\d+/i.test(value)) return "iSpring direct";
  return "Unknown";
}

function attachmentLooksLikeOrderProof(file) {
  const text = `${file?.file || ""} ${file?.type || ""} ${file?.status || ""}`.toLowerCase();
  return /receipt|invoice|order|confirmation|purchase\s*proof|proof\s*of\s*purchase|order\s*screenshot|seller|receipt\s*screenshot/.test(text);
}

function isReceiptAttachment(file) {
  const text = `${file?.file || ""} ${file?.fileName || ""} ${file?.type || ""} ${file?.fileType || ""}`.toLowerCase();
  return /receipt|invoice|proof[-\s]?of[-\s]?purchase|purchase[-\s]?proof/.test(text);
}

function detectPurchaseSourceFromAttachments(attachments = []) {
  const proofText = (attachments || [])
    .filter(attachmentLooksLikeOrderProof)
    .map((file) => `${file.file || ""} ${file.type || ""} ${file.uploaded || ""}`)
    .join(" ");
  return purchaseSourceFromText(proofText);
}

function detectPurchaseSourceMention(ticket) {
  const text = [
    ticket.purchaseSource,
    ticket.source,
    ticket.order,
    ticket.subject,
    ticket.model,
    ticket.customerMessage,
    ticket.internalNote,
    Array.isArray(ticket.conversation) ? lastCustomerMessage(ticket) : ""
  ]
    .join(" ")
    .toLowerCase();

  return purchaseSourceFromText(text);
}

function normalizeTicketPurchaseSource(ticket) {
  let changed = false;
  const detected = detectPurchaseSourceFromAttachments(ticket.attachments);
  const mention = detectPurchaseSourceMention(ticket);
  const manual = ticket.purchaseSourceMode === "manual";
  if (manual && isVerifiedPurchaseSource(ticket.purchaseSource)) return false;

  if (detected !== "Unknown" && ticket.detectedPurchaseSource !== detected) {
    ticket.detectedPurchaseSource = detected;
    ticket.purchaseSourceMode = "ai-detected";
    changed = true;
  }

  const nextSource = detected !== "Unknown"
    ? "Not verified"
    : mention !== "Unknown"
      ? "Unverified mention"
      : "Unknown";
  if (ticket.purchaseSource !== nextSource) {
    ticket.purchaseSource = nextSource;
    changed = true;
  }

  ticket.conversation = (ticket.conversation || []).map((message) => {
    if (!message || typeof message.body !== "string") return message;
    const body = replaceLegacyRepNamesInText(message.body);
    if (/(?:RepOS Assist|Tessario AI) detected (?:possible )?purchase source(?: from attachment)?:/i.test(body)) {
      const source = purchaseSourceFromText(body);
      const nextBody = detected !== "Unknown"
        ? `System detected possible purchase source from attachment: ${detected}. Needs rep review.`
        : source !== "Unknown"
          ? `Unverified purchase source mention: ${source}. Receipt/order proof needed.`
          : "Attachment uploaded; purchase source needs review.";
      if (nextBody !== message.body) changed = true;
      return { ...message, body: nextBody, author: "System" };
    }
    if (/(?:RepOS Assist|Tessario AI) found saved receipt source:/i.test(body)) {
      const source = purchaseSourceFromText(body);
      const nextBody = source !== "Unknown"
        ? `System detected possible purchase source from saved customer account: ${source}. Needs rep review.`
        : "System detected possible purchase source from saved customer account. Needs rep review.";
      if (nextBody !== message.body) changed = true;
      return { ...message, body: nextBody, author: "System" };
    }
    if (/(?:RepOS Assist|Tessario AI) found receipt already on file/i.test(body)) {
      const nextBody = "System detected receipt already on file for this customer account. Needs rep review.";
      if (nextBody !== message.body) changed = true;
      return { ...message, body: nextBody, author: "System" };
    }
    if (/(?:RepOS Assist|Tessario AI) found registered warranty/i.test(body)) {
      const nextBody = "System detected possible registered warranty on this customer account. Needs rep review.";
      if (nextBody !== message.body) changed = true;
      return { ...message, body: nextBody, author: "System" };
    }
    const normalizedAuthor = normalizeRepName(message.author) || message.author;
    if (body !== message.body || normalizedAuthor !== message.author) changed = true;
    return { ...message, body, author: normalizedAuthor };
  });

  const seenWorkflowReviewEvents = new Set();
  ticket.conversation = (ticket.conversation || []).filter((message) => {
    const body = String(message?.body || "");
    const author = String(message?.author || "");
    const isReviewEvent = message?.type === "timeline" &&
      /(?:RepOS Assist|Tessario AI)/i.test(author) &&
      /(Needs rep review|purchase source needs review)/i.test(body);
    if (!isReviewEvent) return true;
    const key = body.toLowerCase();
    if (seenWorkflowReviewEvents.has(key)) {
      changed = true;
      return false;
    }
    seenWorkflowReviewEvents.add(key);
    return true;
  });

  if (detected !== "Unknown" && !ticket.conversation?.some((message) => /detected possible purchase source from attachment:/i.test(message.body) && message.body.includes(detected))) {
    ticket.conversation.push({
      type: "timeline",
      author: "System",
      timestamp: ticket.createdAt || new Date().toISOString(),
      body: `System detected possible purchase source from attachment: ${detected}. Needs rep review.`
    });
    changed = true;
  }
  return changed;
}

function normalizeTicketStatus(ticket) {
  const previousStatus = ticket.status;
  if (previousStatus === "Escalated") ticket.escalated = true;
  const normalizedStatus = displayStatusFor(previousStatus);
  if (previousStatus === normalizedStatus) return false;
  ticket.status = normalizedStatus;
  return true;
}

function normalizeTicketRepNames(ticket) {
  let changed = false;
  const normalizeField = (object, key) => {
    if (!object || typeof object[key] !== "string") return;
    const normalized = normalizeRepName(object[key]);
    if (normalized && normalized !== object[key]) {
      object[key] = normalized;
      changed = true;
    }
  };
  normalizeField(ticket, "assignee");
  if (ticket.aiAssignment) {
    normalizeField(ticket.aiAssignment, "assignedTo");
    ["reason", "note"].forEach((key) => {
      if (typeof ticket.aiAssignment[key] === "string") {
        const next = replaceLegacyRepNamesInText(ticket.aiAssignment[key]);
        if (next !== ticket.aiAssignment[key]) {
          ticket.aiAssignment[key] = next;
          changed = true;
        }
      }
    });
  }
  ticket.conversation = (ticket.conversation || []).map((message) => {
    if (!message) return message;
    const nextAuthor = normalizeRepName(message.author) || message.author;
    const nextBody = typeof message.body === "string" ? replaceLegacyRepNamesInText(message.body) : message.body;
    if (nextAuthor !== message.author || nextBody !== message.body) changed = true;
    return { ...message, author: nextAuthor, body: nextBody };
  });
  return changed;
}

function normalizeTicketStatusTimelineOwnership(ticket) {
  let changed = false;
  const assignee = normalizeRepName(ticket.assignee) || ticket.assignee || CURRENT_USER;
  ticket.conversation = (ticket.conversation || []).map((message) => {
    if (!message || message.type !== "timeline" || typeof message.body !== "string") return message;
    if (/customer replied;\s*ticket reopened/i.test(message.body)) return message;
    const isStatusChange = /status changed|changed status|moved back to open|reopened|resolved|closed,\s*waiting on response|waiting customer|waiting on response|pending parts|escalated|overdue/i.test(message.body);
    const author = String(message.author || "");
    if (!isStatusChange || !/^(system|tessario ai|repos assist)$/i.test(author)) return message;
    changed = true;
    return { ...message, author: assignee };
  });
  return changed;
}

function normalizeTickets(sourceTickets, options = {}) {
  let changed = false;
  const normalized = sourceTickets.map((ticket) => {
    changed = normalizeTicketRepNames(ticket) || changed;
    changed = normalizeTicketPurchaseSource(ticket) || changed;
    changed = normalizeTicketStatus(ticket) || changed;
    changed = normalizeTicketStatusTimelineOwnership(ticket) || changed;
    return ticket;
  });
  if (changed && options.persist !== false) localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function defaultTicketSeed() {
  return JSON.parse(JSON.stringify(workspaceConfig.tickets));
}

function reopenClosedWaitingTicketsWithCustomerReply() {
  let changed = false;
  tickets.forEach((ticket) => {
    if (!isClosedDisplayStatus(ticket)) return;
    const latest = latestEmailStyleMessage(ticket);
    if (latest?.type !== "customer") return;
    const waitingAt = ticketClosedAt(ticket);
    if (!waitingAt || new Date(latest.timestamp) <= new Date(waitingAt)) return;
    ticket.status = "Open";
    ticket.conversation.push({
      type: "timeline",
      author: "System",
      timestamp: new Date().toISOString(),
      body: "Customer replied; ticket reopened."
    });
    changed = true;
  });
  if (changed) persistTickets();
}

function resetTicketDataFromSeed() {
  tickets = normalizeTickets(defaultTicketSeed());
  selectedTicketIds.clear();
  closingTicketIds.clear();
  pendingStatusChanges.clear();
  selectedTicketId = "";
  queueDebugState.recoveredTickets = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  lastUsedTicketNumber = loadLastUsedTicketNumber(tickets);
}

function ensureUsableTicketData() {
  if (!hasValidTicketData(tickets)) resetTicketDataFromSeed();
  if (!getOpenTickets().length && !hasActiveQueueFilters()) resetTicketDataFromSeed();
}

function getOpenTickets() {
  return tickets.filter(isOpen);
}

function hasActiveQueueFilters() {
  return Boolean(
    filters.global.trim() ||
    filters.queue.trim() ||
    filters.status !== "All statuses"
  );
}

function ticketNumberFromId(value) {
  const id = typeof value === "object" && value ? value.id : value;
  const groups = String(id || "").match(/\d+/g);
  return groups ? Number(groups[groups.length - 1]) || 0 : 0;
}

function ticketDisplayId(value) {
  const ticketNumber = ticketNumberFromId(value);
  return ticketNumber ? `Ticket #${ticketNumber}` : `Ticket #${String(typeof value === "object" && value ? value.id : value || "").trim()}`;
}

function ticketById(ticketId) {
  const key = String(ticketId || "").trim();
  if (!key) return null;
  const exactMatch = tickets.find((ticket) => String(ticket.id) === key);
  if (exactMatch) return exactMatch;
  const ticketNumber = ticketNumberFromId(key);
  return ticketNumber ? tickets.find((ticket) => ticketNumberFromId(ticket) === ticketNumber) || null : null;
}

function selectTicket(ticketId) {
  const ticket = ticketById(ticketId);
  if (!ticket) return null;
  selectedTicketId = ticket.id;
  return ticket;
}

function logTicketNavigation(clickedTicketId, clickedTicketNumber, openedTicket) {
  if (typeof window === "undefined" || !window.TESSARIO_DEBUG_TICKET_NAV) return;
  console.log("ticketClick", {
    clickedTicketId: String(clickedTicketId || ""),
    clickedTicketNumber: clickedTicketNumber || ticketDisplayId(clickedTicketId),
    openedTicketNumber: openedTicket ? ticketDisplayId(openedTicket) : ""
  });
}

function ticketReferenceDisplay(value) {
  return String(value || "").replace(/\b(?:[A-Z]+-)?(\d{5,})\b/g, (_match, number) => `Ticket #${number}`);
}

function timelineDisplayBody(ticket, message) {
  const author = String(message?.author || "");
  let body = replaceLegacyRepNamesInText(ticketReferenceDisplay(statusDisplayText(String(message?.body || "")))).trim();
  if (/(?:tessario ai|repos assist)/i.test(author) || /^(?:RepOS Assist|Tessario AI)\s+/i.test(body)) {
    body = body.replace(/^(?:RepOS Assist|Tessario AI)\s+/i, "").replace(/^detected/i, "System detected");
  }
  if (/^system\s+/i.test(body)) body = body.replace(/^system\s+/i, "");
  return body;
}

function timelineEventMeta(message) {
  const author = String(message?.author || "System");
  const body = String(message?.body || "");
  const text = `${author} ${body}`.toLowerCase();

  if (/(?:tessario ai|repos assist)/i.test(author)) {
    return {
      kind: "system",
      label: "System",
      icon: '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M10.998 3.82599C12.8602 4.45429 14.3295 5.93581 14.9409 7.80551" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path><path d="M2.87101 10.981C2.48391 9.05459 3.0321 7.041 4.3456 5.5766" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path><path d="M13.131 14.443C11.655 15.743 9.63592 16.2743 7.70972 15.8675" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path><path d="M9 5.75C10.105 5.75 11 4.855 11 3.75C11 2.645 10.105 1.75 9 1.75C7.895 1.75 7 2.645 7 3.75C7 4.855 7.895 5.75 9 5.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path><path d="M3.80402 14.75C4.90902 14.75 5.80402 13.855 5.80402 12.75C5.80402 11.645 4.90902 10.75 3.80402 10.75C2.69902 10.75 1.80402 11.645 1.80402 12.75C1.80402 13.855 2.69902 14.75 3.80402 14.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path><path d="M14.196 14.75C15.301 14.75 16.196 13.855 16.196 12.75C16.196 11.645 15.301 10.75 14.196 10.75C13.091 10.75 12.196 11.645 12.196 12.75C12.196 13.855 13.091 14.75 14.196 14.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path></svg>'
    };
  }
  if (/assign|reassign|routed|owner/.test(text)) {
    return {
      kind: "assignment",
      label: author || "System",
      icon: '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M6.25,2.75h-1c-1.105,0-2,.895-2,2V14.25c0,1.105,.895,2,2,2h7.5c1.105,0,2-.895,2-2V4.75c0-1.105-.895-2-2-2h-1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><rect x="6.25" y="1.25" width="5.5" height="3" rx="1" ry="1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></rect></svg>'
    };
  }
  if (/status changed|changed status|closed\.|reopened|resolved|waiting on response|waiting customer|escalated|overdue|pending parts/.test(text)) {
    return {
      kind: "status",
      label: author || "System",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12L8 19" stroke="currentColor" stroke-width="2" fill="none"></path><path d="M8 5L12.0414 12H20" stroke="currentColor" stroke-width="2" fill="none"></path><path d="M22.005 11.995L20 12L20.5 11.9987" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path><path d="M12 2V4V3.5" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path><path d="M2.005 11.995H4.00001H3.5" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path><path d="M12 22V20V20.5" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path><path d="M20.6678 16.9957L18.9289 15.9975L19.3625 16.2464" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path><path d="M17.0007 3.33728L16.0007 5.06933L16.2507 4.63632" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path><path d="M3.34723 6.99573L5.07495 7.99323L4.64193 7.74323" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path><path d="M7.00067 20.6577L8.00067 18.9257L7.75067 19.3587" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path><path d="M17.0084 20.6562L16.0016 18.9223L16.2527 19.3547" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path><path d="M20.6618 6.99414L18.9298 7.99414L19.3628 7.74414" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path><path d="M7.00836 3.33569L8.00586 5.06342L7.75586 4.6304" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path><path d="M3.34137 16.994L5.07343 15.994L4.64041 16.244" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path><path d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path></svg>'
    };
  }
  if (/receipt|warranty|registered|registration|purchase proof|invoice/.test(text)) {
    return {
      kind: "receipt",
      label: author || "System",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.8h8.5L19 7.3v12.9H7V3.8Z"></path><path d="M15 4.2V8h3.7"></path><path d="M9.5 12h5"></path><path d="M9.5 15h3"></path><path d="m14 17.2 1.3 1.3 2.4-2.8"></path></svg>'
    };
  }
  if (/attachment|attachments|uploaded|file|photo|pdf|jpg|jpeg|png|mov/.test(text)) {
    return {
      kind: "attachment",
      label: author || "System",
      icon: '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3.762,14.989l6.074-6.075c.781-.781,2.047-.781,2.828,0l2.586,2.586" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><rect x="2.75" y="2.75" width="12.5" height="12.5" rx="2" ry="2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></rect><circle cx="6.25" cy="7.25" r="1.25" fill="currentColor"></circle></svg>'
    };
  }
  return {
    kind: "system",
    label: author || "System",
    icon: '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M10.998 3.82599C12.8602 4.45429 14.3295 5.93581 14.9409 7.80551" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path><path d="M2.87101 10.981C2.48391 9.05459 3.0321 7.041 4.3456 5.5766" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path><path d="M13.131 14.443C11.655 15.743 9.63592 16.2743 7.70972 15.8675" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path><path d="M9 5.75C10.105 5.75 11 4.855 11 3.75C11 2.645 10.105 1.75 9 1.75C7.895 1.75 7 2.645 7 3.75C7 4.855 7.895 5.75 9 5.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path><path d="M3.80402 14.75C4.90902 14.75 5.80402 13.855 5.80402 12.75C5.80402 11.645 4.90902 10.75 3.80402 10.75C2.69902 10.75 1.80402 11.645 1.80402 12.75C1.80402 13.855 2.69902 14.75 3.80402 14.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path><path d="M14.196 14.75C15.301 14.75 16.196 13.855 16.196 12.75C16.196 11.645 15.301 10.75 14.196 10.75C13.091 10.75 12.196 11.645 12.196 12.75C12.196 13.855 13.091 14.75 14.196 14.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path></svg>'
  };
}

function statusDisplayText(value) {
  return String(value || "")
    .replace(/\bClosed,\s*Waiting On Response\b/g, "__CLOSED_WAITING__")
    .replace(/\bNew\b/g, "Open")
    .replace(/\bWaiting Customer\b/g, "Closed, Waiting On Response")
    .replace(/\bWaiting On Response\b/g, "Closed, Waiting On Response")
    .replace(/\bWaiting iSpring\b/g, "Open")
    .replace(/\bPending Parts\b/g, "Open")
    .replace(/\bEscalated\b/g, "Open")
    .replace(/\bOverdue\b/g, "Open")
    .replace(/\bResolved\b/g, "Closed")
    .replace(/__CLOSED_WAITING__/g, "Closed, Waiting On Response");
}

function highestExistingTicketNumber(sourceTickets = tickets) {
  return sourceTickets.reduce((highest, ticket) => Math.max(highest, ticketNumberFromId(ticket)), 0);
}

function storedValue(primaryKey, legacyKey = "") {
  const primary = localStorage.getItem(primaryKey);
  if (primary !== null || !legacyKey) return primary;
  const legacy = localStorage.getItem(legacyKey);
  if (legacy !== null) localStorage.setItem(primaryKey, legacy);
  return legacy;
}

function storedTicketState() {
  if (localStorage.getItem(STORAGE_KEY) !== null) {
    return { key: STORAGE_KEY, found: true };
  }
  if (localStorage.getItem(LEGACY_STORAGE_KEY) !== null) {
    return { key: LEGACY_STORAGE_KEY, found: true };
  }
  return { key: "none", found: false };
}

function loadLastUsedTicketNumber(sourceTickets) {
  const stored = Number(storedValue(TICKET_COUNTER_STORAGE_KEY, LEGACY_TICKET_COUNTER_STORAGE_KEY));
  const existingHighest = highestExistingTicketNumber(sourceTickets);
  const nextBaseline = Math.max(MIN_TICKET_NUMBER, existingHighest, Number.isFinite(stored) ? stored : 0);
  persistLastUsedTicketNumber(nextBaseline);
  return nextBaseline;
}

function persistLastUsedTicketNumber(value) {
  localStorage.setItem(TICKET_COUNTER_STORAGE_KEY, String(value));
  scheduleBackendSync("lastTicketNumber", value);
}

function nextTicketNumber() {
  const existingNumbers = new Set(tickets.map(ticketNumberFromId).filter(Boolean));
  let nextNumber = Math.max(lastUsedTicketNumber, highestExistingTicketNumber(tickets), MIN_TICKET_NUMBER) + 1;
  while (existingNumbers.has(nextNumber)) nextNumber += 1;
  lastUsedTicketNumber = nextNumber;
  persistLastUsedTicketNumber(lastUsedTicketNumber);
  return nextNumber;
}

function loadTickets() {
  const stored = storedValue(STORAGE_KEY, LEGACY_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaceConfig.tickets));
    return defaultTicketSeed();
  }

  try {
    const parsed = JSON.parse(stored);
    if (hasValidTicketData(parsed)) {
      const normalized = normalizeTickets(parsed);
      if (normalized.some(isOpen)) return normalized;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaceConfig.tickets));
    return defaultTicketSeed();
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaceConfig.tickets));
    return defaultTicketSeed();
  }
}

function loadUsers() {
  const stored = storedValue(USERS_STORAGE_KEY, LEGACY_USERS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(seedUsers));
    return JSON.parse(JSON.stringify(seedUsers));
  }

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      const normalized = parsed.map((user) => ({ ...user, name: normalizeRepName(user.name) || user.name }));
      if (hasValidUserData(normalized)) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(seedUsers));
    return JSON.parse(JSON.stringify(seedUsers));
  } catch {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(seedUsers));
    return JSON.parse(JSON.stringify(seedUsers));
  }
}

function loadKnowledgeDocs() {
  if (!currentUserIsAdmin()) return [];

  const stored = storedValue(KNOWLEDGE_STORAGE_KEY, LEGACY_KNOWLEDGE_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(workspaceConfig.knowledgeVault));
    return JSON.parse(JSON.stringify(workspaceConfig.knowledgeVault));
  }

  try {
    const parsed = JSON.parse(stored);
    const normalized = normalizeKnowledgeDocs(parsed);
    if (normalized) {
      localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
    localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(workspaceConfig.knowledgeVault));
    return JSON.parse(JSON.stringify(workspaceConfig.knowledgeVault));
  } catch {
    localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(workspaceConfig.knowledgeVault));
    return JSON.parse(JSON.stringify(workspaceConfig.knowledgeVault));
  }
}

function loadProductLinks() {
  const stored = storedValue(PRODUCT_LINK_STORAGE_KEY, LEGACY_PRODUCT_LINK_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(PRODUCT_LINK_STORAGE_KEY, JSON.stringify(seedProductLinks));
    return JSON.parse(JSON.stringify(seedProductLinks));
  }

  try {
    const parsed = JSON.parse(stored);
    const normalized = normalizeProductLinks(parsed);
    if (normalized?.length) {
      localStorage.setItem(PRODUCT_LINK_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
    localStorage.setItem(PRODUCT_LINK_STORAGE_KEY, JSON.stringify(seedProductLinks));
    return JSON.parse(JSON.stringify(seedProductLinks));
  } catch {
    localStorage.setItem(PRODUCT_LINK_STORAGE_KEY, JSON.stringify(seedProductLinks));
    return JSON.parse(JSON.stringify(seedProductLinks));
  }
}

function loadProfile() {
  const stored = storedValue(PROFILE_STORAGE_KEY, LEGACY_PROFILE_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(seedProfile));
    return { ...seedProfile };
  }

  try {
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(seedProfile));
      return { ...seedProfile };
    }
    return normalizeProfile({ ...seedProfile, ...parsed });
  } catch {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(seedProfile));
    return { ...seedProfile };
  }
}

function loadWorkspaceSettings() {
  const stored = storedValue(SETTINGS_STORAGE_KEY, LEGACY_SETTINGS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(seedWorkspaceSettings));
    return { ...seedWorkspaceSettings };
  }

  try {
    const parsed = JSON.parse(stored);
    return normalizeWorkspaceSettings(parsed);
  } catch {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(seedWorkspaceSettings));
    return { ...seedWorkspaceSettings };
  }
}

function normalizeWorkspaceSettings(source = {}) {
  const defaults = seedWorkspaceSettings;
  const value = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  const role = String(value.currentUserRole || "").trim().toLowerCase();
  const supportedStatuses = new Set(defaults.allowedStatuses);
  const statuses = Array.isArray(value.allowedStatuses)
    ? [...new Set(value.allowedStatuses.map((status) => String(status || "").trim()).filter((status) => supportedStatuses.has(status)))]
    : defaults.allowedStatuses;
  return {
    workspaceName: cleanWorkspaceSetting(value.workspaceName, defaults.workspaceName),
    workspaceLabel: cleanWorkspaceSetting(value.workspaceLabel, defaults.workspaceLabel),
    supportEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value.supportEmail || "").trim())
      ? String(value.supportEmail).trim().toLowerCase()
      : defaults.supportEmail,
    currentUserName: normalizeRepName(value.currentUserName) || defaults.currentUserName,
    currentUserRole: ["admin", "manager", "rep", "owner"].includes(role) ? role : defaults.currentUserRole,
    defaultAssignee: normalizeRepName(value.defaultAssignee) || normalizeRepName(value.currentUserName) || defaults.defaultAssignee,
    timezone: cleanWorkspaceSetting(value.timezone, defaults.timezone),
    demoMode: typeof value.demoMode === "boolean" ? value.demoMode : defaults.demoMode,
    allowedStatuses: statuses.length ? statuses.slice(0, 12) : defaults.allowedStatuses
  };
}

function cleanWorkspaceSetting(value, fallback) {
  const text = String(value || "").replace(/[\u0000-\u001f]/g, "").trim();
  return text || fallback;
}

function applyWorkspaceSettings() {
  workspaceConfig.workspaceName = workspaceSettings.workspaceName;
  workspaceConfig.workspaceLabel = workspaceSettings.workspaceLabel;
  workspaceConfig.supportMailbox = workspaceSettings.supportEmail;
  if (workspaceSettings.allowedStatuses?.length) workspaceConfig.statuses = workspaceSettings.allowedStatuses;
}

function normalizeProfile(sourceProfile) {
  const normalized = { ...sourceProfile };
  normalized.displayName = normalizeRepName(normalized.displayName) || currentDemoUserName();
  normalized.firstName = normalized.firstName || "Robert";
  normalized.lastName = "";
  normalized.mySignature = normalized.mySignature || "Thanks,\nRobert";
  return normalized;
}

function loadNotifications(sourceTickets) {
  const stored = storedValue(NOTIFICATIONS_STORAGE_KEY, LEGACY_NOTIFICATIONS_STORAGE_KEY);
  if (!stored) {
    const seeded = seedNotifications(sourceTickets);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(stored);
    const normalized = normalizeNotifications(parsed);
    if (normalized) return normalized;
    const seeded = seedNotifications(sourceTickets);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  } catch {
    const seeded = seedNotifications(sourceTickets);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function normalizeNotifications(value) {
  if (!Array.isArray(value)) return null;
  return value
    .filter((item) => item && typeof item === "object" && typeof item.title === "string")
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id ? item.id : `notification-${index}-${Date.now()}`,
      category: typeof item.category === "string" ? item.category : "assignment",
      title: replaceLegacyRepNamesInText(item.title),
      description: typeof item.description === "string" ? replaceLegacyRepNamesInText(item.description) : "",
      ticketId: typeof item.ticketId === "string" ? item.ticketId : "",
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      read: Boolean(item.read)
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function seedNotifications(sourceTickets) {
  const ticketById = (id) => sourceTickets.find((ticket) => ticket.id === id || ticketDisplayId(ticket) === id) || sourceTickets.find(assignedToCurrentDemoUser) || sourceTickets[0];
  const examples = [
    { category: "assigned", ticket: ticketById("ISP-28501"), title: "Ticket assigned to you", description: "RCC7P-AK tank not filling was routed to your queue.", hours: 0.4, read: false },
    { category: "customer", ticket: ticketById("ISP-28497"), title: "Customer replied", description: "Harper sent the requested install photo and asked for next steps.", hours: 1.1, read: false },
    { category: "sla", ticket: ticketById("ISP-28486"), title: "Close to overdue", description: "This ticket is approaching its SLA window.", hours: 2.2, read: false },
    { category: "sla", ticket: ticketById("ISP-28478"), title: "Ticket became overdue", description: "Harper Stone's bypass valve ticket is now overdue.", hours: 3.6, read: false },
    { category: "reassigned", ticket: ticketById("ISP-28494"), title: "Ticket reassigned to you", description: "A warranty registration case was reassigned for review.", hours: 5.2, read: true },
    { category: "mention", ticket: ticketById("ISP-28491"), title: "Mentioned in internal note", description: "CS1 Nick mentioned you for a repeat customer context check.", hours: 7.3, read: false },
    { category: "receipts", ticket: ticketById("ISP-28489"), title: "Receipt needs review", description: "A Lowe's receipt was uploaded and needs verification.", hours: 10.4, read: true },
    { category: "receipts", ticket: ticketById("ISP-28490"), title: "Warranty action needed", description: "Receipt is on file, but warranty registration still needs action.", hours: 17.7, read: false },
    { category: "assignment", ticket: null, title: "Assignment eligibility changed", description: "Admin updated your assignment pool eligibility.", hours: 31.5, read: true }
  ];

  return examples.map((item, index) => ({
    id: `seed-notification-${index + 1}`,
    category: item.category,
    title: item.title,
    description: item.description,
    ticketId: item.ticket?.id || "",
    createdAt: hoursAgo(item.hours),
    read: item.read
  }));
}

function loadCustomerAccounts(sourceTickets) {
  const stored = storedValue(CUSTOMER_ACCOUNTS_STORAGE_KEY, LEGACY_CUSTOMER_ACCOUNTS_STORAGE_KEY);
  if (!stored) {
    const derived = safeDeriveCustomerAccounts(sourceTickets);
    localStorage.setItem(CUSTOMER_ACCOUNTS_STORAGE_KEY, JSON.stringify(derived));
    return derived;
  }

  try {
    const parsed = JSON.parse(stored);
    const normalized = normalizeCustomerAccounts(parsed);
    if (normalized) return normalized;
    const derived = safeDeriveCustomerAccounts(sourceTickets);
    localStorage.setItem(CUSTOMER_ACCOUNTS_STORAGE_KEY, JSON.stringify(derived));
    return derived;
  } catch (error) {
    console.warn("Customer account data could not be loaded. Continuing with ticket rendering.", error);
    const derived = safeDeriveCustomerAccounts(sourceTickets);
    localStorage.setItem(CUSTOMER_ACCOUNTS_STORAGE_KEY, JSON.stringify(derived));
    return derived;
  }
}

function safeDeriveCustomerAccounts(sourceTickets) {
  try {
    return deriveCustomerAccounts(sourceTickets);
  } catch (error) {
    console.warn("Customer account history could not be derived. Continuing without account history.", error);
    return {};
  }
}

function normalizeCustomerAccounts(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.entries(value).reduce((accounts, [email, account]) => {
    const key = String(email || account?.email || "").trim().toLowerCase();
    if (!key || !account || typeof account !== "object" || Array.isArray(account)) return accounts;
    const receipts = Array.isArray(account.receipts)
      ? account.receipts.filter((record) => record && typeof record === "object").map((record, index) => normalizeReceiptRecord(record, key, index))
      : [];
    const warranties = Array.isArray(account.warranties)
      ? account.warranties.filter((record) => record && typeof record === "object").map((record, index) => normalizeWarrantyRecord(record, receipts, key, index))
      : [];
    receipts.forEach((receipt) => ensureWarrantyRecordForReceipt({ warranties }, receipt));
    const registeredWarranties = warranties.filter(isRegisteredWarrantyRecord);
    accounts[key] = {
      email: key,
      receipts,
      warranties,
      warrantyRegistered: registeredWarranties.length > 0,
      warrantyRegisteredAt: typeof account.warrantyRegisteredAt === "string" && account.warrantyRegisteredAt
        ? account.warrantyRegisteredAt
        : registeredWarranties[0]?.registeredAt || "",
      purchaseSource: workspaceConfig.purchaseSources.includes(account.purchaseSource) ? account.purchaseSource : "Unknown",
      orderNumber: typeof account.orderNumber === "string" ? account.orderNumber : "",
      name: typeof account.name === "string" ? account.name : "",
      phone: typeof account.phone === "string" ? account.phone : "",
      mobile: typeof account.mobile === "string" ? account.mobile : "",
      address: typeof account.address === "string" ? account.address : "",
      notes: typeof account.notes === "string" ? account.notes : "",
      accountNotes: normalizeAccountNotes(account.accountNotes, account.notes)
    };
    return accounts;
  }, {});
}

function normalizeAccountNotes(value, legacyNotes = "") {
  const notes = Array.isArray(value)
    ? value
      .filter((record) => record && typeof record === "object" && typeof record.body === "string" && record.body.trim())
      .map((record, index) => ({
        id: typeof record.id === "string" && record.id.trim() ? record.id : `note-${stableNumber(`${record.body}${record.timestamp || ""}${index}`)}`,
        body: replaceLegacyRepNamesInText(record.body.trim()),
        timestamp: typeof record.timestamp === "string" && record.timestamp ? record.timestamp : new Date().toISOString(),
        rep: typeof record.rep === "string" && record.rep.trim() ? normalizeRepName(record.rep) : CURRENT_USER
      }))
    : [];
  if (!notes.length && typeof legacyNotes === "string" && legacyNotes.trim()) {
    notes.push({
      id: `note-${stableNumber(legacyNotes)}`,
      body: legacyNotes.trim(),
      timestamp: new Date().toISOString(),
      rep: "System"
    });
  }
  return notes;
}

function normalizeReceiptRecord(record, accountEmail, index = 0) {
  const fileName = typeof record.fileName === "string" && record.fileName.trim() ? record.fileName : `Receipt ${index + 1}`;
  const statusOptions = ["Uploaded", "Verified", "Needs Review"];
  const status = statusOptions.includes(record.status) ? record.status : "Uploaded";
  const confidenceOptions = ["High", "Medium", "Low"];
  return {
    ...record,
    id: typeof record.id === "string" && record.id.trim()
      ? record.id
      : `receipt-${stableNumber(`${accountEmail}${fileName}${record.orderNumber || ""}${record.model || ""}${index}`)}`,
    fileName,
    fileType: typeof record.fileType === "string" && record.fileType.trim() ? record.fileType : fileExtension(fileName).toUpperCase() || "Receipt",
    source: workspaceConfig.purchaseSources.includes(record.source) ? record.source : "Unknown",
    orderNumber: typeof record.orderNumber === "string" ? record.orderNumber : "",
    model: typeof record.model === "string" ? record.model : "",
    customerName: typeof record.customerName === "string" ? record.customerName : "",
    customerEmail: typeof record.customerEmail === "string" ? record.customerEmail : "",
    purchaseDate: typeof record.purchaseDate === "string" ? record.purchaseDate : "",
    receiptTotal: typeof record.receiptTotal === "string" ? record.receiptTotal : "",
    fileSize: Number(record.fileSize) || 0,
    mimeType: typeof record.mimeType === "string" ? record.mimeType : "",
    savedAt: typeof record.savedAt === "string" ? record.savedAt : record.uploadDate || "",
    uploadDate: typeof record.uploadDate === "string" ? record.uploadDate : record.savedAt || "",
    uploadedBy: typeof record.uploadedBy === "string" && record.uploadedBy.trim() ? normalizeRepName(record.uploadedBy) : CURRENT_USER,
    warrantyRegistered: Boolean(record.warrantyRegistered),
    registeredDate: typeof record.registeredDate === "string" ? record.registeredDate : "",
    registeredBy: typeof record.registeredBy === "string" ? normalizeRepName(record.registeredBy) : "",
    verifiedBy: typeof record.verifiedBy === "string" ? normalizeRepName(record.verifiedBy) : "",
    verificationNote: typeof record.verificationNote === "string" ? record.verificationNote : "",
    confidence: confidenceOptions.includes(record.confidence) ? record.confidence : "Low",
    extractionNote: typeof record.extractionNote === "string" && record.extractionNote.trim() ? record.extractionNote : "Needs manual review",
    ticketId: typeof record.ticketId === "string" || typeof record.ticketId === "number" ? String(record.ticketId) : "",
    status
  };
}

function normalizeWarrantyRecord(record, receipts = [], accountEmail = "", index = 0) {
  const linkedReceipt = receipts.find((receipt) => warrantyMatchesReceipt(record, receipt));
  const status = isRegisteredWarrantyRecord(record) ? "Registered" : "Not registered";
  const receiptFileName = record.receiptFileName || linkedReceipt?.fileName || "";
  return {
    ...record,
    id: typeof record.id === "string" && record.id.trim()
      ? record.id
      : `warranty-${stableNumber(`${accountEmail}${receiptFileName}${record.orderNumber || ""}${record.model || ""}${index}`)}`,
    receiptId: typeof record.receiptId === "string" && record.receiptId.trim() ? record.receiptId : linkedReceipt?.id || "",
    receiptFileName,
    status,
    registeredAt: status === "Registered" && typeof record.registeredAt === "string" ? record.registeredAt : "",
    registeredBy: status === "Registered" ? typeof record.registeredBy === "string" && record.registeredBy ? normalizeRepName(record.registeredBy) : "System" : "",
    source: workspaceConfig.purchaseSources.includes(record.source) ? record.source : linkedReceipt?.source || "Unknown",
    orderNumber: typeof record.orderNumber === "string" ? record.orderNumber : linkedReceipt?.orderNumber || "",
    model: typeof record.model === "string" ? record.model : linkedReceipt?.model || "",
    ticketId: typeof record.ticketId === "string" || typeof record.ticketId === "number" ? String(record.ticketId) : linkedReceipt?.ticketId || "",
    notes: typeof record.notes === "string" ? record.notes : ""
  };
}

function deriveCustomerAccounts(sourceTickets) {
  if (!Array.isArray(sourceTickets)) return {};
  return sourceTickets.reduce((accounts, ticket) => {
    if (!ticket || !ticket.customer || typeof ticket.customer.email !== "string" || !ticket.customer.email.trim()) return accounts;
    const account = ensureCustomerAccount(accounts, ticket.customer.email);
    if (!account) return accounts;
    const detectedSource = isVerifiedPurchaseSource(ticket.purchaseSource) ? ticket.purchaseSource : detectPurchaseSource(ticket);
    if (detectedSource !== "Unknown" && account.purchaseSource === "Unknown") account.purchaseSource = detectedSource;
    if (!account.orderNumber && ticket.order) account.orderNumber = ticket.order;
    account.name = account.name || ticket.customer.name || "";
    account.phone = account.phone || ticket.customer.phone || "";
    account.mobile = account.mobile || ticket.customer.mobile || "";
    account.address = account.address || ticket.customer.address || "";
    if (ticket.receipt || ticket.attachments?.some((file) => file.type === "receipt")) {
      addReceiptToAccount(account, ticket, "Seeded from ticket history");
    }
    if (String(ticket.warranty).toLowerCase().includes("registered")) {
      addWarrantyToAccount(account, ticket, "Seeded registered warranty");
    }
    return accounts;
  }, {});
}

function ensureCustomerAccount(accounts, email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return null;
  if (!accounts[key]) {
    accounts[key] = {
      email: key,
      receipts: [],
      warranties: [],
      warrantyRegistered: false,
      warrantyRegisteredAt: "",
      purchaseSource: "Unknown",
      orderNumber: "",
      name: "",
      phone: "",
      mobile: "",
      address: "",
      notes: "",
      accountNotes: []
    };
  }
  return accounts[key];
}

function hasValidTicketData(value) {
  const ids = Array.isArray(value) ? value.map((ticket) => String(ticket?.id || "")) : [];
  return (
    Array.isArray(value) &&
    value.length >= 10 &&
    new Set(ids).size === ids.length &&
    value.some((ticket) => ticket && isOpen(ticket)) &&
    value.every(
      (ticket) =>
        ticket &&
        ["string", "number"].includes(typeof ticket.id) &&
        typeof ticket.subject === "string" &&
        ticket.customer &&
        typeof ticket.customer.name === "string" &&
        typeof ticket.customer.email === "string" &&
        typeof ticket.model === "string" &&
        typeof ticket.family === "string" &&
        typeof ticket.source === "string" &&
        typeof ticket.assignee === "string" &&
        typeof ticket.status === "string" &&
        typeof ticket.priority === "string" &&
        typeof ticket.createdAt === "string" &&
        typeof ticket.dueAt === "string" &&
        Array.isArray(ticket.tags) &&
        Array.isArray(ticket.missing) &&
        visibleThreadMessages(ticket).length > 0 &&
        ticket.diagnosis &&
        typeof ticket.diagnosis.issue === "string" &&
        typeof ticket.diagnosis.firstTest === "string" &&
        typeof ticket.diagnosis.confirms === "string" &&
        Array.isArray(ticket.attachments) &&
        Array.isArray(ticket.checklist) &&
        Array.isArray(ticket.guardrails)
    )
  );
}

function hasValidUserData(value) {
  return (
    Array.isArray(value) &&
    value.some((user) => user.name === CURRENT_USER && user.role === "admin") &&
    value.every(
      (user) =>
        user &&
        typeof user.id === "string" &&
        typeof user.name === "string" &&
        userRoles.includes(user.role) &&
        typeof user.assignmentEligible === "boolean" &&
        typeof user.removed === "boolean"
    )
  );
}

function normalizeKnowledgeDocs(value) {
  if (!Array.isArray(value)) return null;
  const normalized = value.map(normalizeKnowledgeDoc).filter(Boolean);
  return normalized.length === value.length ? normalized : null;
}

function normalizeKnowledgeDoc(doc) {
  if (!doc || typeof doc.id !== "string" || typeof doc.fileName !== "string") return null;
  const status = knowledgeStatuses.includes(doc.status) ? doc.status : "Draft";
  const approvedForAi = status === "Approved" || Boolean(
    doc.approvedForAi ??
    doc.approvedForAI ??
    doc.approvedForAssist ??
    doc.aiApproved
  );
  const normalizedStatus = approvedForAi ? "Approved" : status;
  return {
    id: doc.id,
    title: typeof doc.title === "string" && doc.title.trim() ? doc.title : doc.fileName.replace(/\.[^.]+$/, ""),
    fileName: doc.fileName,
    fileType: typeof doc.fileType === "string" && doc.fileType.trim() ? doc.fileType : fileExtension(doc.fileName) || "File",
    mimeType: typeof doc.mimeType === "string" ? doc.mimeType : "",
    size: Number(doc.size) || 0,
    uploadDate: typeof doc.uploadDate === "string" ? doc.uploadDate : toDateInput(new Date().toISOString()),
    uploadedBy: typeof doc.uploadedBy === "string" && doc.uploadedBy.trim() ? doc.uploadedBy : CURRENT_USER,
    category: knowledgeCategories.includes(doc.category) ? doc.category : "Other",
    description: typeof doc.description === "string" ? doc.description : "",
    owner: typeof doc.owner === "string" && doc.owner.trim() ? doc.owner : CURRENT_USER,
    lastReviewedDate: typeof doc.lastReviewedDate === "string" ? doc.lastReviewedDate : "",
    approvedForAi,
    internalOnly: typeof doc.internalOnly === "boolean" ? doc.internalOnly : true,
    customerFacingAllowed: typeof doc.customerFacingAllowed === "boolean" ? doc.customerFacingAllowed : false,
    status: normalizedStatus,
    archived: Boolean(doc.archived)
  };
}

function productLinkSeedEntry(model, platform, url, label = "") {
  const modelLabel = String(model || "").trim();
  const platformLabel = productLinkPlatforms.includes(platform) ? platform : "Other";
  const title = label || [modelLabel, platformLabel].filter(Boolean).join(" / ") || platformLabel;
  return {
    id: `product-link-${slugify(modelLabel || platformLabel)}-${slugify(platformLabel)}`,
    model: modelLabel,
    platform: platformLabel,
    url: normalizeProductLinkUrl(url),
    label: title,
    notes: "",
    active: true,
    lastUpdated: "2026-05-09",
    addedBy: CURRENT_USER
  };
}

function normalizeProductLinks(value) {
  if (!Array.isArray(value)) return null;
  return value.map(normalizeProductLink).filter(Boolean);
}

function normalizeProductLink(link) {
  if (!link || typeof link !== "object") return null;
  const model = normalizeProductModel(link.model);
  const platform = productLinkPlatforms.includes(link.platform) ? link.platform : productLinkPlatformFromSource(link.platform) || "Other";
  const url = normalizeProductLinkUrl(link.url);
  if (!url || !platform) return null;
  const label = String(link.label || [model, platform].filter(Boolean).join(" / ") || platform).trim();
  return {
    id: typeof link.id === "string" && link.id.trim() ? link.id : `product-link-${slugify(model || platform)}-${slugify(platform)}-${Date.now()}`,
    model,
    platform,
    url,
    label,
    notes: typeof link.notes === "string" ? link.notes : "",
    active: typeof link.active === "boolean" ? link.active : true,
    lastUpdated: typeof link.lastUpdated === "string" && link.lastUpdated ? link.lastUpdated : toDateInput(new Date().toISOString()),
    addedBy: typeof link.addedBy === "string" && link.addedBy.trim() ? link.addedBy : CURRENT_USER
  };
}

function normalizeProductModel(model) {
  return String(model || "").trim().toUpperCase();
}

function normalizeProductLinkUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function productLinkPlatformFromSource(source) {
  if (source === "Amazon") return "Amazon";
  if (source === "Home Depot") return "Home Depot";
  if (source === "Google Review") return "Google Review";
  if (source === "Trustpilot") return "Trustpilot";
  return "";
}

function persistTickets(options = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  if (options.skipBackendSync) return;
  scheduleBackendSync("tickets", tickets);
}

function persistTicketsLocalOnly() {
  persistTickets({ skipBackendSync: true });
}

function persistUsers() {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  scheduleBackendSync("users", users);
}

function persistProfile() {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  scheduleBackendSync("profile", profile);
}

function persistNotifications() {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  scheduleBackendSync("notifications", notifications);
}

function persistKnowledgeDocs() {
  localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(knowledgeDocs));
  scheduleBackendSync("knowledgeDocs", knowledgeDocs);
}

function persistProductLinks() {
  localStorage.setItem(PRODUCT_LINK_STORAGE_KEY, JSON.stringify(productLinks));
  scheduleBackendSync("productLinks", productLinks);
}

function persistCustomerAccounts() {
  localStorage.setItem(CUSTOMER_ACCOUNTS_STORAGE_KEY, JSON.stringify(customerAccounts));
  scheduleBackendSync("customerAccounts", customerAccounts);
}

async function hydrateBackendState() {
  if (!window.fetch) {
    backendSyncReady = true;
    backendSyncAvailable = false;
    return;
  }

  try {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    if (!response.ok) throw new Error(`Backend bootstrap failed: ${response.status}`);
    backendSyncAvailable = true;
    const payload = await response.json();
    sessionUser = isBackendPlainObject(payload?.session?.user) ? payload.session.user : null;
    const state = payload?.state || {};
    let hydrated = false;

    if (hasValidTicketData(state.tickets)) {
      tickets = normalizeTickets(state.tickets);
      rebaselineOpenTicketSla(tickets);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
      hydrated = true;
    }
    if (Array.isArray(state.users)) {
      users = state.users.map((user) => ({ ...user, name: normalizeRepName(user.name) || user.name }));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      hydrated = true;
    }
    if (isBackendPlainObject(state.profile)) {
      profile = state.profile;
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      hydrated = true;
    }
    if (isBackendPlainObject(state.settings)) {
      workspaceSettings = normalizeWorkspaceSettings(state.settings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(workspaceSettings));
      applyWorkspaceSettings();
      applyWorkspaceBranding();
      hydrated = true;
    }
    if (Array.isArray(state.notifications)) {
      notifications = state.notifications;
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
      hydrated = true;
    }
    if (Array.isArray(state.knowledgeDocs)) {
      knowledgeDocs = state.knowledgeDocs;
      localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(knowledgeDocs));
      hydrated = true;
    }
    if (Array.isArray(state.productLinks)) {
      productLinks = state.productLinks;
      localStorage.setItem(PRODUCT_LINK_STORAGE_KEY, JSON.stringify(productLinks));
      hydrated = true;
    }
    if (isBackendPlainObject(state.customerAccounts)) {
      customerAccounts = normalizeCustomerAccounts(state.customerAccounts) || {};
      localStorage.setItem(CUSTOMER_ACCOUNTS_STORAGE_KEY, JSON.stringify(customerAccounts));
      hydrated = true;
    }
    if (Number.isInteger(state.lastTicketNumber)) {
      lastUsedTicketNumber = Math.max(state.lastTicketNumber, highestExistingTicketNumber(tickets), MIN_TICKET_NUMBER);
      localStorage.setItem(TICKET_COUNTER_STORAGE_KEY, String(lastUsedTicketNumber));
      hydrated = true;
    }
    if (applySessionUserToWorkspace()) {
      hydrated = true;
    }
    const backendAssignmentHydration = hydrateBackendAssignmentUsers();

    if (hydrated) {
      selectedTicketId = selectedTicketId && tickets.some((ticket) => ticket.id === selectedTicketId)
        ? selectedTicketId
        : tickets[0]?.id || "";
      applyProfilePreferences({ initialize: true });
      render({ preserveQueueList: false, suppressQueueRowEnter: true });
    }
    backendAssignmentHydration.then((changed) => {
      if (changed) render({ preserveQueueList: true, suppressQueueRowEnter: true });
    });
  } catch (error) {
    backendSyncAvailable = false;
    console.warn("RepOS backend sync is unavailable; using browser localStorage.", error);
  } finally {
    backendSyncReady = true;
  }
}

async function hydrateBackendAssignmentUsers() {
  try {
    const response = await fetch("/api/users", { cache: "no-store" });
    if (!response.ok) throw new Error(`Backend users failed: ${response.status}`);
    const payload = await response.json();
    const nextUsers = Array.isArray(payload?.users)
      ? payload.users.map(backendUserToAssignmentUser).filter(Boolean)
      : [];
    const changed = JSON.stringify(backendAssignmentUsers) !== JSON.stringify(nextUsers);
    backendAssignmentUsers = nextUsers;
    return changed;
  } catch (error) {
    const changed = backendAssignmentUsers.length > 0;
    backendAssignmentUsers = [];
    console.warn("RepOS backend assignment users are unavailable; using legacy assignment users.", error);
    return changed;
  }
}

function syncBackendSnapshot() {
  scheduleBackendSync("tickets", tickets);
  scheduleBackendSync("users", users);
  scheduleBackendSync("profile", profile);
  scheduleBackendSync("notifications", notifications);
  scheduleBackendSync("knowledgeDocs", knowledgeDocs);
  scheduleBackendSync("productLinks", productLinks);
  scheduleBackendSync("customerAccounts", customerAccounts);
  scheduleBackendSync("lastTicketNumber", lastUsedTicketNumber);
}

function scheduleBackendSync(resource, value) {
  if (!backendSyncReady || !window.fetch) return;
  backendSyncQueue.set(resource, value);
  window.clearTimeout(backendSyncTimer);
  backendSyncTimer = window.setTimeout(flushBackendSync, 180);
}

async function flushBackendSync() {
  if (!backendSyncQueue.size) return;
  const updates = [...backendSyncQueue.entries()];
  backendSyncQueue.clear();
  await Promise.all(updates.map(async ([resource, value]) => {
    try {
      const response = await fetch(`${BACKEND_STATE_ENDPOINT}/${resource}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value)
      });
      if (!response.ok) throw new Error(`Backend sync failed for ${resource}: ${response.status}`);
    } catch (error) {
      console.warn("RepOS backend sync failed.", error);
    }
  }));
}

function isBackendPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sessionUserAssignmentName(user = sessionUser) {
  if (!isBackendPlainObject(user)) return "";
  return normalizeRepName(user.assignmentName || user.repName || user.name || user.displayName || user.email || "");
}

function sessionUserRole(user = sessionUser) {
  if (!isBackendPlainObject(user)) return "";
  const role = String(user.role || "").trim().toLowerCase();
  return ["admin", "manager", "rep", "owner"].includes(role) ? role : "";
}

function backendUserToAssignmentUser(user) {
  if (!isBackendPlainObject(user)) return null;
  const name = normalizeRepName(user.assignmentName || user.repName || user.name || user.displayName || "");
  if (!name) return null;
  const role = String(user.role || "").trim().toLowerCase();
  return {
    id: String(user.id || slugify(name)),
    name,
    role: userRoles.includes(role) ? role : "rep",
    assignmentEligible: user.active !== false,
    removed: false
  };
}

function applySessionUserToWorkspace() {
  if (!isBackendPlainObject(sessionUser)) return false;
  const role = sessionUserRole(sessionUser);
  const name = sessionUserAssignmentName(sessionUser);
  const patch = {};
  if (role && role !== workspaceSettings.currentUserRole) {
    patch.currentUserRole = role;
  }
  if (name && name !== workspaceSettings.currentUserName) {
    patch.currentUserName = name;
    patch.defaultAssignee = name;
  }
  if (!Object.keys(patch).length) return false;
  workspaceSettings = normalizeWorkspaceSettings({ ...workspaceSettings, ...patch });
  applyWorkspaceSettings();
  return true;
}

function backendTicketUrl(ticketId, childPath = "") {
  return `/api/tickets/${encodeURIComponent(ticketId)}${childPath}`;
}

function backendTicketEndpointsAvailable() {
  return Boolean(backendSyncReady && backendSyncAvailable && window.fetch);
}

async function sendTicketBackendOperations(ticketId, operations, options = {}) {
  const fallbackToFullSync = options.fallbackToFullSync !== false;
  const applyResponse = options.applyResponse !== false;
  const preserveFields = Array.isArray(options.preserveFields) ? options.preserveFields : [];
  if (!operations.length) return null;
  if (!backendTicketEndpointsAvailable()) {
    if (fallbackToFullSync) persistTickets();
    return null;
  }

  try {
    let lastPayload = null;
    const optimisticTicket = preserveFields.length ? ticketById(ticketId) : null;
    for (const operation of operations) {
      const response = await fetch(backendTicketUrl(ticketId, operation.path || ""), {
        method: operation.method || "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operation.body || {})
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.message || payload?.error || `Ticket endpoint failed: ${response.status}`;
        throw new Error(message);
      }
      lastPayload = payload;
    }
    if (applyResponse && lastPayload?.ticket) {
      replaceLocalTicketFromBackend(lastPayload.ticket, { optimisticTicket, preserveFields });
    }
    return lastPayload;
  } catch (error) {
    console.warn("RepOS normalized ticket update failed; falling back to full ticket sync.", error);
    if (fallbackToFullSync) persistTickets();
    showToast("Saved locally. Backend ticket sync will retry.");
    return null;
  }
}

function replaceLocalTicketFromBackend(serverTicket, options = {}) {
  if (!serverTicket?.id) return null;
  const preserved = {};
  if (options.optimisticTicket && Array.isArray(options.preserveFields)) {
    options.preserveFields.forEach((field) => {
      if (Object.hasOwn(options.optimisticTicket, field)) preserved[field] = options.optimisticTicket[field];
    });
  }
  const normalized = normalizeTickets([{ ...serverTicket, ...preserved }], { persist: false })[0];
  const index = tickets.findIndex((ticket) => String(ticket.id) === String(normalized.id));
  if (index === -1) {
    tickets.unshift(normalized);
  } else {
    tickets[index] = normalized;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  return normalized;
}

function syncTicketStatusToBackend(ticketId, nextStatus, internalNote = "") {
  const operations = [
    { method: "PATCH", body: { status: nextStatus } },
    ...(String(internalNote || "").trim()
      ? [{ method: "POST", path: "/notes", body: { author: repLabel(), body: internalNote } }]
      : [])
  ];
  return sendTicketBackendOperations(ticketId, operations);
}

function syncTicketAssigneeToBackend(ticketId, nextAssignee, internalNote = "") {
  const operations = [
    { method: "PATCH", body: { assignee: nextAssignee } },
    ...(String(internalNote || "").trim()
      ? [{ method: "POST", path: "/notes", body: { author: repLabel(), body: internalNote } }]
      : [])
  ];
  return sendTicketBackendOperations(ticketId, operations, { preserveFields: ["aiAssignment"] });
}

function syncTicketMessageToBackend(ticketId, message, patch = {}) {
  const childPath = message.type === "note" ? "/notes" : "/messages";
  const operations = [
    { method: "POST", path: childPath, body: message }
  ];
  if (Object.keys(patch).length) {
    operations.push({ method: "PATCH", body: patch });
  }
  return sendTicketBackendOperations(ticketId, operations);
}

function syncTicketAttachmentsToBackend(ticketId, attachments) {
  const operations = attachments.map((attachment) => ({
    method: "POST",
    path: "/attachments",
    body: {
      fileName: attachment.file || attachment.fileName,
      type: attachment.type || "attachment",
      mimeType: attachment.mimeType || "",
      sizeBytes: attachment.sizeBytes || attachment.size || 0,
      uploadedBy: attachment.uploadedBy || repLabel(),
      uploadedAt: attachment.uploadedAt || new Date().toISOString(),
      status: attachment.status || "Attached"
    }
  }));
  return sendTicketBackendOperations(ticketId, operations, { applyResponse: false });
}

async function sendTicketMergeToBackend(primaryTicketId, secondaryTicketIds, internalNote = "") {
  if (!backendTicketEndpointsAvailable()) {
    return { status: "unavailable" };
  }

  const body = { secondaryTicketIds };
  const note = String(internalNote || "").trim();
  if (note) body.note = note;

  try {
    const response = await fetch(backendTicketUrl(primaryTicketId, "/merge"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      return { status: "ok", payload };
    }
    if (response.status === 404 && payload?.error === "not_found") {
      return { status: "unavailable", payload };
    }
    return { status: "blocked", responseStatus: response.status, payload };
  } catch (error) {
    console.warn("RepOS backend ticket merge failed; falling back to local merge.", error);
    return { status: "unavailable", error };
  }
}

function applyBackendMergeResponse(primaryTicketId, secondaryTicketIds, payload) {
  if (!payload?.ticket?.id) return false;
  const primaryTicket = replaceLocalTicketFromBackend(payload.ticket);
  if (!primaryTicket) return false;

  const secondaryIdSet = new Set(secondaryTicketIds.map((ticketId) => String(ticketId)));
  const secondaryLabels = secondaryTicketIds.map((ticketId) => {
    const ticket = ticketById(ticketId);
    return ticket ? ticketDisplayId(ticket) : String(ticketId);
  });
  primaryTicket.mergedFrom = [
    ...new Set([
      ...(Array.isArray(primaryTicket.mergedFrom)
        ? primaryTicket.mergedFrom.filter((label) => !secondaryIdSet.has(String(label)))
        : []),
      ...secondaryLabels
    ])
  ];

  const mergedSummaries = Array.isArray(payload.merged) ? payload.merged : [];
  const mergedById = new Map(mergedSummaries.map((item) => [String(item.id), item]));
  const auditById = new Map(
    (Array.isArray(payload.audit) ? payload.audit : [])
      .filter((event) => event?.ticketId)
      .map((event) => [String(event.ticketId), event])
  );

  secondaryTicketIds.forEach((ticketId) => {
    const ticket = ticketById(ticketId);
    if (!ticket) return;
    const summary = mergedById.get(String(ticketId)) || {};
    const audit = auditById.get(String(ticketId));
    ticket.conversation = Array.isArray(ticket.conversation) ? ticket.conversation : [];
    ticket.mergedInto = summary.mergedInto || primaryTicketId;
    if (summary.mergedAt) ticket.mergedAt = summary.mergedAt;
    if (summary.mergedBy) ticket.mergedBy = summary.mergedBy;
    if (summary.mergedAt) ticket.updatedAt = summary.mergedAt;
    if (audit?.body && !ticket.conversation.some((message) => message?.body === audit.body && message?.timestamp === audit.timestamp)) {
      ticket.conversation.push({
        type: audit.type || "timeline",
        author: audit.author || "System",
        timestamp: audit.timestamp || summary.mergedAt || new Date().toISOString(),
        body: audit.body
      });
    }
  });

  selectedTicketIds.clear();
  selectedTicketId = primaryTicket.id;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  render();
  showToast(`Merged ${secondaryTicketIds.length + 1} tickets into ${ticketDisplayId(primaryTicket)}.`);
  return true;
}

function backendTicketMergeErrorMessage(payload, status) {
  const error = String(payload?.error || "");
  if (error === "authentication_required") return "Sign in before merging tickets.";
  if (error === "insufficient_role") return "Only admins and owners can merge tickets.";
  if (error === "invalid_merge_payload") return payload?.message || "Choose at least one valid secondary ticket to merge.";
  if (error === "cannot_merge_ticket_into_itself") return "Choose a different secondary ticket before merging.";
  if (error === "ticket_not_found" || error === "secondary_ticket_not_found") return "One of the selected tickets was not found. Refresh the queue and try again.";
  if (error === "ticket_already_merged") return "One of the selected tickets has already been merged.";
  if (error === "unsafe_ticket_status") return "One of the selected tickets cannot be merged in its current status.";
  if (error === "customer_mismatch") return "Selected tickets must belong to the same customer before merging.";
  return payload?.message || `Ticket merge failed${status ? ` (${status})` : ""}.`;
}

function accountForTicket(ticket) {
  const email = ticket?.customer?.email || "";
  return ensureCustomerAccount(customerAccounts, email) || createEmptyCustomerAccount(email);
}

function ensureReceiptTestCustomerAccounts(sourceTickets) {
  if (!Array.isArray(sourceTickets)) return false;
  let changed = false;
  receiptTestFixtures().forEach((fixture) => {
    const ticket = sourceTickets.find((item) => item.id === fixture.id);
    if (!ticket) return;
    const account = ensureCustomerAccount(customerAccounts, fixture.email);
    if (!account) return;
    account.name = account.name || fixture.customer;
    account.phone = account.phone || fixture.phone;
    const added = addReceiptToAccount(account, ticket, "Seeded receipt preview test record", {
      fileName: fixture.fileName,
      fileType: fixture.fileType,
      mimeType: ["PNG", "JPG", "JPEG"].includes(fixture.fileType) ? "image/jpeg" : "application/pdf",
      uploadDate: "2026-05-10T14:00:00.000Z",
      uploadedBy: receiptUploaderForTicket(ticket),
      source: fixture.source,
      orderNumber: fixture.order,
      model: fixture.model,
      customerName: fixture.customer,
      customerEmail: fixture.email,
      purchaseDate: fixture.purchaseDate,
      receiptTotal: fixture.receiptTotal,
      status: "Verified"
    });
    if (added) changed = true;
    const receipt = account.receipts.find((record) => record.fileName === fixture.fileName);
    if (receipt) {
      const before = JSON.stringify(receipt);
      Object.assign(receipt, {
        fileType: fixture.fileType,
        source: fixture.source,
        orderNumber: fixture.order,
        model: fixture.model,
        customerName: fixture.customer,
        customerEmail: fixture.email,
        purchaseDate: fixture.purchaseDate,
        receiptTotal: fixture.receiptTotal,
        status: "Verified",
        ticketId: fixture.id,
        uploadedBy: receipt.uploadedBy || receiptUploaderForTicket(ticket),
        uploadDate: receipt.uploadDate || "2026-05-10T14:00:00.000Z",
        savedAt: receipt.savedAt || receipt.uploadDate || "2026-05-10T14:00:00.000Z"
      });
      ensureWarrantyRecordForReceipt(account, receipt);
      if (JSON.stringify(receipt) !== before) changed = true;
    }
  });
  return changed;
}

function ensureMockReceiptRecordsForTickets(sourceTickets) {
  if (!Array.isArray(sourceTickets)) return false;
  let changed = false;
  sourceTickets.forEach((ticket) => {
    if (!ticketNeedsMockReceiptRecord(ticket)) return;
    const account = ensureCustomerAccount(customerAccounts, ticket.customer.email);
    if (!account) return;
    account.name = account.name || ticket.customer.name || "";
    account.phone = account.phone || ticket.customer.phone || "";
    account.mobile = account.mobile || ticket.customer.mobile || "";
    account.address = account.address || ticket.customer.address || "";

    const receipt = mockReceiptRecordForTicket(ticket);
    const existing = account.receipts.find((record) => String(record.ticketId || "") === String(ticket.id)) ||
      account.receipts.find((record) => recordMatchesTicket(record, ticket));
    if (existing) {
      const before = JSON.stringify(existing);
      Object.assign(existing, {
        fileName: existing.fileName || receipt.fileName,
        fileType: existing.fileType || receipt.fileType,
        mimeType: existing.mimeType || receipt.mimeType,
        source: isVerifiedPurchaseSource(existing.source) ? existing.source : receipt.source,
        orderNumber: existing.orderNumber || receipt.orderNumber,
        model: existing.model || receipt.model,
        customerName: existing.customerName || receipt.customerName,
        customerEmail: existing.customerEmail || receipt.customerEmail,
        purchaseDate: existing.purchaseDate || receipt.purchaseDate,
        receiptTotal: existing.receiptTotal || receipt.receiptTotal,
        uploadDate: existing.uploadDate || receipt.uploadDate,
        savedAt: existing.savedAt || existing.uploadDate || receipt.savedAt,
        uploadedBy: receiptUploaderForTicket(ticket),
        ticketId: existing.ticketId || ticket.id,
        status: existing.status === "Verified" ? existing.status : receipt.status
      });
      syncMockWarrantyForReceipt(account, existing, ticket);
      if (JSON.stringify(existing) !== before) changed = true;
      return;
    }

    account.receipts.push(receipt);
    syncMockWarrantyForReceipt(account, receipt, ticket);
    changed = true;
  });
  return changed;
}

function ticketNeedsMockReceiptRecord(ticket) {
  return Boolean(
    ticket &&
    ticket.customer?.email &&
    ticket.model &&
    ticket.model !== "TBD" &&
    (ticket.order || ticket.receipt || ticket.attachments?.some(isReceiptAttachment) || ticket.purchaseSource || ticket.source)
  );
}

function mockReceiptRecordForTicket(ticket) {
  const source = mockReceiptSourceForTicket(ticket);
  const orderNumber = mockReceiptOrderForTicket(ticket, source);
  const fileType = mockReceiptFileType(source);
  const fileName = mockReceiptFileName(ticket, source, orderNumber, fileType);
  const purchaseDate = mockReceiptPurchaseDate(ticket);
  const uploadDate = mockReceiptUploadDate(ticket);
  const registered = String(ticket.warranty || "").toLowerCase().includes("registered");
  const registeredDate = registered ? mockReceiptRegisteredDate(ticket, uploadDate) : "";
  const registeredBy = registered ? receiptUploaderForTicket(ticket) : "";
  return {
    id: `receipt-${stableNumber(`${ticket.customer.email}${ticket.id}${orderNumber}${ticket.model}`)}`,
    fileName,
    fileType,
    mimeType: fileType === "PDF" ? "application/pdf" : fileType === "PNG" ? "image/png" : "image/jpeg",
    fileSize: mockReceiptFileSize(ticket, fileType),
    savedAt: uploadDate,
    uploadDate,
    uploadedBy: receiptUploaderForTicket(ticket),
    source,
    orderNumber,
    model: ticket.model,
    customerName: ticket.customer.name || "",
    customerEmail: String(ticket.customer.email || "").toLowerCase(),
    purchaseDate,
    receiptTotal: mockReceiptTotal(ticket),
    status: "Verified",
    confidence: "High",
    extractionNote: "Generated support receipt record for demo customer history",
    ticketId: ticket.id,
    notes: `Receipt record tied to ${ticketDisplayId(ticket)}.`,
    warrantyRegistered: registered,
    registeredDate,
    registeredBy,
    verifiedBy: receiptUploaderForTicket(ticket),
    verificationNote: "Receipt details verified for support history"
  };
}

function mockReceiptSourceForTicket(ticket) {
  const supportedSources = ["Amazon", "iSpring direct", "Home Depot", "Lowe's", "Walmart"];
  const candidates = [ticket.purchaseSource, ticket.source, detectPurchaseSource(ticket), detectPurchaseSourceMention(ticket)];
  const verified = candidates.find((source) => supportedSources.includes(source));
  if (verified) return verified;
  return supportedSources[stableNumber(`${ticket.customer.email}${ticket.id}`) % supportedSources.length];
}

function mockReceiptOrderForTicket(ticket, source) {
  const currentOrder = String(ticket.order || "").trim();
  if (source === "Amazon" && /^\d{3}-\d{7}-\d{7}$/.test(currentOrder)) return currentOrder;
  if (source === "iSpring direct" && /^IS[-\s]?\d{4,}/i.test(currentOrder)) return currentOrder.replace(/\s+/g, "-").toUpperCase();
  if (source === "Home Depot" && /^HD[-\s]?\d{4,}/i.test(currentOrder)) return currentOrder.replace(/\s+/g, "-").toUpperCase();
  if (source === "Lowe's" && /^(LOW|LOWE|LOWES)[-\s]?\d{4,}/i.test(currentOrder)) return currentOrder.replace(/\s+/g, "-").toUpperCase();
  if (source === "Walmart" && /^(WM|WALMART)[-\s]?\d{4,}/i.test(currentOrder)) return currentOrder.replace(/\s+/g, "-").toUpperCase();
  return orderForSource(source, ticketNumberFromId(ticket) || stableNumber(ticket.id));
}

function mockReceiptFileType(source) {
  if (source === "Lowe's") return "JPG";
  if (source === "Walmart") return "PNG";
  return "PDF";
}

function mockReceiptFileName(ticket, source, orderNumber, fileType) {
  const sourceSlug = slugify(source === "iSpring direct" ? "ispring-direct" : source);
  const modelSlug = slugify(ticket.model || "model");
  const orderSlug = slugify(orderNumber || ticketDisplayId(ticket));
  return `${sourceSlug}-${modelSlug}-${orderSlug}-receipt.${fileType.toLowerCase()}`;
}

function mockReceiptPurchaseDate(ticket) {
  const base = new Date(ticket.createdAt || Date.now());
  const offsetDays = 18 + (stableNumber(`${ticket.id}${ticket.customer?.email}`) % 240);
  base.setDate(base.getDate() - offsetDays);
  return toDateInput(base.toISOString());
}

function mockReceiptUploadDate(ticket) {
  const base = new Date(ticket.createdAt || Date.now());
  base.setHours(base.getHours() + 2 + (stableNumber(ticket.id) % 18));
  return base.toISOString();
}

function mockReceiptRegisteredDate(ticket, uploadDate) {
  const base = new Date(uploadDate || ticket.createdAt || Date.now());
  base.setHours(base.getHours() + 3);
  return base.toISOString();
}

function mockReceiptFileSize(ticket, fileType) {
  const base = fileType === "PDF" ? 184000 : 945000;
  return base + (stableNumber(`${ticket.id}${fileType}`) % 87000);
}

function mockReceiptTotal(ticket) {
  const familyBase = {
    "Under Sink RO": 219,
    "Tankless RO": 489,
    "Whole House": 529,
    "Water Softener": 689,
    "UV": 329,
    "Sediment": 129,
    "Warranty": 199
  }[ticket.family] || 249;
  const cents = stableNumber(`${ticket.id}${ticket.model}`) % 90;
  const total = familyBase + (stableNumber(ticket.id) % 70) + cents / 100;
  return `$${total.toFixed(2)}`;
}

function syncMockWarrantyForReceipt(account, receipt, ticket) {
  const registered = Boolean(receipt.warrantyRegistered) || String(ticket.warranty || "").toLowerCase().includes("registered");
  let warranty = warrantyRecordForReceipt(account, receipt);
  if (!warranty) {
    warranty = {
      id: `warranty-${stableNumber(`${account.email}${receipt.id}${receipt.orderNumber}`)}`,
      receiptId: receipt.id || "",
      receiptFileName: receipt.fileName || "",
      status: "Not registered",
      registeredAt: "",
      registeredBy: "",
      source: receipt.source || "Unknown",
      orderNumber: receipt.orderNumber || "",
      model: receipt.model || "",
      ticketId: ticket.id || "",
      notes: "Generated from support receipt record"
    };
    account.warranties.push(warranty);
  }
  warranty.receiptId = warranty.receiptId || receipt.id || "";
  warranty.receiptFileName = receipt.fileName || warranty.receiptFileName || "";
  warranty.source = receipt.source || warranty.source || "Unknown";
  warranty.orderNumber = receipt.orderNumber || warranty.orderNumber || "";
  warranty.model = receipt.model || warranty.model || "";
  warranty.ticketId = ticket.id || warranty.ticketId || "";
  if (registered) {
    warranty.status = "Registered";
    warranty.registeredAt = warranty.registeredAt || receipt.registeredDate || mockReceiptRegisteredDate(ticket, receipt.uploadDate);
    warranty.registeredBy = warranty.registeredBy || receipt.registeredBy || receiptUploaderForTicket(ticket);
    receipt.warrantyRegistered = true;
    receipt.registeredDate = warranty.registeredAt;
    receipt.registeredBy = warranty.registeredBy;
    account.warrantyRegistered = true;
    account.warrantyRegisteredAt = account.warrantyRegisteredAt || warranty.registeredAt;
  } else {
    warranty.status = isRegisteredWarrantyRecord(warranty) ? warranty.status : "Not registered";
    receipt.warrantyRegistered = isRegisteredWarrantyRecord(warranty);
    receipt.registeredDate = receipt.warrantyRegistered ? warranty.registeredAt : "";
    receipt.registeredBy = receipt.warrantyRegistered ? warranty.registeredBy : "";
  }
}

function createEmptyCustomerAccount(email = "") {
  return {
    email: String(email || "").trim().toLowerCase(),
    receipts: [],
    warranties: [],
    warrantyRegistered: false,
    warrantyRegisteredAt: "",
    purchaseSource: "Unknown",
    orderNumber: "",
    name: "",
    phone: "",
    mobile: "",
    address: "",
    notes: "",
    accountNotes: []
  };
}

function normalizeRepName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return legacyRepNameMap[raw] || raw.replace(/^CS(\d+)\s*[·-]\s*/i, "CS$1 ");
}

function replaceLegacyRepNamesInText(value) {
  let text = String(value || "");
  Object.entries(legacyRepNameMap).forEach(([legacy, display]) => {
    text = text.split(legacy).join(display);
  });
  return text.replace(/\bCS(\d+)\s*[·-]\s*(Robert|Nick|Julius|Sean|Jonathan|Michelle)\b/g, "CS$1 $2");
}

function profileDisplayName() {
  return sessionUserAssignmentName() || normalizeRepName(profile?.displayName || currentDemoUserName());
}

function currentDemoUserName() {
  return sessionUserAssignmentName() || normalizeRepName(workspaceSettings?.currentUserName) || CURRENT_USER;
}

function currentDemoUserRole() {
  return sessionUserRole() || String(workspaceSettings?.currentUserRole || "").trim().toLowerCase() || "rep";
}

function receiptUploaderForTicket(ticket) {
  return normalizeRepName(ticket?.assignee) || profileDisplayName();
}

function sourceTicketForReceipt(receipt, candidates = tickets) {
  if (!receipt || !Array.isArray(candidates)) return null;
  return candidates.find((ticket) => String(ticket.id) === String(receipt.ticketId || "")) ||
    candidates.find((ticket) => recordMatchesTicket(receipt, ticket)) ||
    candidates.find((ticket) => ticket.attachments?.some((item) => item.type === "receipt" && item.file === receipt.fileName)) ||
    null;
}

function reconcileReceiptUploadersForAccount(account, history = tickets) {
  if (!account || !Array.isArray(account.receipts)) return false;
  const defaultUploaderNames = new Set([CURRENT_USER, currentDemoUserName(), profileDisplayName(), "Robert"].map(normalizeRepName).filter(Boolean));
  let changed = false;
  account.receipts.forEach((receipt) => {
    const sourceTicket = sourceTicketForReceipt(receipt, history);
    const assignedUploader = receiptUploaderForTicket(sourceTicket);
    const currentUploader = normalizeRepName(receipt.uploadedBy || "");
    if (assignedUploader && (!currentUploader || (defaultUploaderNames.has(currentUploader) && currentUploader !== assignedUploader))) {
      receipt.uploadedBy = assignedUploader;
      changed = true;
    }
  });
  return changed;
}

function repLabel() {
  return profileDisplayName();
}

function recordMatchesTicket(record, ticket) {
  const orderMatches = record.orderNumber && ticket.order && record.orderNumber.toLowerCase() === ticket.order.toLowerCase();
  const modelMatches = record.model && ticket.model && record.model.toLowerCase() === ticket.model.toLowerCase();
  const ticketMatches = record.ticketId && String(ticket.id) && String(record.ticketId) === String(ticket.id);
  if (ticketMatches) return true;
  if (ticket.order && record.orderNumber) return orderMatches;
  if (ticket.model && record.model) return modelMatches;
  return false;
}

function receiptRecordFor(ticket) {
  const account = accountForTicket(ticket);
  return account.receipts.find((record) => recordMatchesTicket(record, ticket)) || null;
}

function warrantyRecordFor(ticket) {
  const account = accountForTicket(ticket);
  return account.warranties.find((record) => recordMatchesTicket(record, ticket) && isRegisteredWarrantyRecord(record)) || null;
}

function receiptStatusFor(ticket) {
  if (receiptRecordFor(ticket)) return "On file";
  if (ticket.receiptReviewStatus) return ticket.receiptReviewStatus;
  return ticket.receipt ? "Attached" : "Not provided";
}

function warrantyStatusFor(ticket) {
  if (warrantyRecordFor(ticket)) return "Registered";
  if (ticket.warrantyReviewStatus) return ticket.warrantyReviewStatus;
  if (String(ticket?.warranty || "").toLowerCase().includes("registered")) return "Not registered";
  return ticket.warranty || "Needs review";
}

function isRegisteredWarrantyRecord(record) {
  if (!record || typeof record !== "object") return false;
  if (record.status) return record.status === "Registered";
  return Boolean(record.registeredAt);
}

function registeredWarrantyRecords(account) {
  return (account?.warranties || []).filter(isRegisteredWarrantyRecord);
}

function warrantyMatchesReceipt(warranty, receipt) {
  if (!warranty || !receipt) return false;
  if (warranty.receiptId && receipt.id) return warranty.receiptId === receipt.id;
  if (warranty.receiptFileName && receipt.fileName) return warranty.receiptFileName === receipt.fileName;
  const orderMatches = warranty.orderNumber && receipt.orderNumber && warranty.orderNumber.toLowerCase() === receipt.orderNumber.toLowerCase();
  const modelMatches = warranty.model && receipt.model && warranty.model.toLowerCase() === receipt.model.toLowerCase();
  return Boolean(orderMatches && modelMatches);
}

function warrantyRecordForReceipt(account, receipt) {
  if (!account || !receipt) return null;
  return (account.warranties || []).find((record) => warrantyMatchesReceipt(record, receipt)) || null;
}

function ensureWarrantyRecordForReceipt(account, receipt) {
  if (!account || !receipt) return null;
  account.warranties = Array.isArray(account.warranties) ? account.warranties : [];
  const existing = warrantyRecordForReceipt(account, receipt);
  if (existing) {
    existing.receiptId = existing.receiptId || receipt.id;
    existing.receiptFileName = existing.receiptFileName || receipt.fileName;
    existing.source = existing.source || receipt.source || "Unknown";
    existing.orderNumber = existing.orderNumber || receipt.orderNumber || "";
    existing.model = existing.model || receipt.model || "";
    existing.ticketId = existing.ticketId || receipt.ticketId || "";
    existing.status = isRegisteredWarrantyRecord(existing) ? "Registered" : "Not registered";
    receipt.warrantyRegistered = existing.status === "Registered";
    receipt.registeredDate = existing.registeredAt || "";
    receipt.registeredBy = existing.registeredBy || "";
    return existing;
  }
  const record = {
    id: `warranty-${Date.now()}-${stableNumber(`${account.email}${receipt.id || receipt.fileName}`)}`,
    receiptId: receipt.id || "",
    receiptFileName: receipt.fileName || "",
    status: "Not registered",
    registeredAt: "",
    registeredBy: "",
    source: receipt.source || account.purchaseSource || "Unknown",
    orderNumber: receipt.orderNumber || "",
    model: receipt.model || "",
    ticketId: receipt.ticketId || "",
    notes: "Awaiting warranty registration"
  };
  receipt.warrantyRegistered = false;
  receipt.registeredDate = "";
  receipt.registeredBy = "";
  account.warranties.push(record);
  return record;
}

function purchaseSourceFor(ticket, accountOverride = null, receiptOverride) {
  const account = accountOverride || accountForTicket(ticket);
  const receipt = receiptOverride === undefined ? receiptRecordFor(ticket) : receiptOverride;
  if (isVerifiedPurchaseSource(ticket.purchaseSource)) return ticket.purchaseSource;
  if (isVerifiedPurchaseSource(receipt?.source)) return receipt.source;
  if (isVerifiedPurchaseSource(account.purchaseSource)) return account.purchaseSource;
  if (["Unverified mention", "Not verified"].includes(ticket.purchaseSource)) return ticket.purchaseSource;
  return "Unknown";
}

function detectedPurchaseSourceReview(ticket) {
  const source = ticket?.detectedPurchaseSource;
  if (!isVerifiedPurchaseSource(source)) return "";
  return `Needs rep review: ${source}`;
}

function purchaseSourceDisplayFor(ticket) {
  return detectedPurchaseSourceReview(ticket) || purchaseSourceFor(ticket);
}

function purchaseSourcePreviewLabel(source) {
  if (source === "iSpring direct") return "iSpring Website";
  if (["Unverified mention", "Not verified", "Needs rep review"].includes(source)) return "Unknown";
  return source || "Unknown";
}

function purchaseSourcePreviewDisplayFor(ticket) {
  const confirmedSource = purchaseSourceFor(ticket);
  if (isVerifiedPurchaseSource(confirmedSource)) return purchaseSourcePreviewLabel(confirmedSource);
  if (isVerifiedPurchaseSource(ticket?.detectedPurchaseSource)) {
    return `${purchaseSourcePreviewLabel(ticket.detectedPurchaseSource)} / Not Registered`;
  }
  return purchaseSourcePreviewLabel(confirmedSource);
}

function extractReceiptMetadata(ticket, fileMeta = {}) {
  const fileName = fileMeta.fileName || "";
  const uploadDate = fileMeta.uploadDate || fileMeta.savedAt || new Date().toISOString();
  const uploadText = [
    fileName,
    fileMeta.mimeType,
    fileMeta.fileType,
    fileMeta.uploadedBy,
    fileMeta.uploadedAt,
    fileMeta.lastModified ? new Date(fileMeta.lastModified).toISOString() : ""
  ].join(" ");
  const source = workspaceConfig.purchaseSources.includes(fileMeta.source)
    ? fileMeta.source
    : detectPurchaseSourceFromAttachments([{ file: fileName, type: fileMeta.fileType || "receipt", uploaded: uploadDate }]);
  const orderNumber = extractReceiptOrderNumber(uploadText, source);
  const model = extractReceiptModel(uploadText);
  const customerEmail = extractReceiptEmail(uploadText);
  const customerName = extractReceiptCustomerName(fileName);
  const purchaseDate = extractReceiptPurchaseDate(uploadText);
  const resolvedOrder = fileMeta.orderNumber || orderNumber || ticket.order || "";
  const resolvedModel = fileMeta.model || model || ticket.model || "";
  const resolvedCustomerEmail = fileMeta.customerEmail || customerEmail || ticket.customer?.email || "";
  const resolvedCustomerName = fileMeta.customerName || customerName || ticket.customer?.name || "";
  const resolvedPurchaseDate = fileMeta.purchaseDate || purchaseDate || "";
  const detectedValues = [source !== "Unknown", resolvedOrder, resolvedModel, resolvedCustomerEmail, resolvedCustomerName, resolvedPurchaseDate].filter(Boolean).length;
  const hasDetectedPurchaseInfo = source !== "Unknown" || Boolean(resolvedOrder) || Boolean(resolvedModel);
  const resolvedSource = source;
  const needsReview = !hasDetectedPurchaseInfo || resolvedSource === "Unknown" || !resolvedOrder || !resolvedModel;
  const confidence = needsReview ? (detectedValues ? "Medium" : "Low") : "High";
  const extractionNote = detectedValues
    ? "Detected from receipt filename"
    : "Needs manual review";

  return {
    fileName,
    fileType: fileMeta.fileType || fileExtension(fileName).toUpperCase() || "Receipt",
    mimeType: fileMeta.mimeType || "",
    fileSize: Number(fileMeta.fileSize) || 0,
    savedAt: uploadDate,
    uploadDate,
    uploadedBy: fileMeta.uploadedBy || receiptUploaderForTicket(ticket),
    source: workspaceConfig.purchaseSources.includes(resolvedSource) ? resolvedSource : "Unknown",
    orderNumber: resolvedOrder || "",
    model: resolvedModel || "",
    customerName: resolvedCustomerName || "",
    customerEmail: resolvedCustomerEmail || "",
    purchaseDate: resolvedPurchaseDate || "",
    receiptTotal: fileMeta.receiptTotal || "",
    status: fileMeta.status || (needsReview ? "Needs Review" : "Uploaded"),
    confidence,
    extractionNote,
    warrantyRegistered: false,
    registeredDate: "",
    registeredBy: ""
  };
}

function extractReceiptOrderNumber(text, source = "Unknown") {
  const value = String(text || "");
  const amazon = value.match(/\b\d{3}-\d{7}-\d{7}\b/);
  if (amazon) return amazon[0];
  const ispring = value.match(/\bIS[-_\s]?\d{4,}\b/i);
  if (ispring) return ispring[0].replace(/[_\s]/g, "-").toUpperCase();
  const store = value.match(/\b(?:HD|LOWES|LOWE|WM|WALMART|EBAY|AMZN)[-_\s]?\d{4,}\b/i);
  if (store) return store[0].replace(/[_\s]/g, "-").toUpperCase();
  const labeled = value.match(/\b(?:order|invoice|receipt|po)[-_\s#:]*(?:no|number|num)?[-_\s#:]*(\d{5,}|\w{2,}[-_]\d{4,})\b/i);
  if (labeled?.[1]) return labeled[1].replace(/_/g, "-").toUpperCase();
  if (source === "Amazon") {
    const compactAmazon = value.match(/\b\d{3}[-_\s]\d{7}[-_\s]\d{7}\b/);
    if (compactAmazon) return compactAmazon[0].replace(/[_\s]/g, "-");
  }
  return "";
}

function extractReceiptModel(text) {
  const match = String(text || "").match(/\b(?:RCC7[A-Z0-9-]*|RO500[A-Z0-9-]*|WGB\d+[A-Z0-9-]*|WCS\d+[A-Z0-9-]*|UVF\d+[A-Z0-9-]*|WSP\d+[A-Z0-9-]*)\b/i);
  return match ? match[0].toUpperCase() : "";
}

function extractReceiptEmail(text) {
  const match = String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : "";
}

function extractReceiptCustomerName(fileName) {
  const base = String(fileName || "").replace(/\.[^.]+$/, "");
  const match = base.match(/\b(?:customer|cust|buyer)[-_\s]+([a-z]+[-_\s]+[a-z]+)\b/i);
  if (!match?.[1]) return "";
  return match[1]
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function extractReceiptPurchaseDate(text) {
  const value = String(text || "");
  const iso = value.match(/\b(20\d{2})[-_](0?[1-9]|1[0-2])[-_](0?[1-9]|[12]\d|3[01])\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const us = value.match(/\b(0?[1-9]|1[0-2])[-_](0?[1-9]|[12]\d|3[01])[-_](20\d{2})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return "";
}

function addReceiptToAccount(account, ticket, notes = "", fileMeta = {}) {
  if (!account || !ticket) return false;
  account.receipts = Array.isArray(account.receipts) ? account.receipts : [];
  const receiptFiles = ticket.attachments?.filter(isReceiptAttachment) || [];
  const sourceFile = fileMeta.fileName
    ? receiptFiles.find((file) => (file.file || file.fileName) === fileMeta.fileName) || null
    : receiptFiles[0] || null;
  const fileName = fileMeta.fileName || sourceFile?.file || sourceFile?.fileName || `${ticketDisplayId(ticket)} receipt metadata`;
  const extracted = extractReceiptMetadata(ticket, { ...sourceFile, ...fileMeta, fileName });
  const exists = account.receipts.some((record) =>
    record.fileName === fileName &&
    String(record.orderNumber || "").toLowerCase() === String(extracted.orderNumber || "").toLowerCase() &&
    String(record.model || "").toLowerCase() === String(extracted.model || "").toLowerCase()
  );
  if (exists) return false;
  const receipt = {
    id: `receipt-${Date.now()}-${stableNumber(`${account.email}${ticket.id}${fileName}`)}`,
    fileName,
    ...extracted,
    ticketId: ticket.id,
    notes
  };
  if (receipt.source !== "Unknown" && account.purchaseSource === "Unknown") account.purchaseSource = receipt.source;
  if (receipt.orderNumber && !account.orderNumber) account.orderNumber = receipt.orderNumber;
  account.receipts.push(receipt);
  ensureWarrantyRecordForReceipt(account, receipt);
  return true;
}

function addWarrantyToAccount(account, ticket, notes = "", receipt = null) {
  if (!account || !ticket) return false;
  account.warranties = Array.isArray(account.warranties) ? account.warranties : [];
  const linkedReceipt = receipt || account.receipts?.find((record) => recordMatchesTicket(record, ticket)) || null;
  const existing = linkedReceipt
    ? ensureWarrantyRecordForReceipt(account, linkedReceipt)
    : account.warranties.find((record) => recordMatchesTicket(record, ticket));
  const wasRegistered = existing && isRegisteredWarrantyRecord(existing);
  const registeredAt = new Date().toISOString();
  const record = existing || {
    id: `warranty-${Date.now()}-${stableNumber(`${account.email}${ticket.id}`)}`,
    receiptId: linkedReceipt?.id || "",
    receiptFileName: linkedReceipt?.fileName || "",
    status: "Not registered",
    registeredAt: "",
    registeredBy: "",
    source: purchaseSourceFor(ticket, account, linkedReceipt) || account.purchaseSource || "Unknown",
    orderNumber: ticket.order || "",
    model: ticket.model || "",
    ticketId: ticket.id,
    notes: ""
  };
  record.status = "Registered";
  record.registeredAt = registeredAt;
  record.registeredBy = profileDisplayName();
  record.receiptId = record.receiptId || linkedReceipt?.id || "";
  record.receiptFileName = record.receiptFileName || linkedReceipt?.fileName || "";
  record.source = purchaseSourceFor(ticket, account, linkedReceipt) || record.source || account.purchaseSource || "Unknown";
  record.orderNumber = ticket.order || record.orderNumber || "";
  record.model = ticket.model || record.model || "";
  record.ticketId = ticket.id || record.ticketId || "";
  record.notes = notes || record.notes || "";
  if (!existing) account.warranties.push(record);
  if (linkedReceipt) {
    linkedReceipt.warrantyRegistered = true;
    linkedReceipt.registeredDate = registeredAt;
    linkedReceipt.registeredBy = profileDisplayName();
  }
  account.warrantyRegistered = true;
  account.warrantyRegisteredAt = account.warrantyRegisteredAt || registeredAt;
  return !wasRegistered;
}

function unregisterWarrantyRecord(account, warranty, ticket, notes = "") {
  if (!account || !warranty) return false;
  const wasRegistered = isRegisteredWarrantyRecord(warranty);
  warranty.status = "Not registered";
  warranty.registeredAt = "";
  warranty.registeredBy = "";
  warranty.notes = notes || "Warranty registration removed";
  const receipt = account.receipts?.find((record) => warrantyMatchesReceipt(warranty, record));
  if (receipt) {
    receipt.warrantyRegistered = false;
    receipt.registeredDate = "";
    receipt.registeredBy = "";
  }
  const registered = registeredWarrantyRecords(account);
  account.warrantyRegistered = registered.length > 0;
  account.warrantyRegisteredAt = registered[0]?.registeredAt || "";
  if (ticket && warrantyMatchesTicket(warranty, ticket)) {
    ticket.warranty = "Not registered";
  }
  return wasRegistered;
}

function warrantyMatchesTicket(warranty, ticket) {
  if (!warranty || !ticket) return false;
  return recordMatchesTicket(warranty, ticket);
}

function setTicketPurchaseSource(ticket, source, actor = "System", manual = false, options = {}) {
  const nextSource = workspaceConfig.purchaseSources.includes(source) ? source : "Unknown";
  if (!ticket) return false;
  if (!manual) {
    return recordAiPurchaseSourceDetection(ticket, nextSource, actor, options);
  }
  if (ticket.purchaseSource === nextSource && ticket.purchaseSourceMode === "manual") return false;
  ticket.purchaseSource = nextSource;
  ticket.purchaseSourceMode = "manual";
  ticket.detectedPurchaseSource = "";
  const account = accountForTicket(ticket);
  if (isVerifiedPurchaseSource(nextSource)) account.purchaseSource = nextSource;
  ticket.conversation.push({
    type: "timeline",
    author: "System",
    timestamp: new Date().toISOString(),
    body: `Purchase source updated to ${nextSource} by ${actor}.`
  });
  persistCustomerAccounts();
  persistTickets();
  return true;
}

function recordAiPurchaseSourceDetection(ticket, source, actor = "System", options = {}) {
  if (!ticket) return false;
  const nextSource = workspaceConfig.purchaseSources.includes(source) ? source : "Unknown";
  const timestamp = options.timestamp || new Date().toISOString();
  let changed = false;
  if (nextSource !== "Unknown") {
    if (ticket.detectedPurchaseSource !== nextSource) {
      ticket.detectedPurchaseSource = nextSource;
      changed = true;
    }
    if (!isVerifiedPurchaseSource(ticket.purchaseSource) || ticket.purchaseSourceMode === "ai-detected") {
      if (ticket.purchaseSource !== "Not verified") {
        ticket.purchaseSource = "Not verified";
        changed = true;
      }
      if (ticket.purchaseSourceMode !== "ai-detected") {
        ticket.purchaseSourceMode = "ai-detected";
        changed = true;
      }
    }
  }
  const body = nextSource !== "Unknown"
    ? options.fromAttachment
      ? `${actor} detected possible purchase source from attachment: ${nextSource}. Needs rep review.`
      : `Unverified purchase source mention: ${nextSource}. Receipt/order proof needed.`
    : "Attachment uploaded; purchase source needs review.";
  const hasEvent = ticket.conversation?.some((message) => message.author === actor && message.body === body);
  if (!hasEvent) {
    ticket.conversation.push({
      type: "timeline",
      author: actor,
      timestamp,
      body
    });
    changed = true;
  }
  return changed;
}

function saveTicketReceiptToAccount(ticket) {
  const account = accountForTicket(ticket);
  ticket.receipt = true;
  ticket.receiptReviewStatus = "";
  const uploadedBy = receiptUploaderForTicket(ticket);
  const added = addReceiptToAccount(account, ticket, `Saved from ${ticketDisplayId(ticket)} by ${uploadedBy}`, { uploadedBy });
  if (!isVerifiedPurchaseSource(ticket.purchaseSource)) {
    const detected = detectPurchaseSource(ticket);
    if (detected !== "Unknown") setTicketPurchaseSource(ticket, detected, "System", false, { fromAttachment: true });
  }
  ticket.conversation.push({
    type: "timeline",
    author: "System",
    timestamp: new Date().toISOString(),
    body: added
      ? `Receipt saved to customer account by ${uploadedBy}.`
      : `Receipt already on file for this customer account.`
  });
  persistCustomerAccounts();
  persistTickets();
  render();
  showToast("Receipt saved to customer account.");
}

function saveUploadedReceiptToAccount(ticket, file) {
  if (!ticket || !isAcceptedReceiptFile(file)) return false;
  const account = accountForTicket(ticket);
  const uploadedBy = receiptUploaderForTicket(ticket);
  const uploadedAt = new Date().toISOString();
  const fileMeta = {
    fileName: file.name,
    fileType: receiptFileType(file),
    mimeType: file.type || "",
    fileSize: file.size || 0,
    uploadDate: uploadedAt,
    uploadedBy,
    lastModified: file.lastModified || 0
  };
  ticket.receipt = true;
  ticket.receiptReviewStatus = "";
  ticket.attachments = Array.isArray(ticket.attachments) ? ticket.attachments : [];
  if (!ticket.attachments.some((item) => item.file === file.name && item.type === "receipt")) {
    ticket.attachments.push({
      file: file.name,
      type: "receipt",
      uploaded: dateTimeLabel(uploadedAt),
      uploadedBy
    });
  }
  const added = addReceiptToAccount(account, ticket, `Uploaded from Customer History for ${ticketDisplayId(ticket)} by ${uploadedBy}`, fileMeta);
  ticket.conversation.push({
    type: "timeline",
    author: "System",
    timestamp: uploadedAt,
    body: added
      ? `Receipt ${file.name} uploaded by ${uploadedBy} and saved to customer history.`
      : `Receipt ${file.name} already exists in customer history.`
  });
  if (!isVerifiedPurchaseSource(ticket.purchaseSource)) {
    const detected = detectPurchaseSource(ticket);
    if (detected !== "Unknown") setTicketPurchaseSource(ticket, detected, "System", false, { fromAttachment: true });
    else recordAiPurchaseSourceDetection(ticket, "Unknown", "System", { timestamp: uploadedAt, fromAttachment: true });
  }
  persistCustomerAccounts();
  persistTickets();
  addNotification({
    category: "receipts",
    title: "Receipt needs review",
    description: `${file.name} was uploaded for ${ticketDisplayId(ticket)} and needs verification.`,
    ticketId: ticket.id
  });
  return true;
}

function registerTicketWarranty(ticket) {
  const account = accountForTicket(ticket);
  ticket.warranty = "Registered";
  ticket.warrantyReviewStatus = "";
  const receipt = receiptRecordFor(ticket);
  const added = addWarrantyToAccount(account, ticket, `Registered from ${ticketDisplayId(ticket)} by ${profileDisplayName()}`, receipt);
  ticket.conversation.push({
    type: "timeline",
    author: "System",
    timestamp: new Date().toISOString(),
    body: added
      ? `Warranty registered by ${profileDisplayName()}${receipt?.fileName ? ` for receipt ${receipt.fileName}` : ""}.`
      : `Warranty registration already on file.`
  });
  persistCustomerAccounts();
  persistTickets();
  addNotification({
    category: "receipts",
    title: "Warranty registration needs action",
    description: `${ticketDisplayId(ticket)} warranty was marked registered. Review receipt coverage details.`,
    ticketId: ticket.id
  });
  render();
  showToast("Warranty marked registered.");
}

function registerWarrantyForReceipt(ticket, receiptId) {
  const account = accountForTicket(ticket);
  const receipt = account.receipts.find((record) => record.id === receiptId);
  if (!receipt) return;
  const added = addWarrantyToAccount(account, ticket, `Registered from Customer History by ${profileDisplayName()}`, receipt);
  if (recordMatchesTicket(receipt, ticket)) {
    ticket.warranty = "Registered";
    ticket.warrantyReviewStatus = "";
  }
  ticket.conversation.push({
    type: "timeline",
    author: "System",
    timestamp: new Date().toISOString(),
    body: added
      ? `Warranty registered by ${profileDisplayName()} for receipt ${receipt.fileName}.`
      : `Warranty registration already on file for receipt ${receipt.fileName}.`
  });
  persistCustomerAccounts();
  persistTickets();
  addNotification({
    category: "receipts",
    title: "Warranty registration needs action",
    description: `${receipt.fileName} is linked to a warranty update for ${ticketDisplayId(ticket)}.`,
    ticketId: ticket.id
  });
  render();
  showToast("Warranty marked registered.");
}

function openUnregisterWarrantyConfirmModal(ticketId, warrantyId) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket) return;
  const account = accountForTicket(ticket);
  const warranty = account.warranties.find((record) => record.id === warrantyId);
  if (!warranty) return;
  el.workflowConfirmModal.innerHTML = `
    <form id="unregisterWarrantyConfirmForm">
      <div class="modal-header">
        <div>
          <p class="eyebrow">Confirm warranty update</p>
          <h2>Remove registration status?</h2>
          <p>${escapeHtml(warranty.receiptFileName || ticketDisplayId(ticket))}</p>
        </div>
        <button class="icon-button" id="closeWorkflowConfirmButton" aria-label="Close" type="button">x</button>
      </div>
      <div class="confirmation-body">
        <dl class="info-list confirmation-list">
          <div><dt>Customer</dt><dd>${escapeHtml(ticket.customer.email)}</dd></div>
          <div><dt>Receipt</dt><dd>${escapeHtml(warranty.receiptFileName || "Not linked")}</dd></div>
          <div><dt>Order</dt><dd>${escapeHtml(warranty.orderNumber || "Not provided")}</dd></div>
          <div><dt>Model</dt><dd>${escapeHtml(warranty.model || "Not provided")}</dd></div>
        </dl>
        <p class="muted">This will mark the warranty as not registered for this receipt/product record.</p>
      </div>
      <div class="modal-actions">
        <button class="secondary-button" id="cancelWorkflowConfirmButton" type="button">Cancel</button>
        <button class="primary-button danger-button" type="submit">Remove registration</button>
      </div>
    </form>
  `;
  openWorkflowConfirmModal();
  bindWorkflowCloseButtons();
  el.workflowConfirmModal.querySelector("#unregisterWarrantyConfirmForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const removed = unregisterWarrantyRecord(account, warranty, ticket, `Registration removed by ${profileDisplayName()}`);
    if (removed) {
      ticket.conversation.push({
        type: "timeline",
        author: "System",
        timestamp: new Date().toISOString(),
        body: `Warranty registration removed by ${profileDisplayName()}${warranty.receiptFileName ? ` for receipt ${warranty.receiptFileName}` : ""}.`
      });
    }
    persistCustomerAccounts();
    persistTickets();
    closeWorkflowConfirmModal();
    openCustomerHistory(ticket.id, "receipts");
    render();
    showToast("Warranty registration removed.");
  });
}

function applyCustomerAccountToTicket(ticket) {
  const account = accountForTicket(ticket);
  let changed = false;
  const receipt = receiptRecordFor(ticket);
  const warranty = warrantyRecordFor(ticket);
  if (receipt && !ticket.receipt && ticket.receiptReviewStatus !== "Needs rep review") {
    ticket.receiptReviewStatus = "Needs rep review";
    if (!ticket.conversation.some((message) => /detected receipt already on file for this customer account/i.test(message.body))) ticket.conversation.push({
      type: "timeline",
      author: "System",
      timestamp: new Date().toISOString(),
      body: "System detected receipt already on file for this customer account. Needs rep review."
    });
    changed = true;
  }
  if (warranty && ticket.warranty !== "Registered" && ticket.warrantyReviewStatus !== "Needs rep review") {
    ticket.warrantyReviewStatus = "Needs rep review";
    if (!ticket.conversation.some((message) => /detected possible registered warranty on this customer account/i.test(message.body))) ticket.conversation.push({
      type: "timeline",
      author: "System",
      timestamp: new Date().toISOString(),
      body: "System detected possible registered warranty on this customer account. Needs rep review."
    });
    changed = true;
  }
  if ((!ticket.purchaseSource || ["Unknown", "Unverified mention", "Not verified"].includes(ticket.purchaseSource)) && isVerifiedPurchaseSource(account.purchaseSource)) {
    if (ticket.detectedPurchaseSource !== account.purchaseSource) {
      ticket.detectedPurchaseSource = account.purchaseSource;
      ticket.purchaseSource = "Not verified";
      ticket.purchaseSourceMode = "ai-detected";
      changed = true;
    }
    if (!ticket.conversation.some((message) => /detected possible purchase source from saved customer account/i.test(message.body) && message.body.includes(account.purchaseSource))) ticket.conversation.push({
      type: "timeline",
      author: "System",
      timestamp: new Date().toISOString(),
      body: `System detected possible purchase source from saved customer account: ${account.purchaseSource}. Needs rep review.`
    });
    changed = true;
  }
  return changed;
}

function render({ preserveQueueList = uiState.activeScreen !== "queue", suppressQueueRowEnter = false } = {}) {
  queueDebugState.renderTableCalled = false;
  queueDebugState.renderError = "";
  queueDebugState.recoveredTickets = false;
  ensureUsableTicketData();
  reopenClosedWaitingTicketsWithCustomerReply();
  const ticketStorage = storedTicketState();
  queueDebugState.localStorageTicketKey = ticketStorage.key;
  queueDebugState.localStorageTicketsFound = ticketStorage.found;
  renderNav();
  renderQueueTabs();
  document.body.classList.toggle("queue-view-open", uiState.activeScreen === "queue" && activeView === "open");
  renderMetrics();
  updateProfileButton();
  renderNotifications();

  const shouldRenderQueueList = uiState.activeScreen === "queue" || !el.ticketList?.innerHTML.trim();
  const visibleTickets = shouldRenderQueueList || !preserveQueueList || !cachedVisibleTickets.length
    ? getVisibleTickets()
    : cachedVisibleTickets;
  if (shouldRenderQueueList) cachedVisibleTickets = visibleTickets;
  pruneBulkSelection(visibleTickets);
  if (uiState.activeScreen === "queue" && !visibleTickets.some((ticket) => ticket.id === selectedTicketId)) {
    selectedTicketId = visibleTickets[0]?.id || tickets[0]?.id || "";
  } else if (!selectedTicketId) {
    selectedTicketId = visibleTickets[0]?.id || tickets[0]?.id || "";
  }

  el.queueTitle.textContent = queueTitleForActiveView();
  if (shouldRenderQueueList) {
    renderToolbarSelectOptions();
    renderBulkActions(visibleTickets);
    renderQueuePreview(selectedTicket());
    renderTicketList(visibleTickets, { animateRows: !suppressQueueRowEnter });
  }
  renderConversation(selectedTicket());
  renderContext(selectedTicket());
  renderAdminPanel();
  renderKnowledgeVaultPanel();
  renderDashboardPanel();
  applyUiState();
  animateViewTransition();
  refreshCustomSelects();
  hardenEditableFields();
  if (shouldScrollToLatestOnOpen) {
    shouldScrollToLatestOnOpen = false;
    scrollTicketDetailToLatest();
  } else if (shouldScrollThreadToBottom) {
    shouldScrollThreadToBottom = false;
    scrollConversationToBottom("auto");
  }
}

function renderAppFooter(extraClass = "") {
  return `
    <footer class="app-footer scroll-footer ${escapeHtml(extraClass)}" aria-label="Copyright">
      Copyright &copy; 2026 RepOS, LLC. All Rights Reserved.
    </footer>
  `;
}

function renderQueueTabs() {
  const hasExpectedTabs = queueTabConfig.every((tab) => el.queueViewTabs.querySelector(`[data-queue-tab="${tab.id}"]`));
  const needsInitialRender = !el.queueViewTabs.querySelector(".queue-tab-indicator") || !hasExpectedTabs;

  if (needsInitialRender) {
    el.queueViewTabs.innerHTML = `
      <span class="queue-tab-indicator motion-tab-indicator" aria-hidden="true"></span>
      ${queueTabConfig
        .map((tab) => `
          <button class="queue-view-tab ${tab.id === "closed" ? "closed-tab" : ""}" data-queue-tab="${tab.id}" aria-pressed="false" type="button"${tab.id === "closed" ? ` aria-haspopup="listbox" aria-expanded="false"` : ""}>
            <span class="queue-tab-label">${escapeHtml(tab.label)}</span>
            <span class="queue-tab-count" data-queue-tab-count="${tab.id}"></span>
            ${tab.id === "closed" ? `<svg class="closed-tab-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>` : ""}
          </button>
        `)
        .join("")}
      <div class="closed-range-menu" id="closedRangeMenu" role="listbox" hidden></div>
    `;

    el.queueViewTabs.querySelector("#closedRangeMenu")?.addEventListener("click", (event) => {
      const option = event.target.closest("[data-closed-range]");
      if (!option) return;
      filters.closedDateRange = option.dataset.closedRange;
      closedRangeMenuOpen = false;
      resetQueuePagination();
      render();
    });
  }

  queueTabConfig.forEach((tab) => {
    const button = el.queueViewTabs.querySelector(`[data-queue-tab="${tab.id}"]`);
    const countNode = el.queueViewTabs.querySelector(`[data-queue-tab-count="${tab.id}"]`);
    const count = queueTabCount(tab);
    const active = tab.id === activeView;
    button?.classList.toggle("active", active);
    button?.setAttribute("aria-pressed", String(active));
    if (countNode) {
      countNode.textContent = count;
      countNode.setAttribute("aria-label", queueTabCountLabel(tab, count));
    }
  });

  const closedButton = el.queueViewTabs.querySelector('[data-queue-tab="closed"]');
  const closedMenu = el.queueViewTabs.querySelector("#closedRangeMenu");
  const menuOpen = closedRangeMenuOpen && activeView === "closed" && uiState.activeScreen === "queue";
  if (closedButton) {
    closedButton.classList.toggle("menu-open", menuOpen);
    closedButton.setAttribute("aria-expanded", String(menuOpen));
  }
  if (closedMenu) {
    closedMenu.hidden = !menuOpen;
    if (menuOpen) {
      closedMenu.innerHTML = closedDateRangeOptions.map((option) => `
        <button class="closed-range-option ${filters.closedDateRange === option ? "selected" : ""}" data-closed-range="${escapeHtml(option)}" role="option" aria-selected="${filters.closedDateRange === option}" type="button">
          <span>${escapeHtml(option)}</span>
          <span class="closed-range-count">${closedCountForRange(option)}</span>
        </button>
      `).join("");
      if (closedButton) closedMenu.style.left = `${closedButton.offsetLeft}px`;
    }
  }

  requestAnimationFrame(syncQueueTabIndicator);
}

function queueTabCount(tab) {
  return tickets.filter(tab.match).length;
}

function queueTabCountLabel(tab, count) {
  if (tab.id === "open") return `${count} open tickets across all reps`;
  if (tab.id === "assigned") return `${count} active tickets assigned to you`;
  return `${count} total tickets in Closed tab`;
}

function closedCountForRange(range) {
  const { start, end } = closedDateRangeBounds(range);
  return tickets.filter((ticket) => {
    if (!isClosedDisplayStatus(ticket)) return false;
    const closedAt = ticketClosedAt(ticket);
    if (!closedAt) return false;
    const closedDate = new Date(closedAt);
    if (Number.isNaN(closedDate.getTime())) return false;
    return closedDate >= start && closedDate < end;
  }).length;
}

function syncQueueTabIndicator() {
  if (!el.queueViewTabs) return;
  const indicator = el.queueViewTabs.querySelector(".queue-tab-indicator");
  const activeTab = el.queueViewTabs.querySelector(".queue-view-tab.active");
  if (!indicator || !activeTab) return;

  const groupRect = el.queueViewTabs.getBoundingClientRect();
  const tabRect = activeTab.getBoundingClientRect();
  indicator.style.setProperty("--queue-tab-x", `${tabRect.left - groupRect.left}px`);
  indicator.style.setProperty("--queue-tab-y", `${tabRect.top - groupRect.top}px`);
  indicator.style.setProperty("--queue-tab-width", `${tabRect.width}px`);
  indicator.style.setProperty("--queue-tab-height", `${tabRect.height}px`);
  indicator.classList.add("ready");
}

function renderQueuePreview(ticket) {
  if (!el.queuePreview) return;
  if (!ticket || uiState.activeScreen !== "queue") {
    el.queuePreview.innerHTML = "";
    return;
  }

  el.queuePreview.innerHTML = `
    <div class="preview-scroll">
      <div class="preview-copy">
        <div class="header-row">
          <span class="ticket-id">${escapeHtml(ticketDisplayId(ticket))}</span>
          <span class="badge status ${statusBadgeModifier(displayStatusFor(ticket))}"><span>Status</span> ${escapeHtml(displayStatusFor(ticket))}</span>
        </div>
        <strong>${escapeHtml(ticket.subject)}</strong>
      </div>
      <dl class="preview-meta preview-brief">
        <div><dt>Customer</dt><dd>${fieldValue(ticket.customer.name)}</dd></div>
        <div><dt>Email</dt><dd>${fieldValue(ticket.customer.email)}</dd></div>
        <div><dt>Phone</dt><dd>${fieldValue(ticket.customer.phone)}</dd></div>
        <div><dt>Assigned rep</dt><dd>${fieldValue(ticket.assignee)}</dd></div>
        <div><dt>Model</dt><dd>${fieldValue(ticket.model)}</dd></div>
        <div><dt>Order number</dt><dd>${fieldValue(ticket.order)}</dd></div>
        <div class="preview-purchase-source"><dt>Purchase source</dt><dd>${fieldValue(purchaseSourcePreviewDisplayFor(ticket))}</dd></div>
        <div><dt>Receipt</dt><dd>${fieldValue(receiptStatusFor(ticket))}</dd></div>
        <div><dt>Warranty</dt><dd>${fieldValue(warrantyStatusFor(ticket))}</dd></div>
        <div><dt>Last updated</dt><dd>${fieldValue(dateTimeLabel(lastUpdatedAt(ticket)))}</dd></div>
      </dl>
      <div class="preview-actions">
        <button class="primary-button preview-open-ticket-button" id="openPreviewTicketButton" type="button">Open ticket</button>
      </div>
    </div>
  `;

  el.queuePreview.querySelector("#openPreviewTicketButton")?.addEventListener("click", () => openTicketDetail(ticket.id));
}

function openProfileModal(tab = activeProfileTab) {
  activeProfileTab = typeof tab === "string" ? tab : activeProfileTab || "account";
  if (!["account", "preferences", "signature", "notifications", "workspace"].includes(activeProfileTab)) activeProfileTab = "account";
  renderProfileModal();
  el.profileModal.hidden = false;
  el.profileModal.removeAttribute("hidden");
  if (typeof el.profileModal.showModal === "function" && !el.profileModal.open) {
    el.profileModal.showModal();
  } else {
    el.profileModal.setAttribute("open", "");
  }
  applyUiState();
  spinSettingsIconOnce();
}

function closeProfileModal() {
  const dialog = el.profileModal;
  animateDialogClose(dialog, () => {
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    dialog.hidden = true;
    dialog.setAttribute("hidden", "");
    applyUiState();
  });
}

function renderProfileModal() {
  const workload = activeTicketCountFor(currentDemoUserName());
  const adminBadge = currentUserIsAdmin() ? `<span class="admin-badge">Admin</span>` : "";
  el.profileModal.innerHTML = `
    <form id="profileForm" class="profile-settings-form">
      <div class="profile-hero">
        <div class="profile-avatar" aria-hidden="true">${escapeHtml(profileInitials())}</div>
        <div>
          <p class="eyebrow">My Profile</p>
          <h2>${escapeHtml(profile.displayName)}</h2>
          <p>${escapeHtml(workspaceConfig.productName)} account settings for the ${escapeHtml(workspaceConfig.workspaceName)} workspace.</p>
          ${adminBadge}
        </div>
        <button class="icon-button" id="closeProfileButton" aria-label="Close profile settings" type="button">x</button>
      </div>
      <div class="profile-tabs" role="tablist" aria-label="Profile settings tabs">
        <span class="profile-tab-indicator motion-tab-indicator" aria-hidden="true"></span>
        ${profileTabButton("account", "Account")}
        ${profileTabButton("preferences", "Preferences")}
        ${profileTabButton("signature", "Signature")}
        ${profileTabButton("notifications", "Notifications")}
        ${profileTabButton("workspace", "Workspace")}
      </div>
      <div class="profile-tab-panels">
        ${renderAccountTab()}
        ${renderPreferencesTab()}
        ${renderSignatureTab()}
        ${renderNotificationsTab()}
        ${renderWorkspaceTab(workload)}
      </div>
      <div class="profile-actions">
        <button class="secondary-button" id="cancelProfileButton" type="button">Close</button>
        <button class="primary-button" type="submit">Save settings</button>
      </div>
    </form>
  `;

  el.profileModal.querySelector("#closeProfileButton").addEventListener("click", closeProfileModal);
  el.profileModal.querySelector("#cancelProfileButton").addEventListener("click", closeProfileModal);
  el.profileModal.querySelector("#profileForm").addEventListener("submit", handleProfileSave);
  el.profileModal.querySelectorAll("[data-profile-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextTab = button.dataset.profileTab;
      if (nextTab === activeProfileTab) return;
      const panelScroller = el.profileModal.querySelector(".profile-tab-panels");
      if (panelScroller) panelScroller.scrollTop = 0;
      activeProfileTab = nextTab;
      updateProfileTabState();
    });
  });
  el.profileModal.querySelector("#manageAssignmentPoolButton")?.addEventListener("click", () => {
    closeProfileModal();
    showAdminScreen();
  });
  el.profileModal.querySelector("#resetWorkspaceDataButton")?.addEventListener("click", () => {
    if (resetDemoData()) closeProfileModal();
  });
  updateProfileTabState();
}

function profileTabButton(id, label) {
  return `<button class="${activeProfileTab === id ? "active" : ""}" data-profile-tab="${id}" role="tab" aria-selected="${activeProfileTab === id}" type="button"><span>${label}</span></button>`;
}

function renderAccountTab() {
  return `
    <section class="profile-tab-panel" data-profile-panel="account" role="tabpanel">
      <div class="profile-section-title">
        <h3>Account</h3>
        <p>Edit the profile details RepOS shows to teammates and customers.</p>
      </div>
      <div class="profile-grid account-grid">
        ${profileInput("firstName", "First name", profile.firstName)}
        ${profileInput("lastName", "Last name", profile.lastName)}
        ${profileInput("displayName", "Display name", profile.displayName)}
        ${profileInput("email", "Email address", profile.email, "email")}
        ${profileInput("phone", "Phone number", profile.phone)}
        ${profileInput("mobile", "Mobile number", profile.mobile)}
        ${profileInput("extension", "Extension", profile.extension)}
        ${profileInput("username", "Username", profile.username)}
        ${profileInput("role", "Role", profile.role)}
      </div>
    </section>
  `;
}

function renderPreferencesTab() {
  const defaultSort = normalizeSortPreference(profile.defaultSort);
  return `
    <section class="profile-tab-panel" data-profile-panel="preferences" role="tabpanel">
      <div class="profile-section-title">
        <h3>Preferences</h3>
        <p>Customize how RepOS opens, scans, and presents queues.</p>
      </div>
      <div class="profile-grid">
        ${profileSelect("defaultLandingView", "Default landing view", ["Open Tickets", "Closed Tickets"], landingLabel(profile.defaultLandingView))}
        ${profileSelect("theme", "Theme", ["Light", "Dark", "System"], profile.theme)}
        ${profileSelect("ticketDensity", "Ticket density", ["Comfortable", "Compact", "Ultra Compact"], profile.ticketDensity)}
        ${profileSelect("defaultSort", "Default sort", ["Last Updated", "SLA", "Newest"], defaultSort)}
        <label class="profile-field accent-field">
          <span>Accent color</span>
          <input name="accentColor" type="color" value="${escapeHtml(profile.accentColor)}">
        </label>
        ${profileCheckbox("showMetrics", "Show metrics", profile.showMetrics)}
        ${profileCheckbox("sidebarCollapsedDefault", "Sidebar collapsed by default", profile.sidebarCollapsedDefault)}
        ${profileCheckbox("autoOpenFirstTicket", "Auto-open first ticket", profile.autoOpenFirstTicket)}
      </div>
    </section>
  `;
}

function renderSignatureTab() {
  return `
    <section class="profile-tab-panel" data-profile-panel="signature" role="tabpanel">
      <div class="profile-section-title">
        <h3>Signature</h3>
        <p>Set the signature RepOS can insert into customer replies.</p>
      </div>
      <div class="profile-grid signature-grid">
        <label class="profile-field full-span">
          <span>My Signature editor</span>
          <textarea name="mySignature" rows="5">${escapeHtml(profile.mySignature)}</textarea>
        </label>
        <div class="signature-preview">
          <span>Department Signature preview</span>
          <p>${escapeHtml(profile.departmentSignature).replaceAll("\n", "<br>")}</p>
        </div>
        ${profileSelect("defaultSignature", "Default signature option", ["None", "My Signature", "Department Signature"], profile.defaultSignature)}
        ${profileCheckbox("insertSignature", "Insert signature into reply editor", profile.insertSignature)}
      </div>
    </section>
  `;
}

function renderNotificationsTab() {
  return `
    <section class="profile-tab-panel" data-profile-panel="notifications" role="tabpanel">
      <div class="profile-section-title">
        <h3>Notifications</h3>
        <p>Choose how RepOS should alert you during active support work.</p>
      </div>
      <div class="profile-grid">
        ${profileCheckbox("inAppNotifications", "In-app notifications", profile.inAppNotifications)}
        ${profileCheckbox("emailNotifications", "Email notifications", profile.emailNotifications)}
        ${profileCheckbox("notifyAssigned", "Assigned tickets", profile.notifyAssigned)}
        ${profileCheckbox("notifyCustomerReplies", "Customer replies", profile.notifyCustomerReplies)}
        ${profileCheckbox("notifySlaOverdue", "SLA and overdue tickets", profile.notifySlaOverdue ?? profile.notifyOverdue)}
        ${profileCheckbox("notifyMentioned", "Mentions in internal notes", profile.notifyMentioned)}
        ${profileCheckbox("notifyReceiptsWarranty", "Receipts and warranty", profile.notifyReceiptsWarranty)}
        ${profileCheckbox("notifyAssignmentEligibility", "Assignment eligibility changes", profile.notifyAssignmentEligibility)}
        ${profileCheckbox("quietHoursEnabled", "Quiet hours enabled", profile.quietHoursEnabled)}
        ${profileInput("quietHoursStart", "Quiet hours start", profile.quietHoursStart, "time")}
        ${profileInput("quietHoursEnd", "Quiet hours end", profile.quietHoursEnd, "time")}
      </div>
    </section>
  `;
}

function renderWorkspaceTab(workload) {
  const adminControls = currentUserIsAdmin()
    ? `<button class="primary-button" id="manageAssignmentPoolButton" type="button">Manage assignment pool</button>`
    : "";
  return `
    <section class="profile-tab-panel" data-profile-panel="workspace" role="tabpanel">
      <div class="profile-section-title">
        <h3>Workspace</h3>
        <p>Current workspace/account details for this RepOS session. ${escapeHtml(demoStateSentence())}</p>
      </div>
      <div class="workspace-profile-grid">
        ${workspaceFact("Workspace", workspaceConfig.workspaceName)}
        ${workspaceFact("Department", workspaceConfig.defaultDepartment)}
        ${workspaceFact("Queue", workspaceConfig.defaultQueue)}
        ${workspaceFact("Role", currentDemoUserRoleLabel())}
        ${workspaceFact("Support email", workspaceConfig.supportMailbox)}
        ${workspaceFact("Timezone", workspaceSettings.timezone)}
      </div>
      ${currentUserIsAdmin() ? `<div class="profile-admin-callout"><span class="admin-badge">Admin</span><p>${escapeHtml(currentDemoUserName())} can manage reps and restore the local iSpring demo workspace back to seeded data. Restoring overwrites persisted local demo changes.</p><div class="profile-admin-actions">${adminControls}<button class="secondary-button danger-soft" id="resetWorkspaceDataButton" type="button">Restore seed demo data</button></div></div>` : ""}
    </section>
  `;
}

function currentDemoUserRoleLabel() {
  const role = currentDemoUserRole();
  return role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : "Rep";
}

function demoStateModeLabel() {
  return backendSyncAvailable ? "Local backend persisted demo state" : "Browser localStorage demo state";
}

function demoStateSentence() {
  return backendSyncAvailable
    ? "Counts reflect the current local backend demo state, not a fresh seed snapshot."
    : "Counts reflect this browser's local demo state, not a fresh seed snapshot.";
}

function updateProfileTabState() {
  el.profileModal.querySelectorAll("[data-profile-tab]").forEach((button) => {
    const active = button.dataset.profileTab === activeProfileTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.setAttribute("tabindex", active ? "0" : "-1");
  });
  el.profileModal.querySelectorAll("[data-profile-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.profilePanel !== activeProfileTab;
  });
  requestAnimationFrame(syncProfileTabIndicator);
}

function syncProfileTabIndicator() {
  const tabs = el.profileModal?.querySelector(".profile-tabs");
  if (!tabs) return;
  const indicator = tabs.querySelector(".profile-tab-indicator");
  const activeTab = tabs.querySelector("[data-profile-tab].active");
  if (!indicator || !activeTab) return;

  const groupRect = tabs.getBoundingClientRect();
  const tabRect = activeTab.getBoundingClientRect();
  indicator.style.setProperty("--profile-tab-x", `${tabRect.left - groupRect.left}px`);
  indicator.style.setProperty("--profile-tab-y", `${tabRect.top - groupRect.top}px`);
  indicator.style.setProperty("--profile-tab-width", `${tabRect.width}px`);
  indicator.style.setProperty("--profile-tab-height", `${tabRect.height}px`);
  indicator.classList.add("ready");
}

function applyProfilePreferences({ initialize } = { initialize: false }) {
  activeView = viewConfig.some((view) => view.id === profile.defaultLandingView) ? profile.defaultLandingView : "open";
  uiState.activeQuickControl = activeView;
  uiState.queueMode = "table";
  uiState.metricsCollapsed = true;
  uiState.sidebarCollapsed = Boolean(profile.sidebarCollapsedDefault);
  sidebarLayoutCollapsed = uiState.sidebarCollapsed;
  setDefaultSortPreference();

  document.documentElement.style.setProperty("--profile-accent", profile.accentColor || seedProfile.accentColor);
  document.body.classList.toggle("theme-dark", profile.theme === "Dark");
  document.body.classList.toggle("theme-system", profile.theme === "System");
  document.body.classList.toggle("compact", Boolean(profile.compactRows) || ["Compact", "Ultra Compact"].includes(profile.ticketDensity));
  document.body.classList.toggle("density-ultra", profile.ticketDensity === "Ultra Compact");
  if (el.densityToggle) el.densityToggle.checked = Boolean(profile.compactRows) || ["Compact", "Ultra Compact"].includes(profile.ticketDensity);

  if (initialize && profile.autoOpenFirstTicket) {
    uiState.activeScreen = "detail";
  }
}

function setDefaultSortPreference() {
  const defaultSort = normalizeSortPreference(profile.defaultSort);
  if (defaultSort === "SLA") {
    filters.sort = "sla";
    filters.tableSort = { key: "updated", direction: "desc" };
  } else {
    filters.sort = "newest";
    filters.tableSort = { key: "updated", direction: "desc" };
  }
  if (el.sortSelect) el.sortSelect.value = filters.sort;
}

function normalizeSortPreference(value) {
  return ["Last Updated", "SLA", "Newest"].includes(value) ? value : "Last Updated";
}

function updateProfileButton() {
  el.profileButtonName.textContent = profileDisplayName();
  el.profileButtonRole.textContent = currentDemoUserRoleLabel();
  // Profile button shows a person icon (set in markup) — no initials to sync here.
}

function renderNotifications() {
  const unreadCount = notifications.filter((item) => !item.read).length;
  if (el.notificationUnreadCount) {
    el.notificationUnreadCount.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    el.notificationUnreadCount.hidden = unreadCount === 0;
  }
  el.notificationBellButton?.setAttribute("aria-expanded", String(notificationsOpen));
  el.notificationBellButton?.classList.toggle("has-unread", unreadCount > 0);
  if (!el.notificationPanel) return;
  el.notificationPanel.hidden = !notificationsOpen;
  if (!notificationsOpen) return;

  const filter = notificationFilters.find((item) => item.id === activeNotificationFilter) || notificationFilters[0];
  const visibleNotifications = notifications.filter(filter.match);
  el.notificationPanel.innerHTML = `
    <div class="notification-header">
      <div>
        <p class="eyebrow">Notifications</p>
        <h2>Important updates</h2>
      </div>
      <button class="ghost-button" data-notification-action="mark-all" type="button" ${unreadCount ? "" : "disabled"}>Mark all read</button>
    </div>
    <div class="notification-filters" role="tablist" aria-label="Notification filters">
      ${notificationFilters.map((item) => `<button class="${item.id === activeNotificationFilter ? "active" : ""}" data-notification-filter="${item.id}" type="button">${escapeHtml(item.label)}</button>`).join("")}
    </div>
    <div class="notification-list">
      ${visibleNotifications.length ? visibleNotifications.map(renderNotificationItem).join("") : `<div class="notification-empty"><strong>No notifications here</strong><p>RepOS only surfaces high-value ticket events.</p></div>`}
    </div>
  `;
}

function renderNotificationItem(item) {
  const ticket = item.ticketId ? tickets.find((candidate) => candidate.id === item.ticketId) : null;
  return `
    <article class="notification-item ${item.read ? "read" : "unread"}" data-notification-id="${escapeHtml(item.id)}">
      <div class="notification-dot" aria-hidden="true"></div>
      <div>
        <div class="notification-item-head">
          <strong>${escapeHtml(item.title)}</strong>
          <time>${escapeHtml(notificationTimeLabel(item.createdAt))}</time>
        </div>
        <p>${escapeHtml(item.description)}</p>
        ${ticket ? `<span class="notification-ticket">${escapeHtml(ticketDisplayId(ticket))}</span>` : ""}
        <div class="notification-actions">
          ${ticket ? `<button class="link-button" data-notification-open="${escapeHtml(item.id)}" type="button">Open ticket</button>` : ""}
          <button class="link-button" data-notification-read="${escapeHtml(item.id)}" type="button">${item.read ? "Mark unread" : "Mark read"}</button>
          <button class="link-button muted-action" data-notification-clear="${escapeHtml(item.id)}" type="button">Clear</button>
        </div>
      </div>
    </article>
  `;
}

function notificationTimeLabel(value) {
  const hours = Math.max(0, Math.round((new Date() - new Date(value)) / 36e5));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function toggleNotificationsPanel() {
  notificationsOpen = !notificationsOpen;
  renderNotifications();
}

function closeNotificationsPanel() {
  notificationsOpen = false;
  renderNotifications();
}

function handleNotificationPanelClick(event) {
  event.stopPropagation();
  const filterButton = event.target.closest("[data-notification-filter]");
  if (filterButton) {
    activeNotificationFilter = filterButton.dataset.notificationFilter;
    renderNotifications();
    return;
  }

  const action = event.target.closest("[data-notification-action]");
  if (action?.dataset.notificationAction === "mark-all") {
    notifications = notifications.map((item) => ({ ...item, read: true }));
    persistNotifications();
    renderNotifications();
    return;
  }

  const openButton = event.target.closest("[data-notification-open]");
  if (openButton) {
    const item = notifications.find((notification) => notification.id === openButton.dataset.notificationOpen);
    if (!item) return;
    markNotificationRead(item.id, true);
    closeNotificationsPanel();
    if (item.ticketId) openTicketDetail(item.ticketId);
    return;
  }

  const readButton = event.target.closest("[data-notification-read]");
  if (readButton) {
    const item = notifications.find((notification) => notification.id === readButton.dataset.notificationRead);
    if (!item) return;
    markNotificationRead(item.id, !item.read);
    return;
  }

  const clearButton = event.target.closest("[data-notification-clear]");
  if (clearButton) {
    notifications = notifications.filter((notification) => notification.id !== clearButton.dataset.notificationClear);
    persistNotifications();
    renderNotifications();
  }
}

function markNotificationRead(id, read = true) {
  notifications = notifications.map((item) => item.id === id ? { ...item, read } : item);
  persistNotifications();
  renderNotifications();
}

function mentionsCurrentUser(text) {
  const value = String(text || "").toLowerCase();
  const display = profileDisplayName().toLowerCase();
  const first = display.split(/\s+/)[0];
  return value.includes(`@${display}`) || value.includes(display) || value.includes(`@${first}`);
}

function addNotification({ category, title, description, ticketId = "", force = false }) {
  if (!force && !shouldCreateNotification(category)) return;
  const item = {
    id: `notification-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    category,
    title,
    description,
    ticketId,
    createdAt: new Date().toISOString(),
    read: false
  };
  notifications = [item, ...notifications].slice(0, 40);
  persistNotifications();
  renderNotifications();
}

function shouldCreateNotification(category) {
  if (!profile.inAppNotifications) return false;
  if (["assigned", "reassigned", "assignment"].includes(category)) return Boolean(profile.notifyAssigned || profile.notifyAssignmentEligibility);
  if (category === "customer") return Boolean(profile.notifyCustomerReplies);
  if (category === "sla") return Boolean(profile.notifySlaOverdue ?? profile.notifyOverdue);
  if (category === "mention") return Boolean(profile.notifyMentioned);
  if (category === "receipts") return Boolean(profile.notifyReceiptsWarranty);
  return true;
}

function profileInitials() {
  const first = String(profile.firstName || "").trim();
  const last = String(profile.lastName || "").trim();
  let initials = `${first.charAt(0)}${last.charAt(0)}`;
  if (!initials) {
    // Fall back to the display name, skipping rep-code tokens like "CS14".
    const words = profileDisplayName().split(/\s+/).filter((word) => /[a-z]/i.test(word) && !/\d/.test(word));
    initials = words.slice(0, 2).map((word) => word.charAt(0)).join("");
  }
  if (!initials) {
    initials = String(profile.extension || "CS").replace(/[^A-Z0-9]/gi, "").slice(0, 2);
  }
  return initials.toUpperCase() || "U";
}

function currentAssignmentUser() {
  const currentName = currentDemoUserName();
  return users.find((user) => normalizeRepName(user.name) === currentName);
}

function assignedToCurrentDemoUser(ticket) {
  return normalizeRepName(ticket?.assignee) === currentDemoUserName();
}

function landingLabel(value) {
  const labels = {
    open: "Open Tickets",
    closed: "Closed Tickets"
  };
  return labels[value] || "Open Tickets";
}

function landingValue(value) {
  const values = {
    "Open Tickets": "open",
    "Closed Tickets": "closed"
  };
  return values[value] || "open";
}

function stringFormValue(form, key) {
  return String(form.get(key) || "").trim();
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.remove("toast-leaving");
  el.toast.hidden = false;
  clearTimeout(showToast.timeoutId);
  clearTimeout(showToast.hideTimeoutId);
  showToast.timeoutId = setTimeout(() => {
    el.toast.classList.add("toast-leaving");
    showToast.hideTimeoutId = setTimeout(() => {
      el.toast.hidden = true;
      el.toast.classList.remove("toast-leaving");
    }, cssDurationMs("--motion-normal", 200) + 40);
  }, 2200);
}

function rawStatusValue(value) {
  return String(typeof value === "object" && value ? value.status : value || "").trim();
}

function isClosedQueueStatus(status) {
  return closedQueueStatuses.includes(rawStatusValue(status));
}

function isWaitingQueueStatus(status) {
  return waitingQueueStatuses.includes(rawStatusValue(status));
}

function displayStatusFor(value) {
  if (isClosedQueueStatus(value)) return "Closed";
  if (isWaitingQueueStatus(value)) return "Closed, Waiting On Response";
  return "Open";
}

function isClosedDisplayStatus(status) {
  return ["Closed", "Closed, Waiting On Response"].includes(displayStatusFor(status));
}

function isActiveTicket(ticket) {
  return displayStatusFor(ticket) === "Open";
}

function isClosingStatusTransition(previousStatus, nextStatus) {
  return !isClosedDisplayStatus(previousStatus) && isClosedDisplayStatus(nextStatus);
}

function isTicketActionLocked(ticketId) {
  const id = String(ticketId || "");
  return closingTicketIds.has(id) || pendingStatusChanges.has(id);
}

function queueRowForTicket(ticketId) {
  return [...(el.ticketList?.querySelectorAll("[data-ticket-id]") || [])].find((row) => row.dataset.ticketId === ticketId) || null;
}

function activeQueueMatcher() {
  return allQueueViews.find((view) => view.id === activeView)?.match || (() => true);
}

function ticketMatchesVisibleQueue(ticket, matcher = activeQueueMatcher()) {
  const globalQuery = filters.global.trim().toLowerCase();
  const queueQuery = filters.queue.trim().toLowerCase();

  if (ticket.mergedInto) return false;
  if (!matcher(ticket)) return false;
  if (filters.status !== "All statuses" && displayStatusFor(ticket) !== filters.status) return false;
  if (activeView === "closed" && !ticketMatchesClosedDateRange(ticket)) return false;

  const haystack = ticketSearchText(ticket);
  if (globalQuery && !ticketMatchesSearchQuery(haystack, globalQuery)) return false;
  if (queueQuery && !ticketMatchesSearchQuery(haystack, queueQuery)) return false;
  return true;
}

function ticketMatchesSearchQuery(haystack, query) {
  if (haystack.includes(query)) return true;
  const terms = query.split(/\s+/).filter(Boolean);
  return terms.length > 1 && terms.every((term) => haystack.includes(term));
}

function ticketMatchesClosedDateRange(ticket) {
  if (!isClosedDisplayStatus(ticket)) return false;
  const closedAt = ticketClosedAt(ticket);
  if (!closedAt) return true;
  const closedDate = new Date(closedAt);
  if (Number.isNaN(closedDate.getTime())) return true;
  const { start, end } = closedDateRangeBounds(filters.closedDateRange);
  return closedDate >= start && closedDate < end;
}

function ticketClosedAt(ticket) {
  const statusEvent = [...visibleThreadMessages(ticket)]
    .reverse()
    .find((message) => message.type === "timeline" && /status changed to (closed|resolved|waiting customer|waiting on response|closed,\s*waiting on response)|changed status .* to (closed|resolved|waiting customer|waiting on response|closed,\s*waiting on response)|closed\./i.test(message.body));
  return statusEvent?.timestamp || lastUpdatedAt(ticket);
}

function closedDateRangeBounds(range) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (range === "Yesterday") {
    start.setDate(start.getDate() - 1);
  } else if (range === "This Week") {
    start.setDate(start.getDate() - 6);
  } else if (range === "This Month") {
    start.setDate(1);
  } else if (range === "This Quarter") {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
  }

  if (range === "Yesterday") {
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 1);
  } else if (range === "Today") {
    end.setDate(end.getDate() + 1);
  } else {
    end.setTime(now.getTime() + 1);
  }

  return { start, end };
}

function statusChangeLeavesCurrentQueue(ticket, nextStatus) {
  if (uiState.activeScreen !== "queue" || activeView === "closed") return false;
  if (!queueRowForTicket(ticket.id)) return false;
  const matcher = activeQueueMatcher();
  if (!ticketMatchesVisibleQueue(ticket, matcher)) return false;
  return !ticketMatchesVisibleQueue({ ...ticket, status: nextStatus }, matcher);
}

function cssDurationMs(variableName, fallback) {
  if (typeof window === "undefined") return fallback;
  const raw = window.getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  if (!raw) return fallback;
  if (raw.endsWith("ms")) return Number.parseFloat(raw) || fallback;
  if (raw.endsWith("s")) return (Number.parseFloat(raw) || 0) * 1000 || fallback;
  return Number.parseFloat(raw) || fallback;
}

function cssNumberValue(variableName, fallback) {
  if (typeof window === "undefined") return fallback;
  const raw = window.getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return Number.parseFloat(raw) || fallback;
}

function prepareClosingQueueRow(row, rect) {
  row.classList.add("ticket-row--closing-shell", "row-action-disabled");
  row.style.maxHeight = `${Math.ceil(rect.height)}px`;
  row.style.setProperty("--queue-row-inner-height", `${Math.ceil(rect.height)}px`);
}

function animateQueueRowsOut(ticketIds, onComplete) {
  const rows = [...new Set(ticketIds)].map(queueRowForTicket).filter(Boolean);
  if (!rows.length) return false;

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const popDuration = prefersReducedMotion ? 1 : cssDurationMs("--motion-ticket-row-pop", 140);
  const exitDuration = prefersReducedMotion ? 1 : cssDurationMs("--motion-ticket-row-exit", 340);
  const collapseDuration = prefersReducedMotion
    ? 1
    : Math.max(
      cssDurationMs("--motion-ticket-row-collapse", 820),
      cssDurationMs("--motion-ticket-row-fill", 820),
      820
    );
  const visualExitDuration = popDuration + exitDuration;
  const totalDuration = Math.max(visualExitDuration, collapseDuration) + (prefersReducedMotion ? 1 : 32);
  const rowRects = new Map(rows.map((row) => [row, row.getBoundingClientRect()]));

  el.bulkActions?.querySelectorAll("button, input, select").forEach((control) => {
    control.disabled = true;
    control.setAttribute("aria-disabled", "true");
  });

  rows.forEach((row) => {
    row.setAttribute("aria-disabled", "true");
    row.querySelectorAll("button, input, select").forEach((control) => {
      control.disabled = true;
      control.setAttribute("aria-disabled", "true");
    });

    const rect = rowRects.get(row);
    prepareClosingQueueRow(row, rect);
  });

  requestAnimationFrame(() => {
    rows.forEach((row) => {
      row.classList.add("is-closing", "ticket-row--collapsing");
      row.style.maxHeight = "0px";
    });
  });

  window.setTimeout(() => {
    rows.forEach((row) => row.remove());
    onComplete();
  }, totalDuration);
  return true;
}

function applyTicketStatusChange(ticket, nextStatus, internalNote, { bulk = false } = {}) {
  const previousStatus = displayStatusFor(ticket);
  const actorName = currentDemoUserName();
  ticket.status = nextStatus;
  ticket.conversation.push({
    type: "timeline",
    author: actorName,
    timestamp: new Date().toISOString(),
    body: bulk
      ? previousStatus === nextStatus
        ? `${actorName} bulk confirmed status as ${nextStatus}.`
        : `${actorName} bulk changed status from ${previousStatus} to ${nextStatus}.`
      : `${actorName} changed status from ${previousStatus} to ${nextStatus}.`
  });
  addInternalNoteToTicket(ticket, internalNote);
}

function finishTicketStatusChanges({ changes, removalIds = [], removalToastMessage = "", fallbackToastMessage = "", onCommitted = null }) {
  const complete = () => {
    changes.forEach(({ ticket, nextStatus, internalNote, bulk }) => {
      applyTicketStatusChange(ticket, nextStatus, internalNote, { bulk });
      closingTicketIds.delete(ticket.id);
      pendingStatusChanges.delete(ticket.id);
    });
    if (typeof onCommitted === "function") onCommitted();
    persistTicketsLocalOnly();
    changes.forEach(({ ticket, nextStatus, internalNote }) => {
      syncTicketStatusToBackend(ticket.id, nextStatus, internalNote);
    });
    refreshQueueAfterStatusCommit(removalIds);
    if (removalIds.length && removalToastMessage) {
      showToast(removalToastMessage);
    } else if (fallbackToastMessage) {
      showToast(fallbackToastMessage);
    }
  };

  const changesById = new Map(changes.map((change) => [change.ticket.id, change]));
  removalIds.forEach((ticketId) => {
    closingTicketIds.add(ticketId);
    pendingStatusChanges.set(ticketId, changesById.get(ticketId) || true);
  });

  if (animateQueueRowsOut(removalIds, complete)) return;
  complete();
}

function refreshQueueAfterStatusCommit(removalIds = []) {
  if (removalIds.length && uiState.activeScreen === "queue") {
    const visibleTickets = getVisibleTickets();
    if (!visibleTickets.some((ticket) => ticket.id === selectedTicketId)) {
      selectedTicketId = visibleTickets[0]?.id || tickets[0]?.id || "";
    }
    pruneBulkSelection(visibleTickets);
    renderQueueTabs();
    renderMetrics();
    renderBulkActions(visibleTickets);
    renderQueuePreview(selectedTicket());
    renderConversation(selectedTicket());
    renderContext(selectedTicket());
    syncQueueSelectionControls(visibleTickets);
    applyUiState();
    refreshCustomSelects();
    if (!visibleTickets.length) renderTicketList(visibleTickets);
    return;
  }

  render();
}

function queueRemovalToastMessage(changedTickets) {
  if (!changedTickets.length) return "";
  if (changedTickets.length === 1) {
    return `${ticketDisplayId(changedTickets[0])} closed.`;
  }
  return `${changedTickets.length} tickets closed.`;
}

function handleProfileSave(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  profile = {
    ...profile,
    firstName: stringFormValue(form, "firstName"),
    lastName: "",
    displayName: normalizeRepName(stringFormValue(form, "displayName")) || profileDisplayName(),
    email: stringFormValue(form, "email"),
    phone: stringFormValue(form, "phone"),
    mobile: stringFormValue(form, "mobile"),
    extension: stringFormValue(form, "extension"),
    username: stringFormValue(form, "username"),
    role: stringFormValue(form, "role"),
    twoFactorEnabled: form.has("twoFactorEnabled"),
    defaultLandingView: landingValue(stringFormValue(form, "defaultLandingView")),
    defaultQueueView: stringFormValue(form, "defaultQueueView") === "Card View" ? "card" : "table",
    compactRows: form.has("compactRows"),
    showMetrics: form.has("showMetrics"),
    showTicketPreview: false,
    sidebarCollapsedDefault: form.has("sidebarCollapsedDefault"),
    theme: stringFormValue(form, "theme"),
    accentColor: stringFormValue(form, "accentColor") || seedProfile.accentColor,
    ticketDensity: stringFormValue(form, "ticketDensity"),
    defaultSort: stringFormValue(form, "defaultSort"),
    autoOpenFirstTicket: form.has("autoOpenFirstTicket"),
    mySignature: stringFormValue(form, "mySignature"),
    defaultSignature: stringFormValue(form, "defaultSignature"),
    insertSignature: form.has("insertSignature"),
    inAppNotifications: form.has("inAppNotifications"),
    emailNotifications: form.has("emailNotifications"),
    notifyAssigned: form.has("notifyAssigned"),
    notifyCustomerReplies: form.has("notifyCustomerReplies"),
    notifySlaOverdue: form.has("notifySlaOverdue"),
    notifyOverdue: form.has("notifySlaOverdue"),
    notifyMentioned: form.has("notifyMentioned"),
    notifyReceiptsWarranty: form.has("notifyReceiptsWarranty"),
    notifyAssignmentEligibility: form.has("notifyAssignmentEligibility"),
    notifyAiAssigned: form.has("notifyAssigned"),
    notificationStyle: form.has("emailNotifications") ? (form.has("inAppNotifications") ? "Both" : "Email") : "In-app only",
    quietHoursEnabled: form.has("quietHoursEnabled"),
    quietHoursStart: stringFormValue(form, "quietHoursStart"),
    quietHoursEnd: stringFormValue(form, "quietHoursEnd")
  };
  profile = normalizeProfile(profile);
  persistProfile();
  applyProfilePreferences({ initialize: false });
  updateProfileButton();
  renderProfileModal();
  render();
  showToast("Profile settings saved.");
}

function profileInput(name, label, value, type = "text") {
  return `
    <label class="profile-field">
      <span>${escapeHtml(label)}</span>
      <input name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}">
    </label>
  `;
}

function profileSelect(name, label, options, selected) {
  return `
    <label class="profile-field">
      <span>${escapeHtml(label)}</span>
      <select name="${escapeHtml(name)}">
        ${options.map((option) => `<option value="${escapeHtml(option)}"${option === selected ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </label>
  `;
}

function profileCheckbox(name, label, checked) {
  return `
    <label class="profile-toggle">
      <input name="${escapeHtml(name)}" type="checkbox" ${checked ? "checked" : ""}>
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function workspaceFact(label, value) {
  return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function fieldValue(value) {
  const text = String(value || "").trim();
  if (!text || text.toLowerCase() === "not provided") return `<span class="muted">Not provided</span>`;
  return text ? escapeHtml(text) : `<span class="muted">Not provided</span>`;
}

function teamLabel(ticket) {
  return workspaceConfig.productTeamLabels[ticket.family] || ticket.family;
}

function purchaseSourceLabel(ticket) {
  const order = String(ticket.order || "").trim();
  const match = workspaceConfig.purchaseSourceRules.find((rule) => {
    const sourceMatches = rule.source && ticket.source === rule.source;
    const orderMatches = rule.orderPattern && new RegExp(rule.orderPattern, "i").test(order);
    return sourceMatches || orderMatches;
  });
  if (match) return match.label;
  if (workspaceConfig.sourceChannels.includes(ticket.source)) return "";
  return ticket.source;
}

function previewMissingIndicators(ticket) {
  const missing = new Set(ticket.missing || []);
  const items = [];
  if (missing.has("Needs Receipt")) items.push("Needs receipt");
  if (missing.has("Needs Photos")) items.push("Needs photos");
  if (missing.has("Needs Phone") || !String(ticket.customer?.phone || "").trim()) items.push("Needs phone");
  if (missing.has("Needs Address")) items.push("Needs address");
  return items;
}

function lastTimelineEvent(ticket) {
  return [...ticket.conversation].reverse().find((message) => message.type === "timeline") || null;
}

function visibleThreadMessages(ticket) {
  return Array.isArray(ticket?.conversation)
    ? ticket.conversation.filter((message) => message && typeof message.body === "string" && typeof message.timestamp === "string")
    : [];
}

function isEmailStyleMessage(message) {
  return ["customer", "rep"].includes(message?.type);
}

function visibleEmailMessages(ticket) {
  return visibleThreadMessages(ticket).filter(isEmailStyleMessage);
}

function latestEmailStyleMessage(ticket) {
  return visibleEmailMessages(ticket).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null;
}

function ticketNeedsRepResponse(ticket) {
  const status = displayStatusFor(ticket);
  if (isClosedDisplayStatus(status)) return false;
  return latestEmailStyleMessage(ticket)?.type === "customer";
}

function emailMessageCount(ticket) {
  return visibleEmailMessages(ticket).length;
}

function emailCountLabel(ticket) {
  const count = emailMessageCount(ticket);
  return `${count} ${count === 1 ? "email" : "emails"}`;
}

function threadCountDebugLabel(ticket) {
  return `emailCount: ${emailMessageCount(ticket)}; visibleEmailMessages: ${visibleEmailMessages(ticket).length}; totalThreadItems: ${visibleThreadMessages(ticket).length}`;
}

function renderNav() {
  if (el.ticketNavCount) el.ticketNavCount.textContent = String(tickets.filter(isOpen).length);
  if (el.viewNav) el.viewNav.innerHTML = "";
}

function queueTitleForActiveView() {
  const view = allQueueViews.find((item) => item.id === activeView);
  return view?.title || view?.label || "Open Tickets";
}

function renderMetrics() {
  if (!el.metricStrip) return;

  const open = tickets.filter(isOpen);
  const closed = tickets.filter(isClosedDisplayStatus).length;
  const overdue = tickets.filter(isOverdue).length;
  const followups = tickets.filter((ticket) => ticket.tags.includes("follow-up-due") || ticket.status === "Pending Parts").length;
  const customerReplies = tickets.filter(customerRepliedWithoutRep).length;

  const metrics = [
    { label: "My open", value: open.filter(assignedToCurrentDemoUser).length, meta: currentDemoUserName(), tone: "cyan" },
    { label: "All open", value: open.length, meta: "Team queue", tone: "neutral" },
    { label: "Overdue SLA", value: overdue, meta: "SLA risk", tone: overdue ? "red" : "green" },
    { label: "Avg first response", value: "3.8h", meta: "Support KPI", tone: "blue" }
  ];
  const moreMetrics = [
    { label: "Closed", value: closed },
    { label: "Customer replies", value: customerReplies },
    { label: "Follow-ups", value: followups }
  ];

  const metricCards = metrics
    .map(
      (metric) => {
        const safeMetric = {
          label: metric?.label || "Metric",
          value: metric?.value ?? 0,
          meta: metric?.meta || "Support KPI",
          tone: metric?.tone || "neutral"
        };

        return `
        <article class="metric-card tone-${safeMetric.tone}">
          <strong>${escapeHtml(safeMetric.value)}</strong>
          <span>${escapeHtml(safeMetric.label)}</span>
          <small>${escapeHtml(safeMetric.meta)}</small>
        </article>
      `;
      }
    )
    .join("");

  el.metricStrip.innerHTML = `
    ${metricCards}
    <details class="more-metrics">
      <summary>More metrics</summary>
      <div>
        ${moreMetrics.map((metric) => `<span><strong>${escapeHtml(metric.value)}</strong>${escapeHtml(metric.label)}</span>`).join("")}
      </div>
    </details>
  `;
}

function renderTicketList(visibleTickets, { animateRows = true } = {}) {
  el.ticketList.classList.toggle("suppress-row-enter", !animateRows);
  if (!visibleTickets.length) {
    const closedRangeCopy = activeView === "closed"
      ? `<p>The Closed badge shows the all-time Closed tab total. This date range has no matching tickets.</p>`
      : `<p>Clear the search and filters to return to the active queue.</p>`;
    el.ticketList.classList.remove("table-mode", "card-mode");
    el.ticketList.innerHTML = `
      <div class="empty-state polished">
        <strong>No tickets match this view</strong>
        ${closedRangeCopy}
        <button class="secondary-button" id="clearFiltersButton" type="button">Clear filters</button>
      </div>
    `;
    document.querySelector("#clearFiltersButton").addEventListener("click", clearFilters);
    return;
  }

  uiState.queueMode = "table";
  el.ticketList.classList.add("table-mode");
  el.ticketList.classList.remove("card-mode");
  try {
    queueDebugState.renderTableCalled = true;
    el.ticketList.innerHTML = renderTicketTable(visibleTickets);
    bindQueueSelection();
    bindTableControls();
    syncQueueSelectionControls(visibleTickets);
  } catch (error) {
    queueDebugState.renderError = error?.message || String(error);
    el.ticketList.classList.remove("table-mode", "card-mode");
    el.ticketList.innerHTML = `
      <div class="empty-state polished">
        <strong>Ticket table could not render</strong>
        <p>${escapeHtml(queueDebugState.renderError)}</p>
        <button class="secondary-button" id="resetTicketDataButton" type="button">Reset ticket data</button>
      </div>
    `;
    document.querySelector("#resetTicketDataButton")?.addEventListener("click", () => {
      resetTicketDataFromSeed();
      render();
    });
  }
}

function renderTicketTable(visibleTickets) {
  const pageInfo = queuePageInfo(getFilteredQueueTickets().length);
  return `
    <div class="queue-table-wrap" role="region" aria-label="Dense support queue" tabindex="0">
      <div class="queue-table" role="table" aria-label="Dense support queue">
        <div class="queue-table-header" role="rowgroup">
          <div class="queue-table-header-row" role="row">
            ${tableColumns.map((column) => renderTableHeader(column, visibleTickets)).join("")}
          </div>
        </div>
        <div class="queue-row-list" role="rowgroup">
          ${visibleTickets.map(renderTicketRow).join("")}
        </div>
      </div>
      ${renderQueuePagination(pageInfo)}
      ${renderAppFooter("queue-footer")}
    </div>
  `;
}

function renderQueuePagination(pageInfo) {
  const showingStart = pageInfo.totalCount ? pageInfo.startIndex + 1 : 0;
  const showingEnd = pageInfo.endIndex;
  const pageButtons = Array.from({ length: pageInfo.pageCount }, (_, index) => {
    const page = index + 1;
    return `
      <button class="queue-page-button ${page === pageInfo.page ? "active" : ""}" data-queue-page="${page}" type="button" aria-current="${page === pageInfo.page ? "page" : "false"}">
        Page ${page}
      </button>
    `;
  }).join("");

  return `
    <nav class="queue-pagination" aria-label="Ticket table pagination">
      <p>Showing ${showingStart}&ndash;${showingEnd} of ${pageInfo.totalCount}</p>
      ${pageInfo.pageCount > 1 ? `
        <div class="queue-pagination-controls">
          <button class="secondary-button queue-page-step" data-queue-page="${pageInfo.page - 1}" type="button" ${pageInfo.hasPrevious ? "" : "disabled"}>Previous</button>
          <div class="queue-page-list">
            ${pageButtons}
          </div>
          <button class="secondary-button queue-page-step" data-queue-page="${pageInfo.page + 1}" type="button" ${pageInfo.hasNext ? "" : "disabled"}>Next</button>
        </div>
      ` : ""}
    </nav>
  `;
}

function renderTableHeader(column, visibleTickets = getVisibleTickets()) {
  if (column.key === "select") {
    const selectableTickets = selectableVisibleTickets(visibleTickets);
    const selectedCount = getVisibleSelectedTickets(visibleTickets).length;
    const allVisibleSelected = selectedCount === selectableTickets.length && selectableTickets.length > 0;
    return `<div class="queue-table-header-cell ${column.className || ""}" role="columnheader"><input data-select-visible type="checkbox" aria-label="Select all visible tickets" ${allVisibleSelected ? "checked" : ""}></div>`;
  }

  const sorted = filters.tableSort.key === column.key;
  const direction = sorted ? filters.tableSort.direction : "";
  return `
    <div class="queue-table-header-cell ${column.className || ""}" role="columnheader" aria-sort="${sorted ? (direction === "asc" ? "ascending" : "descending") : "none"}">
      <button class="sort-header" data-sort-key="${column.key}" type="button">
        <span>${escapeHtml(column.label)}</span>
        <small class="sort-icon ${sorted ? `sorted ${direction}` : ""}" aria-hidden="true"></small>
      </button>
    </div>
  `;
}

function renderTicketRow(ticket) {
  const previewed = ticket.id === selectedTicketId;
  const checked = selectedTicketIds.has(ticket.id);
  const displayId = ticketDisplayId(ticket);
  const locked = isTicketActionLocked(ticket.id);
  const disabledAttrs = locked ? ` disabled aria-disabled="true"` : "";
  const attachmentCount = Array.isArray(ticket.attachments) ? ticket.attachments.length : 0;
  const attachmentLabel = `${attachmentCount} ${attachmentCount === 1 ? "file" : "files"}`;
  const emailCount = emailMessageCount(ticket);
  const overdue = isOverdue(ticket);
  const overdueIcon = overdue
    ? `<span class="subject-overdue-icon" title="Overdue" aria-label="Overdue"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.3201 3H10.6801L1.5 18.5L2.5 21H21.5L22.5 18.5L13.3201 3Z" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path><path d="M12 17H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="square" fill="none"></path><path d="M12 13V9" stroke="currentColor" stroke-width="2" stroke-linecap="square" fill="none"></path></svg></span>`
    : "";
  const mergedLabel = Array.isArray(ticket.mergedFrom) && ticket.mergedFrom.length
    ? `Merged from ${ticket.mergedFrom.join(", ")}`
    : "Merged ticket";
  const mergedIcon = ticket.merged
    ? `<span class="subject-merged-icon" title="${escapeHtml(mergedLabel)}" aria-label="${escapeHtml(mergedLabel)}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="2.4" stroke="currentColor" stroke-width="2" fill="none"></circle><circle cx="6" cy="18" r="2.4" stroke="currentColor" stroke-width="2" fill="none"></circle><circle cx="18" cy="9" r="2.4" stroke="currentColor" stroke-width="2" fill="none"></circle><path d="M6 8.4v7.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"></path><path d="M6 13.2c0-3.4 2.6-5.4 6-5.9" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"></path><path d="M12.2 7.2 15.6 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"></path></svg></span>`
    : "";

  return `
    <div class="queue-row-shell motion-row-hover motion-row-enter ${previewed ? "previewed" : ""} ${checked ? "checked" : ""} ${locked ? "row-action-disabled" : ""}" role="row" data-ticket-id="${escapeHtml(ticket.id)}" data-ticket-number="${escapeHtml(displayId)}" tabindex="0" ${previewed ? `aria-current="true"` : ""} ${locked ? `aria-disabled="true"` : ""}>
      <div class="queue-row-content">
      <div class="queue-row-cell check-col" role="cell"><input data-select-ticket="${escapeHtml(ticket.id)}" type="checkbox" aria-label="Select ${escapeHtml(displayId)}" ${checked ? "checked" : ""}${disabledAttrs}></div>
      <div class="queue-row-cell" role="cell"><button class="table-link table-ticket-id" data-open-ticket="${escapeHtml(ticket.id)}" data-open-ticket-number="${escapeHtml(displayId)}" type="button"${disabledAttrs}>${escapeHtml(displayId)}</button></div>
      <div class="queue-row-cell activity-cell" role="cell"><span class="table-date">${dateTimeLabel(lastUpdatedAt(ticket))}</span></div>
      <div class="queue-row-cell subject-cell" role="cell">
        <span class="subject-row-inner">
          <span class="subject-copy">
            <span class="subject-line">
              <span class="subject-msg-count" title="${escapeHtml(emailCountLabel(ticket))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12.01V12" stroke="currentColor" stroke-width="2" stroke-linecap="square" fill="none"></path><path d="M16 11.9999V11.9899" stroke="currentColor" stroke-width="2" stroke-linecap="square" fill="none"></path><path d="M8 12.0101V12.0001" stroke="currentColor" stroke-width="2" stroke-linecap="square" fill="none"></path><path d="M22 12C22 17.5228 17.5228 22 12 22C10.1786 22 8.47087 21.513 7 20.6622L2.5 22L2 21.5L3.33782 17C2.48697 15.5291 2 13.8214 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="square" fill="none"></path></svg><span>${emailCount}</span></span>
              <button class="table-link subject-link" data-open-ticket="${escapeHtml(ticket.id)}" data-open-ticket-number="${escapeHtml(displayId)}" type="button"${disabledAttrs}>${escapeHtml(ticket.subject)}</button>
              ${mergedIcon}
              ${overdueIcon}
            </span>
          </span>
        </span>
      </div>
      <div class="queue-row-cell" role="cell"><button class="table-link customer-link" data-open-history="${escapeHtml(ticket.id)}" type="button"${disabledAttrs}><strong>${escapeHtml(ticket.customer.name)}</strong></button></div>
      <div class="queue-row-cell" role="cell">${escapeHtml(ticket.assignee)}</div>
      <div class="queue-row-cell" role="cell">${renderBadge(displayStatusFor(ticket), "status")}</div>
      </div>
    </div>
  `;
}

function bindQueueSelection() {
  el.ticketList.querySelectorAll("[data-ticket-id]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (isTicketActionLocked(row.dataset.ticketId)) return;
      if (event.target.closest("[data-select-ticket]")) return;
      previewTicketFromQueue(row.dataset.ticketId);
    });
    row.addEventListener("dblclick", () => {
      if (isTicketActionLocked(row.dataset.ticketId)) return;
      openTicketDetail(row.dataset.ticketId, { clickedTicketNumber: row.dataset.ticketNumber });
    });
    row.addEventListener("keydown", (event) => {
      if (isTicketActionLocked(row.dataset.ticketId)) return;
      if (event.key === "Enter") {
        event.preventDefault();
        previewTicketFromQueue(row.dataset.ticketId);
      }
      if (event.key === " ") {
        event.preventDefault();
        previewTicketFromQueue(row.dataset.ticketId);
      }
    });
  });
}

function bindTableControls() {
  const selectAll = el.ticketList.querySelector("[data-select-visible]");
  selectAll?.addEventListener("click", (event) => event.stopPropagation());
  selectAll?.addEventListener("change", (event) => {
    const visibleTickets = getVisibleTickets();
    if (event.target.checked) {
      visibleTickets.forEach((ticket) => {
        if (!isTicketActionLocked(ticket.id)) selectedTicketIds.add(ticket.id);
      });
    } else {
      visibleTickets.forEach((ticket) => selectedTicketIds.delete(ticket.id));
    }
    updateQueueSelectionState(visibleTickets);
  });

  el.ticketList.querySelectorAll("[data-select-ticket]").forEach((checkbox) => {
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", (event) => {
      const ticketId = event.target.dataset.selectTicket;
      if (isTicketActionLocked(ticketId)) return;
      if (event.target.checked) selectedTicketIds.add(ticketId);
      else selectedTicketIds.delete(ticketId);
      updateQueueSelectionState();
    });
  });

  el.ticketList.querySelectorAll("[data-open-ticket]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isTicketActionLocked(button.dataset.openTicket)) return;
      openTicketDetail(button.dataset.openTicket, { clickedTicketNumber: button.dataset.openTicketNumber });
    });
  });

  el.ticketList.querySelectorAll("[data-open-history]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isTicketActionLocked(button.dataset.openHistory)) return;
      selectedTicketId = button.dataset.openHistory;
      renderQueuePreview(selectedTicket());
      syncQueueSelectionControls();
      openCustomerHistory(button.dataset.openHistory);
    });
  });

  el.ticketList.querySelectorAll("[data-sort-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.sortKey;
      filters.tableSort = {
        key,
        direction: filters.tableSort.key === key && filters.tableSort.direction === "asc" ? "desc" : "asc"
      };
      render();
    });
  });

  el.ticketList.querySelectorAll("[data-queue-page]").forEach((button) => {
    button.addEventListener("click", () => setQueuePage(button.dataset.queuePage));
  });
}

function selectableVisibleTickets(visibleTickets = getVisibleTickets()) {
  return visibleTickets.filter((ticket) => !isTicketActionLocked(ticket.id));
}

function getVisibleSelectedTickets(visibleTickets = getVisibleTickets()) {
  return visibleTickets.filter((ticket) => selectedTicketIds.has(ticket.id) && !isTicketActionLocked(ticket.id));
}

function pruneBulkSelection(visibleTickets) {
  const liveVisibleIds = new Set(visibleTickets.map((ticket) => ticket.id));
  selectedTicketIds = new Set([...selectedTicketIds].filter((ticketId) => liveVisibleIds.has(ticketId) && !isTicketActionLocked(ticketId)));
}

function previewTicketFromQueue(ticketId) {
  const ticket = selectTicket(ticketId);
  if (!ticket) return;
  renderQueuePreview(ticket);
  syncQueueSelectionControls();
}

function updateQueueSelectionState(visibleTickets = getVisibleTickets()) {
  pruneBulkSelection(visibleTickets);
  syncQueueSelectionControls(visibleTickets);
  renderBulkActions(visibleTickets);
}

function syncQueueSelectionControls(visibleTickets = getVisibleTickets()) {
  if (!el.ticketList) return;
  const selectableTickets = selectableVisibleTickets(visibleTickets);
  const selectedCount = getVisibleSelectedTickets(visibleTickets).length;
  const selectAll = el.ticketList.querySelector("[data-select-visible]");

  if (selectAll) {
    selectAll.checked = selectableTickets.length > 0 && selectedCount === selectableTickets.length;
    selectAll.indeterminate = selectedCount > 0 && selectedCount < selectableTickets.length;
  }

  el.ticketList.querySelectorAll("[data-select-ticket]").forEach((checkbox) => {
    const ticketId = checkbox.dataset.selectTicket;
    const checked = selectedTicketIds.has(ticketId);
    checkbox.checked = checked;
    const row = checkbox.closest("[data-ticket-id]");
    if (row) {
      const previewed = row.dataset.ticketId === selectedTicketId;
      row.classList.toggle("checked", checked);
      row.classList.toggle("previewed", previewed);
      if (previewed) row.setAttribute("aria-current", "true");
      else row.removeAttribute("aria-current");
    }
  });
}

function renderBulkActions(visibleTickets) {
  if (!el.bulkActions) return;
  const selectedTickets = getVisibleSelectedTickets(visibleTickets);
  const selectedCount = selectedTickets.length;
  el.bulkActions.innerHTML = selectedCount
    ? `
      <strong>${escapeHtml(`${selectedCount} selected`)}</strong>
      <button class="toolbar-clear-button" id="clearBulkSelectionButton" type="button">Clear</button>
    `
    : "";
  el.bulkActions.classList.toggle("has-selection", Boolean(selectedCount));
  el.bulkActions.hidden = !selectedCount;
  syncToolbarControlState();
  el.bulkActions.querySelector("#clearBulkSelectionButton")?.addEventListener("click", clearBulkSelection);
}

function renderToolbarSelectOptions() {
  renderToolbarStatusOptions();
  renderToolbarAssignOptions();
  syncToolbarControlState();
}

function renderToolbarStatusOptions() {
  if (!el.statusFilter) return;
  const markup = toolbarStatusActions
    .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");
  if (el.statusFilter.innerHTML !== markup) el.statusFilter.innerHTML = markup;
  el.statusFilter.value = "";
  syncCustomSelect(el.statusFilter);
}

function renderToolbarAssignOptions() {
  if (!el.assignSelect) return;
  const activeReps = activeAssignmentOptionUsers();
  const options = [
    `<option value="">Assign</option>`,
    `<option value="claim">Claim</option>`,
    `<option value="assign-rep" disabled>Assign to rep</option>`,
    ...activeReps.map((user) => `<option value="rep:${escapeHtml(user.name)}">${escapeHtml(user.name)}</option>`),
    `<option value="assign-team">Assign to team</option>`
  ].join("");
  if (el.assignSelect.innerHTML !== options) el.assignSelect.innerHTML = options;
  el.assignSelect.value = "";
  syncCustomSelect(el.assignSelect);
}

function syncToolbarControlState() {
  if (!el.ticketActionToolbar) return;
  const selectedCount = getVisibleSelectedTickets().length;
  el.ticketActionToolbar.classList.toggle("has-selection", Boolean(selectedCount));
  if (el.mergeTicketsButton) {
    const canMerge = currentUserIsAdmin() && selectedCount >= 2;
    el.mergeTicketsButton.disabled = !canMerge;
    el.mergeTicketsButton.title = currentUserIsAdmin() ? "Merge tickets" : "Admins and owners can merge tickets";
    el.mergeTicketsButton.setAttribute("aria-label", "Merge tickets");
    el.mergeTicketsButton.setAttribute("aria-disabled", String(!canMerge));
  }
}

function renderBadge(label, className) {
  const extra = className === "status" ? ` ${statusBadgeModifier(label)}` : "";
  return `<span class="badge ${className}${extra}">${escapeHtml(label)}</span>`;
}

function statusBadgeModifier(label) {
  const value = String(label ?? "").toLowerCase();
  if (value.includes("waiting")) return "is-waiting";
  if (value.includes("closed")) return "is-closed";
  return "is-open";
}

function slaLineClass(ticket) {
  if (!isOpen(ticket)) return "";
  const hours = Math.round((new Date(ticket.dueAt) - new Date()) / 36e5);
  if (hours < -48) return "sla-breach";
  if (hours < 0) return "sla-overdue";
  if (hours < 24) return "sla-soon";
  return "";
}

function assignmentSelectOptions(currentAssignee) {
  const options = [...activeAssignmentOptionUsers()];
  if (currentAssignee) {
    const exactOption = options.some((user) => user.name === currentAssignee);
    const equivalentIndex = options.findIndex((user) => sameAssignmentUserName(user.name, currentAssignee));
    if (!exactOption && equivalentIndex >= 0) {
      options[equivalentIndex] = { ...options[equivalentIndex], name: currentAssignee };
    } else if (!exactOption) {
      options.unshift({ id: slugify(currentAssignee), name: currentAssignee, role: "rep", assignmentEligible: false, removed: false });
    }
  }
  return options.map((user) => `<option value="${escapeHtml(user.name)}"${user.name === currentAssignee ? " selected" : ""}>${escapeHtml(user.name)}</option>`).join("");
}

function renderDashboardPanel() {
  if (uiState.activeScreen !== "dashboard") {
    el.dashboardPanel.innerHTML = "";
    return;
  }

  const scopedTickets = dashboardFilteredTickets();
  const primaryTickets = dashboardPrimaryTickets(scopedTickets);
  const currentDashboardView = effectiveDashboardView();
  el.dashboardPanel.innerHTML = `
    <div class="dashboard-header">
      <div>
        <h1>${currentDashboardView === "manager" ? "Manager Dashboard" : "Rep Dashboard"}</h1>
        <p>${currentDashboardView === "manager" ? "Team view for workload, SLA risk, and support queue movement." : "Your tickets first, with team trends shown only in aggregate."} ${escapeHtml(demoStateSentence())}</p>
      </div>
      <div class="dashboard-header-actions">
        ${renderDashboardViewToggle(currentDashboardView)}
        <button class="secondary-button" id="dashboardRefreshButton" type="button">Refresh</button>
      </div>
    </div>
    ${renderDashboardOverview(currentDashboardView, scopedTickets, primaryTickets)}
    ${currentDashboardView === "manager" ? renderManagerDashboard(scopedTickets, primaryTickets) : renderRepDashboard(scopedTickets, primaryTickets)}
    ${renderAppFooter("dashboard-footer")}
  `;

  el.dashboardPanel.querySelectorAll("[data-dashboard-view]").forEach((button) => {
    button.addEventListener("click", () => {
      setDashboardView(button.dataset.dashboardView);
    });
  });
  el.dashboardPanel.querySelector("#dashboardRefreshButton").addEventListener("click", () => {
    render();
    showToast("Dashboard refreshed.");
  });
  el.dashboardPanel.querySelectorAll("[data-dashboard-open-ticket]").forEach((button) => {
    button.addEventListener("click", () => openTicketDetail(button.dataset.dashboardOpenTicket));
  });
  el.dashboardPanel.querySelectorAll("[data-dashboard-filter-query]").forEach((button) => {
    button.addEventListener("click", () => openDashboardFilteredQueue(button.dataset.dashboardFilterQuery));
  });
  el.dashboardPanel.querySelectorAll("[data-dashboard-rep-action]").forEach((button) => {
    button.addEventListener("click", () => handleDashboardRepAction(button.dataset.dashboardRepAction, button.dataset.dashboardRepName));
  });
}

function effectiveDashboardView() {
  if (!dashboardCanSwitchViews()) return "rep";
  return dashboardView === "rep" ? "rep" : "manager";
}

function dashboardCanSwitchViews() {
  return currentUserIsAdmin();
}

function dashboardIsManagerView() {
  return effectiveDashboardView() === "manager";
}

function dashboardIsTeamMode() {
  return dashboardIsManagerView();
}

function dashboardPrimaryTickets(scopedTickets) {
  if (dashboardIsTeamMode()) return scopedTickets;
  return scopedTickets.filter(assignedToCurrentDemoUser);
}

function renderDashboardViewToggle(currentDashboardView) {
  if (!dashboardCanSwitchViews()) return "";
  return `
    <div class="dashboard-view-toggle" role="tablist" aria-label="Dashboard view">
      <button class="${currentDashboardView === "manager" ? "active" : ""}" data-dashboard-view="manager" role="tab" aria-selected="${currentDashboardView === "manager"}" type="button">Manager View</button>
      <button class="${currentDashboardView === "rep" ? "active" : ""}" data-dashboard-view="rep" role="tab" aria-selected="${currentDashboardView === "rep"}" type="button">Rep View</button>
    </div>
  `;
}

function setDashboardView(nextView) {
  if (!dashboardCanSwitchViews()) {
    dashboardView = "rep";
    return;
  }
  dashboardView = nextView === "rep" ? "rep" : "manager";
  render();
}

function renderDashboardOverview(currentDashboardView, scopedTickets, primaryTickets) {
  const managerView = currentDashboardView === "manager";
  const metrics = managerView ? dashboardManagerMetricCards(scopedTickets) : dashboardRepMetricCards(primaryTickets, scopedTickets);
  const activeScope = managerView ? scopedTickets.filter(isActiveTicket).length : primaryTickets.filter(isActiveTicket).length;
  const scopeLabel = managerView ? "Team snapshot" : "My snapshot";
  const scopeText = managerView
    ? `${activeScope} active team tickets across the current dashboard filters.`
    : `${activeScope} active assigned tickets in your current dashboard view.`;
  return `
    <section class="dashboard-overview" aria-label="${escapeHtml(scopeLabel)}">
      <div class="dashboard-overview-copy">
        <p class="eyebrow">${escapeHtml(scopeLabel)}</p>
        <h2>${managerView ? "Queue health at a glance" : "Your queue at a glance"}</h2>
        <p>${escapeHtml(scopeText)}</p>
      </div>
      <div class="dashboard-metrics dashboard-overview-metrics">
        ${metrics.map(renderDashboardMetricCard).join("")}
      </div>
    </section>
  `;
}

function renderManagerDashboard(scopedTickets) {
  return `
    <section class="dashboard-grid dashboard-grid-lean">
      <article class="dashboard-card workload-card">
        <div class="section-title">
          <h3>Rep performance and risk</h3>
        </div>
        ${renderRepWorkloadTable(scopedTickets)}
      </article>
    </section>
  `;
}

function renderRepDashboard(scopedTickets, primaryTickets) {
  return `
    <section class="dashboard-grid dashboard-grid-lean">
      <article class="dashboard-card needs-action-card">
        <div class="section-title">
          <h3>Tickets to touch next</h3>
        </div>
        ${renderNeedsActionTable(primaryTickets, { includeAssignee: false, limit: 10, emptyText: "No assigned tickets need immediate action right now." })}
      </article>
    </section>
  `;
}

function dashboardFilteredTickets() {
  const start = dashboardStartDate();
  return tickets.filter((ticket) => {
    if (new Date(lastUpdatedAt(ticket)) < start && new Date(ticket.createdAt) < start) return false;
    if (dashboardFilters.department !== "All teams" && teamLabel(ticket) !== dashboardFilters.department) return false;
    if (dashboardFilters.rep !== "All reps" && ticket.assignee !== dashboardFilters.rep) return false;
    if (dashboardFilters.productFamily !== "All product families" && ticket.family !== dashboardFilters.productFamily) return false;
    if (dashboardFilters.source !== "All channels" && ticket.source !== dashboardFilters.source) return false;
    if (dashboardFilters.status !== "All statuses" && displayStatusFor(ticket) !== dashboardFilters.status) return false;
    return true;
  });
}

function dashboardStartDate() {
  const now = new Date();
  const start = new Date(now);
  if (dashboardFilters.timeframe === "Today") start.setHours(0, 0, 0, 0);
  else if (dashboardFilters.timeframe === "This month") start.setDate(1), start.setHours(0, 0, 0, 0);
  else if (dashboardFilters.timeframe === "Last 30 days" || dashboardFilters.timeframe === "Custom") start.setDate(start.getDate() - 30);
  else start.setDate(start.getDate() - 7);
  return start;
}

function renderTodayPriority(sourceTickets, eyebrow = "Today's Priority", title = "What needs action now", cards = dashboardPriorityCards(sourceTickets)) {
  return `
    <section class="dashboard-priority" aria-label="${escapeHtml(eyebrow)}">
      <div class="section-title">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h2>${escapeHtml(title)}</h2>
      </div>
      <div class="priority-card-grid">
        ${cards.map((card) => `
          <article class="priority-card tone-${card.tone}">
            <div>
              <span>${escapeHtml(card.label)}</span>
              <strong>${card.count}</strong>
            </div>
            <p>${escapeHtml(card.description)}</p>
            <button class="link-button" data-dashboard-filter-query="${escapeHtml(card.query)}" type="button">View tickets</button>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function dashboardPriorityCards(sourceTickets) {
  const cards = [
    {
      label: "Customer replies waiting",
      description: "Customers have replied and need a rep response.",
      query: "customer replied",
      tone: "risk",
      match: customerRepliedWithoutRep
    },
    {
      label: "Overdue tickets",
      description: "SLA has already passed or the ticket is beyond its due time.",
      query: "overdue",
      tone: "risk",
      match: isOverdue
    },
    {
      label: "SLA due soon",
      description: "Open tickets due within the next 8 hours.",
      query: "sla due soon",
      tone: "warn",
      match: isSlaDueSoon
    },
    {
      label: "Receipt/warranty review needed",
      description: "Warranty or receipt information needs verification before a promise is made.",
      query: "receipt warranty review needed",
      tone: "warn",
      match: (ticket) => isActiveTicket(ticket) && receiptWarrantyReviewNeeded(ticket)
    }
  ];
  return cards.map((card) => ({ ...card, count: sourceTickets.filter(card.match).length }));
}

function repPriorityCards(sourceTickets) {
  return [
    {
      label: "My open tickets",
      description: "Active tickets currently assigned to you.",
      query: "",
      tone: "neutral",
      count: sourceTickets.filter(isActiveTicket).length
    },
    ...dashboardPriorityCards(sourceTickets).map((card) => ({
      ...card,
      label: card.label === "Overdue tickets" ? "My overdue tickets" :
        card.label === "SLA due soon" ? "My SLA due soon" :
        card.label === "Customer replies waiting" ? "Customer replies waiting on me" :
        card.label === "Receipt/warranty review needed" ? "My receipt/warranty review needed" :
        card.label
    }))
  ];
}

function dashboardMetricCards(scopedTickets) {
  const open = scopedTickets.filter(isOpen);
  const needsAction = needsActionTickets(scopedTickets);
  return [
    { label: "New tickets", value: scopedTickets.filter((ticket) => hoursBetween(ticket.createdAt, new Date()) <= 24).length, trend: "down 8%", tone: "good" },
    { label: "Open tickets", value: open.length, trend: "up 12%", tone: open.length > 8 ? "risk" : "neutral" },
    { label: "Closed tickets", value: scopedTickets.filter(isClosedDisplayStatus).length, trend: "down 4%", tone: "good" },
    { label: "Customer replies", value: scopedTickets.filter(customerRepliedWithoutRep).length, trend: "up 1", tone: "warn" },
    { label: "SLA due soon", value: scopedTickets.filter((ticket) => isOpen(ticket) && hoursUntil(ticket.dueAt) <= 8 && hoursUntil(ticket.dueAt) >= 0).length, trend: "flat", tone: "warn" },
    { label: "Overdue", value: scopedTickets.filter(isOverdue).length, trend: "down 2", tone: scopedTickets.some(isOverdue) ? "risk" : "good" },
    { label: "Avg first response", value: `${averageFirstResponse(scopedTickets)}h`, trend: "down 11%", tone: "good" },
    { label: "Avg resolution", value: `${averageResolution(scopedTickets)}h`, trend: "down 6%", tone: "good" },
    { label: "Reopened", value: reopenedCount(scopedTickets), trend: "up 1", tone: "warn" },
    { label: "Needs action", value: needsAction.length, trend: needsAction.length ? "up 3" : "flat", tone: needsAction.length ? "risk" : "good" }
  ];
}

function dashboardManagerMetricCards(scopedTickets) {
  const activeTickets = scopedTickets.filter(isActiveTicket);
  const needsAction = needsActionTickets(scopedTickets);
  const activeReps = visibleAssignmentUsers().filter((user) => activeTickets.some((ticket) => ticket.assignee === user.name)).length;
  const customerReplies = scopedTickets.filter(customerRepliedWithoutRep);
  const dueSoon = scopedTickets.filter(isSlaDueSoon);
  const overdue = scopedTickets.filter(isOverdue);
  return [
    { label: "Active tickets", value: activeTickets.length, meta: `${activeReps} reps with open work`, tone: activeTickets.length > 14 ? "warn" : "neutral" },
    { label: "Needs action", value: needsAction.length, meta: "Ranked by customer wait and SLA", tone: needsAction.length ? "risk" : "good" },
    { label: "Customer replies", value: customerReplies.length, meta: "Waiting for a rep response", tone: customerReplies.length ? "warn" : "good" },
    { label: "SLA due soon", value: dueSoon.length, meta: "Due within 8 hours", tone: dueSoon.length ? "warn" : "good" },
    { label: "Overdue", value: overdue.length, meta: "Past due or breached", tone: overdue.length ? "risk" : "good" }
  ];
}

function dashboardRepMetricCards(primaryTickets, scopedTickets) {
  const activeTickets = primaryTickets.filter(isActiveTicket);
  const customerReplies = primaryTickets.filter(customerRepliedWithoutRep);
  const dueSoon = primaryTickets.filter(isSlaDueSoon);
  const overdue = primaryTickets.filter(isOverdue);
  return [
    { label: "My active tickets", value: activeTickets.length, meta: `${scopedTickets.length} tickets in filtered scope`, tone: activeTickets.length > 8 ? "warn" : "neutral" },
    { label: "Replies waiting", value: customerReplies.length, meta: "Customers need your next response", tone: customerReplies.length ? "warn" : "good" },
    { label: "SLA due soon", value: dueSoon.length, meta: "Due within 8 hours", tone: dueSoon.length ? "warn" : "good" },
    { label: "My overdue", value: overdue.length, meta: "Past due or breached", tone: overdue.length ? "risk" : "good" },
    { label: "Closed today", value: primaryTickets.filter(closedToday).length, meta: "Completed from your queue", tone: "good" }
  ];
}

function renderDashboardMetricCard(metric) {
  return `
    <article class="dashboard-metric tone-${metric.tone}">
      <span>${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(metric.value)}</strong>
      <small>${escapeHtml(metric.meta || metric.trend || "Current filtered view")}</small>
    </article>
  `;
}

function renderActivityChart(scopedTickets) {
  const series = dashboardActivitySeries(scopedTickets);
  const width = 760;
  const height = 230;
  const pad = 32;
  const max = Math.max(6, ...series.flatMap((item) => item.values));
  const colors = {
    Created: "#7C5CFF",
    Closed: "#A78BFF",
    Reopened: "#0F766E",
    "SLA risk": "#D8453B",
    "Customer replied": "#6034E0"
  };
  const lines = series.map((item) => {
    const points = item.values.map((value, index) => {
      const x = pad + (index * (width - pad * 2)) / (item.values.length - 1);
      const y = height - pad - (value / max) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `<polyline points="${points.join(" ")}" fill="none" stroke="${colors[item.name]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><title>${escapeHtml(item.name)}</title></polyline>`;
  }).join("");
  const labels = series.map((item) => `<span><i style="background:${colors[item.name]}"></i>${escapeHtml(item.name)}</span>`).join("");
  return `
    <div class="activity-chart">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Ticket activity trend chart">
        <rect x="0" y="0" width="${width}" height="${height}" rx="10"></rect>
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}"></line>
        <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}"></line>
        ${[0.25, 0.5, 0.75].map((step) => `<line class="grid-line" x1="${pad}" y1="${height - pad - step * (height - pad * 2)}" x2="${width - pad}" y2="${height - pad - step * (height - pad * 2)}"></line>`).join("")}
        ${lines}
      </svg>
      <div class="chart-legend">${labels}</div>
    </div>
  `;
}

function dashboardActivitySeries(scopedTickets) {
  const days = dashboardFilters.timeframe === "Today" ? 8 : dashboardFilters.timeframe === "Last 30 days" || dashboardFilters.timeframe === "This month" || dashboardFilters.timeframe === "Custom" ? 12 : 7;
  const base = Math.max(2, scopedTickets.length);
  const names = ["Created", "Closed", "Reopened", "SLA risk", "Customer replied"];
  return names.map((name, seriesIndex) => ({
    name,
    values: Array.from({ length: days }, (_, index) => {
      const wave = ((index + 1) * (seriesIndex + 2) + base) % 5;
      const ticketInfluence = scopedTickets.filter((ticket) => (stableNumber(ticket.id) + index + seriesIndex) % (seriesIndex + 3) === 0).length;
      const scale = name === "Created" ? 4 : name === "Closed" ? 3 : name === "Customer replied" ? 3 : 2;
      return Math.max(0, Math.round(wave + ticketInfluence + scale - seriesIndex / 2));
    })
  }));
}

function renderNeedsActionTable(scopedTickets, options = {}) {
  const includeAssignee = options.includeAssignee !== false;
  const limit = options.limit || 8;
  const rows = needsActionTickets(scopedTickets).slice(0, limit);
  if (!rows.length) return `<p class="dashboard-empty">${escapeHtml(options.emptyText || "No tickets need immediate action in this filtered view.")}</p>`;
  return `
    <div class="dashboard-table-wrap">
      <table class="dashboard-table">
        <thead><tr><th>Ticket #</th><th>Subject</th><th>Customer</th>${includeAssignee ? "<th>Assigned rep</th>" : ""}<th>Reason</th><th>Last updated</th><th>Action</th></tr></thead>
        <tbody>
          ${rows.map(({ ticket, reason }) => `
            <tr>
              <td><strong>${escapeHtml(ticketDisplayId(ticket))}</strong></td>
              <td>${escapeHtml(ticket.subject)}</td>
              <td>${escapeHtml(ticket.customer.name)}</td>
              ${includeAssignee ? `<td>${escapeHtml(ticket.assignee || "Unassigned")}</td>` : ""}
              <td><span class="reason-pill">${escapeHtml(reason)}</span></td>
              <td>${escapeHtml(dateTimeLabel(lastUpdatedAt(ticket)))}</td>
              <td><button class="ghost-button" data-dashboard-open-ticket="${escapeHtml(ticket.id)}" type="button">Work ticket</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function needsActionTickets(sourceTickets = tickets) {
  return sourceTickets
    .filter(isActiveTicket)
    .map((ticket) => ({ ticket, reason: needsActionReason(ticket), score: stuckTicketScore(ticket) }))
    .filter((item) => item.reason)
    .sort((a, b) => b.score - a.score || new Date(a.ticket.dueAt) - new Date(b.ticket.dueAt));
}

function needsActionReason(ticket) {
  if (customerRepliedWithoutRep(ticket)) return "Customer replied";
  if (isOverdue(ticket)) return "Overdue";
  if (isSlaDueSoon(ticket)) return "SLA due soon";
  if (missingReceiptNeeded(ticket)) return "Missing receipt";
  if (warrantyNeedsReview(ticket)) return "Warranty needs review";
  if (isEscalatedTicket(ticket) && isActiveTicket(ticket)) return "Escalated";
  if (noRepResponse(ticket)) return "No response from rep";
  if (ticket.tags.includes("follow-up-due")) return "Follow-up due";
  return "";
}

function isSlaDueSoon(ticket) {
  const hours = hoursUntil(ticket.dueAt);
  return isOpen(ticket) && hours >= 0 && hours <= 8;
}

function isUnassignedTicket(ticket) {
  return isActiveTicket(ticket) && !String(ticket.assignee || "").trim();
}

function isEscalatedTicket(ticket) {
  return Boolean(ticket.escalated) ||
    rawStatusValue(ticket.status) === "Escalated" ||
    ticket.tags?.some((tag) => /escalated/i.test(tag));
}

function missingReceiptNeeded(ticket) {
  const text = `${ticket.subject} ${ticket.tags?.join(" ") || ""} ${ticket.missing?.join(" ") || ""} ${ticket.warranty || ""}`.toLowerCase();
  return (!ticket.receipt && /receipt|warranty|registration|replacement|damaged/.test(text)) || /missing receipt|needs receipt|pending receipt/.test(text);
}

function warrantyNeedsReview(ticket) {
  const warranty = String(ticket.warranty || "").toLowerCase();
  const text = `${ticket.subject} ${ticket.tags?.join(" ") || ""} ${ticket.missing?.join(" ") || ""}`.toLowerCase();
  return /needs review|needs registration|pending receipt|not registered/.test(warranty) ||
    (/warranty|registration/.test(text) && !String(warranty).includes("registered"));
}

function receiptWarrantyReviewNeeded(ticket) {
  return missingReceiptNeeded(ticket) || warrantyNeedsReview(ticket);
}

function noRepResponse(ticket) {
  return isOpen(ticket) && !ticket.lastRepAt && hoursSince(ticket.createdAt) >= 8;
}

function closedToday(ticket) {
  if (!isClosedDisplayStatus(ticket)) return false;
  const closedAt = ticketClosedAt(ticket);
  if (!closedAt) return false;
  const closed = new Date(closedAt);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return closed >= start;
}

function renderWorkloadSection(scopedTickets) {
  if (!dashboardIsTeamMode()) return renderMyWorkload(scopedTickets);
  return renderTeamWorkload(scopedTickets);
}

function renderMyWorkload(scopedTickets) {
  const myTickets = scopedTickets.filter(assignedToCurrentDemoUser);
  const items = [
    ["Open assigned tickets", myTickets.filter(isActiveTicket).length, "Total active work in your queue"],
    ["Customer replies waiting", myTickets.filter(customerRepliedWithoutRep).length, "Customers need your next response"],
    ["Overdue", myTickets.filter(isOverdue).length, "Tickets past SLA"],
    ["Closed today", myTickets.filter(closedToday).length, "Tickets completed today"]
  ];
  return `
    <div class="workload-summary-grid">
      ${items.map(([label, value, detail]) => `
        <article>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
          <small>${escapeHtml(detail)}</small>
        </article>
      `).join("")}
    </div>
  `;
}

function renderTeamWorkload(scopedTickets) {
  const maxActive = Math.max(1, ...visibleAssignmentUsers().map((user) => scopedTickets.filter((ticket) => ticket.assignee === user.name && isActiveTicket(ticket)).length));
  return `
    <div class="dashboard-table-wrap">
      <table class="dashboard-table rep-table">
        <thead><tr><th>Rep name</th><th>Active tickets</th><th>Customer replies waiting</th><th>Overdue</th></tr></thead>
        <tbody>
          ${visibleAssignmentUsers().map((user) => {
            const repTickets = scopedTickets.filter((ticket) => ticket.assignee === user.name);
            const active = repTickets.filter(isActiveTicket).length;
            return `
              <tr>
                <td><strong>${escapeHtml(user.name)}</strong><span class="workload-bar"><i style="width:${Math.max(4, Math.min(100, (active / maxActive) * 100))}%"></i></span></td>
                <td><span class="workload-chip">${active}</span></td>
                <td><span class="workload-chip ${repTickets.some(customerRepliedWithoutRep) ? "chip-warn" : ""}">${repTickets.filter(customerRepliedWithoutRep).length}</span></td>
                <td><span class="workload-chip ${repTickets.some(isOverdue) ? "chip-risk" : ""}">${repTickets.filter(isOverdue).length}</span></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTeamTrendOverview(sourceTickets) {
  const weekTickets = ticketsWithinLastDays(sourceTickets, 7);
  return `
    ${renderTeamTrendStats(sourceTickets)}
    <div class="dashboard-widget-grid team-trend-widget-grid">
      ${renderMiniTrendWidget("Top product families", topCounts(weekTickets.map((ticket) => productFamilyBucket(ticket.family)), 5), "product family")}
      ${renderMiniTrendWidget("Top issue types", topCounts(weekTickets.flatMap(issueBucketsForTicket), 5), "issue type")}
      ${renderMiniTrendWidget("Most common models", topCounts(weekTickets.map((ticket) => ticket.model || "Unknown model"), 5), "model")}
      ${renderMiniTrendWidget("Channels / sources trend", topCounts(weekTickets.map(ticketPurchaseSource), 5), "source")}
    </div>
  `;
}

function renderTeamTrendStats(sourceTickets) {
  const stats = [
    ["Created today", sourceTickets.filter((ticket) => isToday(ticket.createdAt)).length],
    ["Created this week", sourceTickets.filter((ticket) => isWithinLastDays(ticket.createdAt, 7)).length],
    ["Closed today", sourceTickets.filter(closedToday).length],
    ["Closed this week", sourceTickets.filter((ticket) => {
      const closedAt = ticketClosedAt(ticket);
      return isClosedDisplayStatus(ticket) && closedAt && isWithinLastDays(closedAt, 7);
    }).length]
  ];
  return `
    <div class="team-trend-stats">
      ${stats.map(([label, value]) => `
        <article>
          <span>${escapeHtml(label)}</span>
          <strong>${value}</strong>
        </article>
      `).join("")}
    </div>
  `;
}

function renderDashboardMoreInsights(scopedTickets, primaryTickets) {
  const weekTickets = ticketsWithinLastDays(scopedTickets, 7);
  const createdThisWeek = scopedTickets.filter((ticket) => isWithinLastDays(ticket.createdAt, 7)).length;
  const closedThisWeek = scopedTickets.filter((ticket) => {
    const closedAt = ticketClosedAt(ticket);
    return isClosedDisplayStatus(ticket) && closedAt && isWithinLastDays(closedAt, 7);
  }).length;
  const max = Math.max(createdThisWeek, closedThisWeek, 1);

  return `
    <details class="dashboard-more-insights">
      <summary>
        <span>
          <strong>More insights</strong>
          <small>Trends, activity, and deeper manager review</small>
        </span>
        <i aria-hidden="true"></i>
      </summary>
      <div class="dashboard-more-grid">
        <article class="dashboard-widget created-closed-widget">
          <span>Created vs closed this week</span>
          <div class="created-closed-bars">
            ${renderComparisonBar("Created", createdThisWeek, max, "created")}
            ${renderComparisonBar("Closed", closedThisWeek, max, "closed")}
          </div>
        </article>
        ${renderMiniTrendWidget("Product trends", topCounts(weekTickets.map((ticket) => productFamilyBucket(ticket.family)), 5), "product")}
        ${renderMiniTrendWidget("Issue trends", topCounts(weekTickets.flatMap(issueBucketsForTicket), 5), "issue")}
        ${renderMiniTrendWidget("Channel/source trends", topCounts(weekTickets.map(ticketPurchaseSource), 5), "source")}
        <article class="dashboard-widget dashboard-recent-activity-widget">
          <span>Recent activity</span>
          ${renderImportantActivityFeed(primaryTickets)}
        </article>
      </div>
    </details>
  `;
}

function renderRepWorkloadTable(scopedTickets) {
  const rows = visibleAssignmentUsers().map((user) => managerWorkloadRowData(user, scopedTickets));
  const maxActive = Math.max(1, ...rows.map((row) => row.active));
  return `
    <div class="dashboard-table-wrap">
      <table class="dashboard-table rep-table manager-workload-table">
        <thead><tr><th>Rep name</th><th>Active tickets</th><th>Customer replies waiting</th><th>Overdue tickets</th><th>Risk level</th><th>Actions</th></tr></thead>
        <tbody>
          ${rows.map((row) => {
            const activeWidth = Math.max(4, Math.min(100, (row.active / maxActive) * 100));
            return `
              <tr class="manager-risk-row risk-${row.risk.tone}">
                <td><strong>${escapeHtml(row.user.name)}</strong><span class="workload-bar"><i style="width:${activeWidth}%"></i></span></td>
                <td><span class="workload-chip">${row.active}</span></td>
                <td><span class="workload-chip ${row.customerReplies >= 4 ? "chip-risk" : row.customerReplies >= 2 ? "chip-warn" : ""}">${row.customerReplies}</span></td>
                <td><span class="workload-chip ${row.overdue >= 2 ? "chip-risk" : row.overdue === 1 ? "chip-warn" : ""}">${row.overdue}</span></td>
                <td><span class="risk-pill risk-${row.risk.tone}">${escapeHtml(row.risk.label)}</span></td>
                <td>
                  <div class="dashboard-row-actions">
                    <button class="ghost-button mini-action-button" data-dashboard-rep-action="tickets" data-dashboard-rep-name="${escapeHtml(row.user.name)}" type="button">View rep tickets</button>
                    <button class="ghost-button mini-action-button" data-dashboard-rep-action="overdue" data-dashboard-rep-name="${escapeHtml(row.user.name)}" type="button"${row.overdue ? "" : " disabled"}>View overdue</button>
                    <button class="ghost-button mini-action-button" data-dashboard-rep-action="rebalance" data-dashboard-rep-name="${escapeHtml(row.user.name)}" type="button">Rebalance</button>
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderManagerWorkloadSnapshot(rows) {
  const watchCount = rows.filter((row) => row.risk.tone === "watch").length;
  const behindCount = rows.filter((row) => row.risk.tone === "behind").length;
  const busiest = [...rows].sort((a, b) => b.active - a.active)[0];
  const customerReplies = rows.reduce((total, row) => total + row.customerReplies, 0);
  const summary = [
    ["Watch reps", watchCount, "Need a check-in before risk grows"],
    ["Behind reps", behindCount, "Need manager attention"],
    ["Customer replies waiting", customerReplies, "Across eligible rep queues"],
    ["Busiest rep", busiest ? busiest.user.name : "None", busiest ? `${busiest.active} active tickets` : "No active workload"]
  ];
  return `
    <div class="workload-summary-grid manager-workload-summary">
      ${summary.map(([label, value, detail]) => `
        <article>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
          <small>${escapeHtml(detail)}</small>
        </article>
      `).join("")}
    </div>
  `;
}

function managerWorkloadRowData(user, scopedTickets) {
  const repTickets = scopedTickets.filter((ticket) => ticket.assignee === user.name);
  const activeTickets = repTickets.filter(isActiveTicket);
  const oldestOpen = [...activeTickets].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
  const data = {
    user,
    active: activeTickets.length,
    assignedToday: repTickets.filter((ticket) => hoursBetween(ticket.createdAt, new Date()) <= 24).length,
    customerReplies: repTickets.filter(customerRepliedWithoutRep).length,
    overdue: repTickets.filter(isOverdue).length,
    dueSoon: repTickets.filter(isSlaDueSoon).length,
    closedToday: repTickets.filter(closedToday).length,
    oldestOpenAge: oldestOpen ? ageLabel(oldestOpen.createdAt) : "None",
    oldestOpenHours: oldestOpen ? hoursSince(oldestOpen.createdAt) : 0
  };
  return {
    ...data,
    risk: managerRepRiskLevel(data)
  };
}

function managerRepRiskLevel(data) {
  if (data.overdue >= 2 || data.customerReplies >= 4 || data.dueSoon >= 4 || data.oldestOpenHours >= 120) {
    return { label: "Behind", tone: "behind" };
  }
  if (data.overdue >= 1 || data.customerReplies >= 2 || data.dueSoon >= 2 || data.oldestOpenHours >= 72 || data.active >= 12) {
    return { label: "Watch", tone: "watch" };
  }
  return { label: "Good", tone: "good" };
}

function handleDashboardRepAction(action, repName) {
  const safeRepName = String(repName || "").trim();
  if (!safeRepName) return;
  if (action === "tickets") {
    openDashboardFilteredQueue(safeRepName);
    return;
  }
  if (action === "overdue") {
    openDashboardFilteredQueue(`${safeRepName} overdue`);
    return;
  }
  if (action === "rebalance") {
    showToast(`Rebalance review queued for ${safeRepName}.`);
  }
}

function renderDashboardWidgets(scopedTickets) {
  const weekTickets = ticketsWithinLastDays(scopedTickets, 7);
  const createdThisWeek = scopedTickets.filter((ticket) => isWithinLastDays(ticket.createdAt, 7)).length;
  const closedThisWeek = scopedTickets.filter((ticket) => {
    const closedAt = ticketClosedAt(ticket);
    return isClosedDisplayStatus(ticket) && closedAt && isWithinLastDays(closedAt, 7);
  }).length;
  return `
    <div class="dashboard-widget-grid">
      <article class="dashboard-widget created-closed-widget">
        <span>Tickets created vs closed this week</span>
        <div class="created-closed-bars">
          ${renderComparisonBar("Created", createdThisWeek, Math.max(createdThisWeek, closedThisWeek, 1), "created")}
          ${renderComparisonBar("Closed", closedThisWeek, Math.max(createdThisWeek, closedThisWeek, 1), "closed")}
        </div>
      </article>
      ${renderMiniTrendWidget("Tickets by issue type", topCounts(weekTickets.flatMap(issueBucketsForTicket), 5), "issue type")}
      ${renderMiniTrendWidget("Tickets by product family", topCounts(weekTickets.map((ticket) => productFamilyBucket(ticket.family)), 5), "product family")}
      ${renderMiniTrendWidget("Tickets by purchase source", topCounts(weekTickets.map(ticketPurchaseSource), 5), "source")}
      ${renderMiniTrendWidget("Most common models this week", topCounts(weekTickets.map((ticket) => ticket.model || "Unknown model"), 5), "model")}
    </div>
  `;
}

function renderComparisonBar(label, value, max, tone) {
  return `
    <div class="comparison-row ${tone}">
      <span>${escapeHtml(label)}</span>
      <i><b style="width:${Math.max(5, (value / max) * 100)}%"></b></i>
      <strong>${value}</strong>
    </div>
  `;
}

function renderMiniTrendWidget(title, rows, queryPrefix) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return `
    <article class="dashboard-widget">
      <span>${escapeHtml(title)}</span>
      <div class="mini-trend-list">
        ${rows.length ? rows.map((row) => `
          <button class="mini-trend-row" data-dashboard-filter-query="${escapeHtml(row.label)}" type="button">
            <span>${escapeHtml(row.label)}</span>
            <i><b style="width:${Math.max(8, (row.count / max) * 100)}%"></b></i>
            <strong>${row.count}</strong>
          </button>
        `).join("") : `<p class="dashboard-empty compact">No ${escapeHtml(queryPrefix)} data in this view.</p>`}
      </div>
    </article>
  `;
}

function renderTrendingIssues(scopedTickets) {
  const trends = dashboardIssueTrends(scopedTickets);
  return `
    <div class="trending-issue-list">
      ${trends.map((trend) => `
        <article>
          <div>
            <strong>${escapeHtml(trend.label)}</strong>
            <span>${trend.count} matching tickets</span>
          </div>
          <span class="trend-change ${trend.change >= 0 ? "up" : "down"}">${trend.change >= 0 ? "+" : ""}${trend.change} vs previous period</span>
          <button class="ghost-button" data-dashboard-filter-query="${escapeHtml(trend.query)}" type="button">View</button>
        </article>
      `).join("")}
    </div>
  `;
}

function dashboardIssueTrends(scopedTickets) {
  const trendConfig = [
    { label: "RO500AK beeping/reset", query: "RO500AK beeping reset", match: (ticket) => /ro500ak/i.test(`${ticket.model} ${ticket.subject}`) && /beep|reset|filter|alarm/i.test(dashboardTicketText(ticket)) },
    { label: "WCS45KG startup/brine tank", query: "WCS45KG startup brine tank", match: (ticket) => /wcs45kg/i.test(`${ticket.model} ${ticket.subject}`) && /startup|brine|salt/i.test(dashboardTicketText(ticket)) },
    { label: "RCC7P-AK tank pressure", query: "RCC7P-AK tank pressure", match: (ticket) => /rcc7p-ak/i.test(`${ticket.model} ${ticket.subject}`) && /tank|pressure|not filling/i.test(dashboardTicketText(ticket)) },
    { label: "Warranty missing receipt", query: "warranty missing receipt", match: (ticket) => /warranty|registration/i.test(dashboardTicketText(ticket)) && missingReceiptNeeded(ticket) },
    { label: "Amazon damaged shipment", query: "Amazon damaged shipment", match: (ticket) => /amazon/i.test(ticketPurchaseSource(ticket)) && /damaged|shipment|replacement/i.test(dashboardTicketText(ticket)) },
    { label: "WGB32B pressure drop", query: "WGB32B pressure drop", match: (ticket) => /wgb32b/i.test(`${ticket.model} ${ticket.subject}`) && /pressure|drop|low flow/i.test(dashboardTicketText(ticket)) }
  ];
  return trendConfig.map((trend, index) => {
    const count = scopedTickets.filter(trend.match).length;
    const previous = Math.max(0, count - ((index % 3) - 1));
    return {
      ...trend,
      count,
      change: count - previous
    };
  });
}

function renderTrendSection(scopedTickets) {
  return `
    <div class="trend-columns">
      ${renderTrendList("Product family", topCounts(scopedTickets.map((ticket) => productFamilyBucket(ticket.family)), 8))}
      ${renderTrendList("Model", topCounts(scopedTickets.map((ticket) => ticket.model || "Unknown model"), 8))}
      ${renderTrendList("Issue type", topCounts(scopedTickets.flatMap(issueBucketsForTicket), 8))}
    </div>
  `;
}

function renderTrendList(title, rows) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return `
    <div class="trend-list">
      <h4>${escapeHtml(title)}</h4>
      ${rows.map((row) => `
        <div class="trend-row">
          <span>${escapeHtml(row.label)}</span>
          <strong>${row.count}</strong>
          <i style="width:${Math.max(8, (row.count / max) * 100)}%"></i>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSlaHealth(scopedTickets) {
  const dueSoon = scopedTickets.filter((ticket) => isOpen(ticket) && hoursUntil(ticket.dueAt) >= 0 && hoursUntil(ticket.dueAt) <= 8).length;
  const noRep = scopedTickets.filter(customerRepliedWithoutRep).length;
  const over24 = scopedTickets.filter((ticket) => isOpen(ticket) && hoursSince(lastUpdatedAt(ticket)) > 24).length;
  const over72 = scopedTickets.filter((ticket) => isOpen(ticket) && hoursSince(lastUpdatedAt(ticket)) > 72).length;
  const items = [
    ["Tickets due soon", dueSoon],
    ["Overdue tickets", scopedTickets.filter(isOverdue).length],
    ["Avg first response", `${averageFirstResponse(scopedTickets)}h`],
    ["Avg customer wait", `${averageCustomerWait(scopedTickets)}h`],
    ["Avg rep wait", `${averageRepWait(scopedTickets)}h`],
    ["No rep response", noRep],
    ["Waiting over 24h", over24],
    ["Waiting over 72h", over72]
  ];
  return `<div class="sla-health-grid">${items.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("")}</div>`;
}

function renderStuckTickets(scopedTickets) {
  const rows = scopedTickets
    .filter(isActiveTicket)
    .map((ticket) => ({ ticket, score: stuckTicketScore(ticket), reason: stuckTicketReason(ticket) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);
  if (!rows.length) return `<p class="dashboard-empty">No stuck tickets in this filtered view.</p>`;
  return `
    <div class="stuck-list">
      ${rows.map(({ ticket, reason }, index) => `
        <article>
          <span class="rank-pill">#${index + 1}</span>
          <div>
            <strong>${escapeHtml(ticketDisplayId(ticket))} - ${escapeHtml(ticket.subject)}</strong>
            <p>${escapeHtml(reason)} / ${escapeHtml(ticket.assignee || "Unassigned")} / ${escapeHtml(dueLabel(ticket.dueAt))}</p>
          </div>
          <button class="ghost-button" data-dashboard-open-ticket="${escapeHtml(ticket.id)}" type="button">Open</button>
        </article>
      `).join("")}
    </div>
  `;
}

function renderImportantActivityFeed(scopedTickets) {
  const items = importantActivityItems(scopedTickets).slice(0, 9);
  if (!items.length) return `<p class="dashboard-empty">No important activity in this filtered view.</p>`;
  return `
    <div class="important-feed">
      ${items.map((item) => `
        <button class="important-feed-item" data-dashboard-open-ticket="${escapeHtml(item.ticket.id)}" type="button">
          <span class="activity-dot ${escapeHtml(item.tone)}"></span>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(ticketDisplayId(item.ticket))} / ${escapeHtml(item.ticket.subject)}</p>
          </div>
          <time>${escapeHtml(ageLabel(item.timestamp))}</time>
        </button>
      `).join("")}
    </div>
  `;
}

function importantActivityItems(scopedTickets) {
  const items = [];
  scopedTickets.forEach((ticket) => {
    const latestCustomer = latestEmailStyleMessage(ticket);
    if (latestCustomer?.type === "customer" && customerRepliedWithoutRep(ticket)) {
      items.push({ ticket, title: "Customer replied", timestamp: latestCustomer.timestamp, tone: "warn" });
    }
    if (isEscalatedTicket(ticket)) {
      items.push({ ticket, title: "Ticket escalated", timestamp: escalationTimestamp(ticket), tone: "risk" });
    }
    if (isClosedDisplayStatus(ticket)) {
      items.push({ ticket, title: "Ticket closed", timestamp: ticketClosedAt(ticket), tone: "good" });
    }
    if (isOverdue(ticket)) {
      items.push({ ticket, title: "SLA breached", timestamp: ticket.dueAt, tone: "risk" });
    }
    visibleThreadMessages(ticket)
      .filter((message) => message.type === "timeline")
      .forEach((message) => {
        const body = String(message.body || "");
        if (/receipt .*uploaded|uploaded .*receipt|receipt .*verified/i.test(body)) {
          items.push({ ticket, title: "Receipt uploaded", timestamp: message.timestamp, tone: "warn" });
        } else if (/warranty registered/i.test(body)) {
          items.push({ ticket, title: "Warranty registered", timestamp: message.timestamp, tone: "good" });
        } else if (/reassigned|assigned to/i.test(body) && !/detected purchase source/i.test(body)) {
          items.push({ ticket, title: /reassigned/i.test(body) ? "Rep reassigned" : "Rep assigned", timestamp: message.timestamp, tone: "neutral" });
        }
      });
  });
  return items
    .filter((item) => item.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function escalationTimestamp(ticket) {
  const event = [...visibleThreadMessages(ticket)]
    .reverse()
    .find((message) => /escalat/i.test(message.body));
  return event?.timestamp || lastUpdatedAt(ticket);
}

function ticketPurchaseSource(ticket) {
  return ticket.purchaseSource || purchaseSourceLabel(ticket) || ticket.source || "Unknown";
}

function dashboardTicketText(ticket) {
  return [
    ticket.subject,
    ticket.model,
    ticket.family,
    ticket.source,
    ticket.purchaseSource,
    ticket.warranty,
    ticket.tags?.join(" "),
    ticket.missing?.join(" "),
    lastCustomerMessage(ticket),
    ticket.diagnosis?.issue
  ].join(" ");
}

function ticketsWithinLastDays(sourceTickets, days) {
  return sourceTickets.filter((ticket) => isWithinLastDays(ticket.createdAt, days) || isWithinLastDays(lastUpdatedAt(ticket), days));
}

function isWithinLastDays(value, days) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const start = new Date();
  start.setDate(start.getDate() - days);
  return date >= start;
}

function isToday(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
}

function productFamilyBucket(family) {
  const buckets = {
    "Under Sink RO": "RO",
    "Tankless RO": "Tankless RO",
    "Whole House": "Whole House",
    "Water Softener": "Softener",
    UV: "UV",
    Warranty: "Warranty",
    Returns: "Return",
    Shipping: "Shipping"
  };
  return buckets[family] || family || "Other";
}

function issueBucketsForTicket(ticket) {
  const text = `${ticket.subject} ${ticket.tags.join(" ")} ${ticket.diagnosis.issue}`.toLowerCase();
  const buckets = [];
  if (/low flow|pressure|not filling|tank/.test(text)) buckets.push("low flow");
  if (/tds|manganese|iron|water test|hardness/.test(text)) buckets.push("high TDS / water quality");
  if (/leak/.test(text)) buckets.push("leaking");
  if (/beeping|alarm|light|display/.test(text)) buckets.push("beeping / alarm");
  if (/warranty|receipt|registration/.test(text)) buckets.push("warranty registration");
  if (/replacement|parts|damaged/.test(text)) buckets.push("replacement request");
  if (/return/.test(text)) buckets.push("return");
  if (!buckets.length) buckets.push(ticket.family || "general support");
  return buckets;
}

function topCounts(values, limit) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function averageFirstResponse(sourceTickets) {
  const values = sourceTickets
    .filter((ticket) => ticket.lastRepAt)
    .map((ticket) => Math.max(0.5, hoursBetween(ticket.createdAt, ticket.lastRepAt)));
  return averageHours(values, 3.8);
}

function averageResolution(sourceTickets) {
  const values = sourceTickets.map((ticket) => {
    const base = Math.max(8, hoursBetween(ticket.createdAt, lastUpdatedAt(ticket)));
    if (isClosedDisplayStatus(ticket)) return base;
    return base + (isOverdue(ticket) ? 16 : ticket.escalated ? 10 : 4);
  });
  return averageHours(values, 34);
}

function averageCustomerWait(sourceTickets) {
  const values = sourceTickets
    .filter((ticket) => ticket.lastCustomerAt)
    .map((ticket) => Math.max(0.5, hoursSince(ticket.lastCustomerAt)));
  return averageHours(values, 11);
}

function averageRepWait(sourceTickets) {
  const values = sourceTickets
    .filter((ticket) => ticket.lastRepAt)
    .map((ticket) => Math.max(0.5, hoursSince(ticket.lastRepAt)));
  return averageHours(values, 9);
}

function averageHours(values, fallback) {
  if (!values.length) return fallback;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function reopenedCount(sourceTickets) {
  return sourceTickets.filter((ticket) => ticket.tags.includes("reopened") || ticket.conversation.some((message) => /reopen/i.test(message.body))).length;
}

function customerRepliedWithoutRep(ticket) {
  return ticketNeedsRepResponse(ticket);
}

function stuckTicketScore(ticket) {
  let score = 0;
  if (isOverdue(ticket)) score += 5;
  if (customerRepliedWithoutRep(ticket)) score += 4;
  if (ticket.conversation.filter((message) => message.type === "customer").length >= 5) score += 3;
  if (hoursSince(ticket.createdAt) > 168) score += 3;
  if (/frustrat|angry|upset|again|still|damaged|replacement|warranty/i.test(lastCustomerMessage(ticket))) score += 2;
  if (/warranty|replacement|damaged|return/i.test(`${ticket.subject} ${ticket.tags.join(" ")} ${ticket.warranty}`)) score += 2;
  if (previewMissingIndicators(ticket).length) score += 1;
  return score;
}

function stuckTicketReason(ticket) {
  const reasons = [];
  if (isOverdue(ticket)) reasons.push("overdue");
  if (customerRepliedWithoutRep(ticket)) reasons.push("customer replied");
  if (ticket.conversation.filter((message) => message.type === "customer").length >= 5) reasons.push("5+ customer replies");
  if (hoursSince(ticket.createdAt) > 168) reasons.push("older than 7 days");
  if (/frustrat|angry|upset|again|still/i.test(lastCustomerMessage(ticket))) reasons.push("frustrated tone");
  if (/warranty|replacement|damaged|return/i.test(`${ticket.subject} ${ticket.tags.join(" ")} ${ticket.warranty}`)) reasons.push("warranty/replacement dispute");
  return reasons.join(", ") || "possible top risk candidate";
}

function stableNumber(value) {
  return String(value).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function hoursBetween(start, end) {
  return Math.max(0, Math.round((new Date(end) - new Date(start)) / 36e5));
}

function hoursSince(value) {
  return hoursBetween(value, new Date());
}

function hoursUntil(value) {
  return Math.round((new Date(value) - new Date()) / 36e5);
}

function renderAdminToolCard(id, title, meta, body, status = "") {
  return `
    <button class="admin-tool-card" data-admin-tool="${escapeHtml(id)}" type="button">
      <span>${escapeHtml(meta)}</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(body)}</p>
      ${status ? `<small>${escapeHtml(status)}</small>` : ""}
    </button>
  `;
}

function renderAdminOverview() {
  const visibleReps = visibleAssignmentUsers();
  const eligibleReps = activeAssignmentUsers();
  const activeDocs = knowledgeDocs.filter((doc) => !doc.archived);
  const approvedSources = approvedKnowledgeSources();
  const needsReview = activeDocs.filter((doc) => doc.status === "Needs Review" || doc.status === "Draft").length;
  const activeLinks = productLinks.filter((link) => link.active).length;
  const activeTickets = tickets.filter(isActiveTicket).length;
  const overview = [
    ["Support queue", activeTickets, `${eligibleReps.length} of ${visibleReps.length} reps routing new work`],
    ["Knowledge Vault", `${approvedSources.length}/${activeDocs.length}`, `${needsReview} source files need review`],
    ["Macros", macroLibrary.length, "Canned replies available from ticket detail"],
    ["Product links", activeLinks, "Active library links available to reps"]
  ];
  return `
    <section class="admin-card admin-overview-card" aria-label="Admin Hub overview">
      <div class="section-title">
        <p class="eyebrow">Control center</p>
        <h3>Support operations overview</h3>
      </div>
      <div class="admin-overview-grid">
        ${overview.map(([label, value, detail]) => `
          <article>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
            <small>${escapeHtml(detail)}</small>
          </article>
        `).join("")}
      </div>
      <p class="admin-section-note">Admin Hub brings together support source files, macros, product links, rep assignment, and workspace settings for RepOS.</p>
    </section>
  `;
}

function renderAdminMacroSection() {
  const favoriteCount = macroLibrary.filter((macro) => macro.favorite).length;
  const dailyCount = macroLibrary.filter((macro) => macro.dailyUse).length;
  const categoryCount = new Set(macroLibrary.map((macro) => macro.category)).size;
  const rows = macroLibrary
    .map((macro) => `
      <tr>
        <td><strong>${escapeHtml(macro.name)}</strong></td>
        <td>${escapeHtml(macro.category)}</td>
        <td>${macro.favorite ? "Yes" : "No"}</td>
        <td>${macro.dailyUse ? "Yes" : "No"}</td>
      </tr>
    `)
    .join("");

  return `
    <section class="admin-card admin-macro-card">
      <div class="section-title row-title">
        <div>
          <p class="eyebrow">Macros</p>
          <h3>Canned response library</h3>
        </div>
        <button class="ghost-button" data-admin-tool="macros" type="button">Open selected ticket macros</button>
      </div>
      <div class="admin-macro-summary" aria-label="Macro library summary">
        <div><span>Total</span><strong>${macroLibrary.length}</strong></div>
        <div><span>Favorites</span><strong>${favoriteCount}</strong></div>
        <div><span>Daily use</span><strong>${dailyCount}</strong></div>
        <div><span>Categories</span><strong>${categoryCount}</strong></div>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Macro</th><th>Category</th><th>Favorite</th><th>Daily use</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderAdminPanel() {
  if (uiState.activeScreen !== "admin") {
    el.adminPanel.innerHTML = "";
    return;
  }

  const userRows = visibleAssignmentUsers()
    .map((user) => {
      const activeCount = activeTicketCountFor(user.name);
      const closedCount = closedTicketCountFor(user.name);
      const targetOptions = activeAssignmentUsers()
        .filter((target) => target.name !== user.name)
        .map((target) => `<option value="${escapeHtml(target.name)}">${escapeHtml(target.name)}</option>`)
        .join("");

      return `
        <tr data-admin-user-row="${escapeHtml(user.id)}">
          <td><strong>${escapeHtml(user.name)}</strong></td>
          <td>${escapeHtml(user.role)}</td>
          <td>${activeCount}</td>
          <td>${closedCount}</td>
          <td>${user.assignmentEligible ? "Yes" : "No"}</td>
          <td>
            <div class="admin-actions">
              <button class="ghost-button" data-toggle-user="${escapeHtml(user.id)}" type="button">${user.assignmentEligible ? "Disable" : "Enable"}</button>
              <button class="ghost-button danger" data-remove-user="${escapeHtml(user.id)}" type="button">Remove</button>
              <select data-reassign-target="${escapeHtml(user.id)}" aria-label="Reassign ${escapeHtml(user.name)} tickets">
                <option value="">Reassign to...</option>
                ${targetOptions}
              </select>
              <button class="ghost-button" data-reassign-from="${escapeHtml(user.id)}" type="button">Reassign tickets</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  el.adminPanel.innerHTML = `
    <div class="admin-header">
      <div>
        <p class="eyebrow">Admin</p>
        <h1>RepOS Admin Hub</h1>
        <p>Control center for support tools, source files, reps, assignment routing, and workspace settings.</p>
      </div>
      <button class="secondary-button" id="backFromAdminButton" type="button">Back to queue</button>
    </div>
    ${renderAdminOverview()}
    <section class="admin-card admin-hub-card">
      <div class="section-title">
        <p class="eyebrow">Admin navigation</p>
        <h3>Support tool shortcuts</h3>
      </div>
      <p class="admin-section-note">Jump to the admin surfaces that maintain the current support workspace.</p>
      <div class="admin-tool-grid">
        ${renderAdminToolCard("knowledge", "Knowledge Vault", "Source files", "Manage approved workspace sources.", `${approvedKnowledgeSources().length} approved sources`)}
        ${renderAdminToolCard("macros", "Macros", "Canned replies", "Review the macro library and open a ticket context.", `${macroLibrary.length} macros`)}
        ${renderAdminToolCard("assignment", "Assignment Pool / Reps", "Workload", "Manage eligible reps and reassignment.", `${activeAssignmentUsers().length} eligible reps`)}
        ${renderAdminToolCard("workspace", "Workspace Settings", "Profile", "Open workspace settings and admin controls.", "Profile and recovery tools")}
      </div>
    </section>
    <section class="admin-card admin-recovery-card">
      <div class="section-title">
        <p class="eyebrow">Admin tools</p>
        <h3>Workspace recovery</h3>
      </div>
      <p>Restore this local iSpring demo workspace to the seeded support queue, assignment pool, profile preferences, Product Link Library, customer accounts, notifications, and an empty RepOS Knowledge Vault. This overwrites persisted local demo changes.</p>
      <button class="secondary-button danger-soft" id="adminResetWorkspaceButton" type="button">Restore seed demo data</button>
    </section>
    ${renderAdminMacroSection()}
    <section class="admin-card admin-assignment-card" id="assignmentPoolSection">
      <div class="admin-assignment-head">
        <div class="section-title">
          <p class="eyebrow">Workload</p>
          <h3>Assignment pool</h3>
        </div>
        <form class="admin-add-form" id="addRepForm">
          <input name="repName" required placeholder="Rep name">
          <select name="repRole" aria-label="Role">
            ${userRoles.map((role) => `<option value="${role}">${role}</option>`).join("")}
          </select>
          <button class="primary-button" type="submit">Add rep</button>
        </form>
      </div>
      <p class="admin-section-note">Enable reps for new ticket assignment, reassign active work before removal, and review current workload.</p>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Rep name</th>
              <th>Role</th>
              <th>Active tickets</th>
              <th>Closed tickets</th>
              <th>Assignment eligible</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${userRows}</tbody>
        </table>
      </div>
    </section>
    ${renderAppFooter("admin-footer")}
  `;

  el.adminPanel.querySelector("#backFromAdminButton").addEventListener("click", showQueueScreen);
  el.adminPanel.querySelector("#adminResetWorkspaceButton").addEventListener("click", resetDemoData);
  el.adminPanel.querySelectorAll("[data-admin-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.adminTool === "knowledge") showKnowledgeVaultScreen();
      if (button.dataset.adminTool === "macros") showMacroLibrary();
      if (button.dataset.adminTool === "assignment") el.adminPanel.querySelector("#assignmentPoolSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (button.dataset.adminTool === "workspace") openProfileModal("workspace");
    });
  });
  el.adminPanel.querySelector("#addRepForm").addEventListener("submit", handleAddRep);
  el.adminPanel.querySelectorAll("[data-toggle-user]").forEach((button) => button.addEventListener("click", () => toggleAssignmentEligibility(button.dataset.toggleUser)));
  el.adminPanel.querySelectorAll("[data-remove-user]").forEach((button) => button.addEventListener("click", () => removeAssignmentUser(button.dataset.removeUser)));
  el.adminPanel.querySelectorAll("[data-reassign-from]").forEach((button) => button.addEventListener("click", () => {
    const select = el.adminPanel.querySelector(`[data-reassign-target="${button.dataset.reassignFrom}"]`);
    reassignTicketsFromUser(button.dataset.reassignFrom, select.value);
  }));
}

function renderKnowledgeVaultPanel() {
  if (uiState.activeScreen !== "knowledge") {
    el.knowledgePanel.innerHTML = "";
    return;
  }

  const visibleDocs = getVisibleKnowledgeDocs();
  const visibleProductLinks = getVisibleProductLinks();
  const activeDocs = knowledgeDocs.filter((doc) => !doc.archived);
  const approvedSources = approvedKnowledgeSources();
  const approvedCount = approvedSources.length;
  const reviewCount = activeDocs.filter((doc) => doc.status === "Needs Review" || doc.status === "Draft").length;
  const customerFacingCount = activeDocs.filter((doc) => doc.customerFacingAllowed).length;
  el.knowledgePanel.innerHTML = `
    <div class="admin-header knowledge-header">
      <div>
        <p class="eyebrow">RepOS Knowledge Vault</p>
        <h1>Source file library</h1>
        <p>Upload manuals, policies, macros, troubleshooting guides, and other source files for the workspace source library.</p>
      </div>
      <button class="secondary-button" id="backFromKnowledgeButton" type="button">Back to queue</button>
    </div>
    <section class="admin-card knowledge-vault-summary" aria-label="Knowledge Vault summary">
      <div><span>Total files</span><strong>${activeDocs.length}</strong></div>
      <div><span>Approved sources</span><strong>${approvedCount}</strong></div>
      <div><span>Needs review</span><strong>${reviewCount}</strong></div>
      <div><span>Customer-facing</span><strong>${customerFacingCount}</strong></div>
    </section>
    <section class="admin-card knowledge-source-note">
      <strong>${approvedCount ? "Using approved RepOS Knowledge Vault sources." : "No approved RepOS Knowledge Vault sources available yet."}</strong>
      <p>${approvedCount ? approvedSources.map((doc) => `Source: ${escapeHtml(doc.fileName)}`).join("<br>") : "Approve an uploaded source before using it as support reference material."}</p>
      <p>Approved source details stay available in this workspace and help reps see which materials are cleared for support use.</p>
    </section>
    <section class="admin-card knowledge-controls-card">
      <div class="section-title row-title">
        <div>
          <p class="eyebrow">Browse sources</p>
          <h3>Search and filter files</h3>
        </div>
        <span class="mini-count">${visibleDocs.length}</span>
      </div>
      <div class="knowledge-controls">
        <label>
          <span>Search</span>
          <input id="knowledgeSearch" type="search" value="${escapeHtml(filters.knowledgeSearch)}" placeholder="File name, title, owner, description">
        </label>
        <label>
          <span>Category</span>
          <select id="knowledgeCategoryFilter">
            ${["All", ...knowledgeCategories].map((category) => `<option value="${escapeHtml(category)}"${filters.knowledgeCategory === category ? " selected" : ""}>${escapeHtml(category)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select id="knowledgeStatusFilter">
            ${["All", ...knowledgeStatuses].map((status) => `<option value="${escapeHtml(status)}"${filters.knowledgeStatus === status ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}
          </select>
        </label>
      </div>
      <p class="knowledge-filter-hint">Search checks file name, title, owner, category, status, and description.</p>
    </section>
    ${currentUserIsAdmin() ? renderKnowledgeUploadArea() : ""}
    ${currentUserIsAdmin() ? renderKnowledgeUploadApprovalPrompt() : ""}
    <section class="knowledge-file-section">
      ${visibleDocs.length ? renderKnowledgeFileTable(visibleDocs) : renderKnowledgeEmptyState()}
    </section>
    ${renderProductLinkLibrarySection(visibleProductLinks)}
    ${renderAppFooter("knowledge-footer")}
  `;

  el.knowledgePanel.querySelector("#backFromKnowledgeButton").addEventListener("click", showQueueScreen);
  el.knowledgePanel.querySelector("#knowledgeSearch").addEventListener("input", (event) => {
    filters.knowledgeSearch = event.target.value;
    renderKnowledgeVaultPanel();
  });
  el.knowledgePanel.querySelector("#knowledgeCategoryFilter").addEventListener("change", (event) => {
    filters.knowledgeCategory = event.target.value;
    renderKnowledgeVaultPanel();
  });
  el.knowledgePanel.querySelector("#knowledgeStatusFilter").addEventListener("change", (event) => {
    filters.knowledgeStatus = event.target.value;
    renderKnowledgeVaultPanel();
  });
  el.knowledgePanel.querySelector("#knowledgeFileInput")?.addEventListener("change", handleKnowledgeFileSelection);
  el.knowledgePanel.querySelector("#knowledgeUploadButton")?.addEventListener("click", () => el.knowledgePanel.querySelector("#knowledgeFileInput")?.click());
  el.knowledgePanel.querySelector("[data-approve-uploaded]")?.addEventListener("click", approveUploadedKnowledgeFiles);
  el.knowledgePanel.querySelector("[data-keep-uploaded-draft]")?.addEventListener("click", clearUploadApprovalPrompt);
  el.knowledgePanel.querySelector("#knowledgeDropzone")?.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.currentTarget.classList.add("dragging");
  });
  el.knowledgePanel.querySelector("#knowledgeDropzone")?.addEventListener("dragleave", (event) => event.currentTarget.classList.remove("dragging"));
  el.knowledgePanel.querySelector("#knowledgeDropzone")?.addEventListener("drop", (event) => {
    event.preventDefault();
    event.currentTarget.classList.remove("dragging");
    handleKnowledgeFiles(event.dataTransfer?.files || []);
  });
  el.knowledgePanel.querySelectorAll("[data-view-knowledge]").forEach((button) => button.addEventListener("click", () => openKnowledgeFileModal(button.dataset.viewKnowledge)));
  el.knowledgePanel.querySelectorAll("[data-edit-knowledge]").forEach((button) => button.addEventListener("click", () => openKnowledgeFileModal(button.dataset.editKnowledge)));
  el.knowledgePanel.querySelectorAll("[data-remove-knowledge]").forEach((button) => button.addEventListener("click", () => removeKnowledgeFile(button.dataset.removeKnowledge)));
  el.knowledgePanel.querySelectorAll("[data-approve-now-knowledge]").forEach((button) => button.addEventListener("click", () => approveKnowledgeFile(button.dataset.approveNowKnowledge)));
  el.knowledgePanel.querySelectorAll("[data-approve-knowledge]").forEach((control) => {
    control.addEventListener("change", () => updateKnowledgeBoolean(control.dataset.approveKnowledge, "approvedForAi", control.checked));
  });
  el.knowledgePanel.querySelectorAll("[data-internal-knowledge]").forEach((control) => {
    control.addEventListener("change", () => updateKnowledgeBoolean(control.dataset.internalKnowledge, "internalOnly", control.checked));
  });
  el.knowledgePanel.querySelectorAll("[data-customer-knowledge]").forEach((control) => {
    control.addEventListener("change", () => updateKnowledgeBoolean(control.dataset.customerKnowledge, "customerFacingAllowed", control.checked));
  });
  el.knowledgePanel.querySelectorAll("[data-status-knowledge]").forEach((control) => {
    control.addEventListener("change", () => updateKnowledgeField(control.dataset.statusKnowledge, "status", control.value));
  });
  el.knowledgePanel.querySelector("#productLinkSearch")?.addEventListener("input", (event) => {
    filters.productLinkSearch = event.target.value;
    renderKnowledgeVaultPanel();
  });
  el.knowledgePanel.querySelector("#productLinkPlatformFilter")?.addEventListener("change", (event) => {
    filters.productLinkPlatform = event.target.value;
    renderKnowledgeVaultPanel();
  });
  el.knowledgePanel.querySelector("#addProductLinkForm")?.addEventListener("submit", handleAddProductLink);
  el.knowledgePanel.querySelectorAll("[data-edit-product-link]").forEach((button) => {
    button.addEventListener("click", () => openProductLinkModal(button.dataset.editProductLink));
  });
  el.knowledgePanel.querySelectorAll("[data-deactivate-product-link]").forEach((button) => {
    button.addEventListener("click", () => deactivateProductLink(button.dataset.deactivateProductLink));
  });
}

function renderKnowledgeUploadArea() {
  return `
    <section class="admin-card knowledge-upload-card">
      <div class="section-title">
        <p class="eyebrow">Admin upload</p>
        <h3>Upload files</h3>
      </div>
      <div class="knowledge-dropzone" id="knowledgeDropzone">
        <strong>Upload files</strong>
        <p>Drag and drop PDF, DOCX, TXT, CSV, XLSX, PNG, or JPG files here, or choose files from your computer.</p>
        <button class="primary-button" id="knowledgeUploadButton" type="button">Upload files</button>
        <input id="knowledgeFileInput" type="file" multiple accept=".pdf,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg" hidden>
      </div>
    </section>
  `;
}

function renderKnowledgeUploadApprovalPrompt() {
  const activeIds = uploadApprovalPrompt.docIds.filter((id) => knowledgeDocs.some((doc) => doc.id === id && !doc.archived && !doc.approvedForAi));
  if (!activeIds.length) return "";
  const names = uploadApprovalPrompt.fileNames.length ? uploadApprovalPrompt.fileNames : activeIds.map((id) => knowledgeDocs.find((doc) => doc.id === id)?.fileName).filter(Boolean);
  return `
    <section class="admin-card knowledge-approval-prompt">
      <div>
        <p class="eyebrow">Upload complete</p>
        <h3>Approve this file as a workspace source?</h3>
        <p>${escapeHtml(names.join(", "))}</p>
      </div>
      <div class="knowledge-approval-actions">
        <button class="primary-button" data-approve-uploaded type="button">Approve now</button>
        <button class="secondary-button" data-keep-uploaded-draft type="button">Keep as draft</button>
      </div>
    </section>
  `;
}

function renderKnowledgeEmptyState() {
  return `
    <div class="empty-state polished knowledge-empty-state">
      <strong>No knowledge files uploaded yet.</strong>
      <p>Upload manuals, policies, macros, troubleshooting guides, or other source files for this workspace.</p>
    </div>
  `;
}

function renderKnowledgeFileTable(files) {
  return `
    <div class="knowledge-table-wrap">
      <table class="knowledge-table">
        <thead>
          <tr>
            <th>File name</th>
            <th>Type</th>
            <th>Size</th>
            <th>Upload date</th>
            <th>Uploaded by</th>
            <th>Category</th>
            <th>Status</th>
            <th>Approved</th>
            <th>Internal</th>
            <th>Customer-facing</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${files.map(renderKnowledgeFileRow).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderKnowledgeFileRow(doc) {
  return `
    <tr>
      <td><button class="link-button" data-view-knowledge="${escapeHtml(doc.id)}" type="button">${escapeHtml(doc.fileName)}</button><small>${escapeHtml(doc.title)}</small>${doc.description ? `<small>${escapeHtml(doc.description.slice(0, 96))}${doc.description.length > 96 ? "..." : ""}</small>` : ""}</td>
      <td>${escapeHtml(doc.fileType)}</td>
      <td>${escapeHtml(formatFileSize(doc.size))}</td>
      <td>${escapeHtml(doc.uploadDate)}</td>
      <td>${escapeHtml(doc.uploadedBy)}</td>
      <td>${escapeHtml(doc.category)}</td>
      <td>${currentUserIsAdmin() ? `<select data-status-knowledge="${escapeHtml(doc.id)}" aria-label="Status for ${escapeHtml(doc.fileName)}">${knowledgeStatuses.map((status) => `<option value="${escapeHtml(status)}"${doc.status === status ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}</select>` : escapeHtml(doc.status)}</td>
      <td><label class="inline-approval"><input data-approve-knowledge="${escapeHtml(doc.id)}" type="checkbox" ${doc.approvedForAi ? "checked" : ""} ${currentUserIsAdmin() ? "" : "disabled"} aria-label="Approved workspace source"><span>${doc.approvedForAi ? "Yes" : "No"}</span></label></td>
      <td><input data-internal-knowledge="${escapeHtml(doc.id)}" type="checkbox" ${doc.internalOnly ? "checked" : ""} ${currentUserIsAdmin() ? "" : "disabled"} aria-label="Internal only"></td>
      <td><input data-customer-knowledge="${escapeHtml(doc.id)}" type="checkbox" ${doc.customerFacingAllowed ? "checked" : ""} ${currentUserIsAdmin() ? "" : "disabled"} aria-label="Customer-facing allowed"></td>
      <td>
        <div class="knowledge-actions">
          <button class="ghost-button" data-view-knowledge="${escapeHtml(doc.id)}" type="button">View</button>
          ${currentUserIsAdmin() ? `${doc.approvedForAi && doc.status === "Approved" ? "" : `<button class="ghost-button" data-approve-now-knowledge="${escapeHtml(doc.id)}" type="button">Approve</button>`}<button class="ghost-button" data-edit-knowledge="${escapeHtml(doc.id)}" type="button">Edit metadata</button><button class="ghost-button danger" data-remove-knowledge="${escapeHtml(doc.id)}" type="button">Remove</button>` : ""}
        </div>
      </td>
    </tr>
  `;
}

function renderProductLinkLibrarySection(links) {
  const activeCount = productLinks.filter((link) => link.active).length;
  const modelLinkCount = productLinks.filter((link) => link.active && link.model).length;
  const reviewLinkCount = reviewProductLinks().length;
  const inactiveCount = productLinks.filter((link) => !link.active).length;
  return `
    <section class="admin-card product-link-library-card">
      <div class="section-title row-title">
        <div>
          <p class="eyebrow">Product Link Library</p>
          <h3>Saved product and review links</h3>
        </div>
        <span class="mini-count">${links.length}</span>
      </div>
      <div class="product-link-library-summary" aria-label="Product link library summary">
        <div><span>Active</span><strong>${activeCount}</strong></div>
        <div><span>Model links</span><strong>${modelLinkCount}</strong></div>
        <div><span>Review links</span><strong>${reviewLinkCount}</strong></div>
        <div><span>Inactive</span><strong>${inactiveCount}</strong></div>
      </div>
      <p class="knowledge-source-note-text">Ticket Detail matches active links by ticket model and purchase source.</p>
      <div class="knowledge-controls product-link-library-controls">
        <label>
          <span>Search</span>
          <input id="productLinkSearch" type="search" value="${escapeHtml(filters.productLinkSearch)}" placeholder="Model, platform, label, notes">
        </label>
        <label>
          <span>Platform</span>
          <select id="productLinkPlatformFilter">
            ${["All", ...productLinkPlatforms].map((platform) => `<option value="${escapeHtml(platform)}"${filters.productLinkPlatform === platform ? " selected" : ""}>${escapeHtml(platform)}</option>`).join("")}
          </select>
        </label>
      </div>
      ${currentUserIsAdmin() ? renderProductLinkAddForm() : ""}
      ${links.length ? renderProductLinkTable(links) : `<div class="empty-state polished knowledge-empty-state"><strong>No product links match this view.</strong><p>Clear search or add a new active link.</p></div>`}
    </section>
  `;
}

function renderProductLinkAddForm() {
  return `
    <form class="knowledge-add-form product-link-add-form" id="addProductLinkForm">
      <input name="model" placeholder="Model, e.g. RO500AK">
      <select name="platform" aria-label="Platform">
        ${productLinkPlatforms.map((platform) => `<option value="${escapeHtml(platform)}">${escapeHtml(platform)}</option>`).join("")}
      </select>
      <input name="label" placeholder="Label">
      <input name="url" required placeholder="https://...">
      <button class="primary-button" type="submit">Add link</button>
    </form>
  `;
}

function renderProductLinkTable(links) {
  return `
    <div class="knowledge-table-wrap product-link-table-wrap">
      <table class="knowledge-table product-link-table">
        <thead>
          <tr>
            <th>Model</th>
            <th>Platform</th>
            <th>Label</th>
            <th>URL</th>
            <th>Active</th>
            <th>Last updated</th>
            <th>Added by</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${links.map(renderProductLinkRow).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderProductLinkRow(link) {
  return `
    <tr>
      <td><strong>${escapeHtml(link.model || "All models")}</strong>${link.notes ? `<small>${escapeHtml(link.notes)}</small>` : ""}</td>
      <td>${escapeHtml(link.platform)}</td>
      <td>${escapeHtml(link.label)}</td>
      <td><a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.url)}</a></td>
      <td>${link.active ? "Yes" : "No"}</td>
      <td>${escapeHtml(link.lastUpdated)}</td>
      <td>${escapeHtml(link.addedBy)}</td>
      <td>
        <div class="knowledge-actions">
          ${currentUserIsAdmin() ? `<button class="ghost-button" data-edit-product-link="${escapeHtml(link.id)}" type="button">Edit</button><button class="ghost-button danger" data-deactivate-product-link="${escapeHtml(link.id)}" type="button">${link.active ? "Deactivate" : "Remove"}</button>` : ""}
        </div>
      </td>
    </tr>
  `;
}

function handleKnowledgeFileSelection(event) {
  handleKnowledgeFiles(event.target.files || []);
  event.target.value = "";
}

function handleKnowledgeFiles(fileList) {
  if (!currentUserIsAdmin()) return;
  const files = Array.from(fileList).filter(isSupportedKnowledgeFile);
  if (!files.length) {
    showToast("No supported RepOS Knowledge Vault files selected.");
    return;
  }
  const today = toDateInput(new Date().toISOString());
  const uploaded = files.map((file) => ({
    id: `kv-file-${slugify(file.name)}-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    title: file.name.replace(/\.[^.]+$/, ""),
    fileName: file.name,
    fileType: fileExtension(file.name) || file.type || "File",
    mimeType: file.type || "",
    size: file.size || 0,
    uploadDate: today,
    uploadedBy: profileDisplayName(),
    category: knowledgeCategories[knowledgeCategories.length - 1],
    description: "",
    owner: profileDisplayName(),
    lastReviewedDate: "",
    approvedForAi: false,
    internalOnly: true,
    customerFacingAllowed: false,
    status: "Draft",
    archived: false
  }));
  knowledgeDocs = [...uploaded, ...knowledgeDocs];
  filters.knowledgeSearch = "";
  filters.knowledgeCategory = "All";
  filters.knowledgeStatus = "All";
  uploadApprovalPrompt = {
    docIds: uploaded.map((doc) => doc.id),
    fileNames: uploaded.map((doc) => doc.fileName)
  };
  persistKnowledgeDocs();
  renderKnowledgeVaultPanel();
  showToast(`${uploaded.length} file${uploaded.length === 1 ? "" : "s"} uploaded to RepOS Knowledge Vault metadata.`);
}

function isSupportedKnowledgeFile(file) {
  return ["pdf", "docx", "txt", "csv", "xlsx", "png", "jpg", "jpeg"].includes(fileExtension(file.name));
}

function fileExtension(fileName) {
  return String(fileName || "").split(".").pop()?.toLowerCase() || "";
}

function getVisibleKnowledgeDocs() {
  const query = filters.knowledgeSearch.trim().toLowerCase();
  return knowledgeDocs
    .filter((doc) => !doc.archived)
    .filter((doc) => filters.knowledgeCategory === "All" || doc.category === filters.knowledgeCategory)
    .filter((doc) => filters.knowledgeStatus === "All" || doc.status === filters.knowledgeStatus)
    .filter((doc) => {
      if (!query) return true;
      return knowledgeSearchText(doc).includes(query);
    });
}

function knowledgeSearchText(doc) {
  return [
    doc.title,
    doc.fileName,
    doc.fileType,
    doc.category,
    doc.description,
    doc.owner,
    doc.uploadedBy,
    doc.status,
    doc.uploadDate,
    doc.lastReviewedDate
  ].join(" ").toLowerCase();
}

function relevantKnowledgeSourcesFor(ticket, limit = 3) {
  const sources = approvedKnowledgeSources();
  if (!ticket || !sources.length) return [];
  const text = ticketKnowledgeSearchText(ticket);
  return sources
    .map((doc) => ({ doc, score: knowledgeSourceScore(doc, text) }))
    .sort((a, b) => b.score - a.score || new Date(b.doc.lastReviewedDate || b.doc.uploadDate) - new Date(a.doc.lastReviewedDate || a.doc.uploadDate))
    .slice(0, limit)
    .map(({ doc, score }) => ({ ...doc, matchScore: score }));
}

function ticketKnowledgeSearchText(ticket) {
  return [
    ticket.model,
    ticket.family,
    ticket.subject,
    ticket.issue,
    ticket.source,
    ticket.purchaseSource,
    ...(ticket.tags || [])
  ].join(" ").toLowerCase();
}

function knowledgeSourceScore(doc, ticketText) {
  const docText = knowledgeSearchText(doc);
  const terms = ticketText
    .split(/[^a-z0-9]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);
  return [...new Set(terms)].reduce((score, term) => score + (docText.includes(term) ? 1 : 0), 0);
}

function knowledgeSourceReason(doc) {
  if (doc.matchScore > 0) return "Matched this ticket";
  if (doc.customerFacingAllowed) return "Approved customer-facing source";
  return "Approved support source";
}

function knowledgeSourcePreview(doc) {
  return doc.description || doc.title || `${doc.category} source file`;
}

function getVisibleProductLinks() {
  const query = filters.productLinkSearch.trim().toLowerCase();
  return productLinks
    .filter((link) => filters.productLinkPlatform === "All" || link.platform === filters.productLinkPlatform)
    .filter((link) => link.active || currentUserIsAdmin())
    .filter((link) => {
      if (!query) return true;
      return productLinkSearchText(link).includes(query);
    })
    .sort((a, b) => `${a.model || "ZZZ"} ${a.platform}`.localeCompare(`${b.model || "ZZZ"} ${b.platform}`));
}

function productLinkSearchText(link) {
  return [
    link.model,
    link.platform,
    link.url,
    link.label,
    link.notes,
    link.active ? "active" : "inactive",
    link.lastUpdated,
    link.addedBy
  ].join(" ").toLowerCase();
}

function handleAddProductLink(event) {
  event.preventDefault();
  if (!currentUserIsAdmin()) return;
  const form = new FormData(event.currentTarget);
  const link = normalizeProductLink({
    id: `product-link-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    model: stringFormValue(form, "model"),
    platform: stringFormValue(form, "platform"),
    url: stringFormValue(form, "url"),
    label: stringFormValue(form, "label"),
    notes: "",
    active: true,
    lastUpdated: toDateInput(new Date().toISOString()),
    addedBy: profileDisplayName()
  });
  if (!link) {
    showToast("Add a valid product link URL.");
    return;
  }
  productLinks = [link, ...productLinks];
  filters.productLinkSearch = "";
  filters.productLinkPlatform = "All";
  persistProductLinks();
  renderKnowledgeVaultPanel();
  renderContext(selectedTicket());
  showToast("Product link saved.");
}

function openProductLinkModal(linkId) {
  const link = productLinks.find((item) => item.id === linkId);
  if (!link) return;
  renderProductLinkModal(link);
  el.knowledgeFileModal.hidden = false;
  el.knowledgeFileModal.removeAttribute("hidden");
  if (typeof el.knowledgeFileModal.showModal === "function" && !el.knowledgeFileModal.open) {
    el.knowledgeFileModal.showModal();
  } else {
    el.knowledgeFileModal.setAttribute("open", "");
  }
}

function renderProductLinkModal(link) {
  el.knowledgeFileModal.innerHTML = `
    <form id="productLinkForm" class="knowledge-file-form">
      <div class="modal-header">
        <div>
          <p class="eyebrow">Product Link Library</p>
          <h2>${escapeHtml(link.label)}</h2>
          <p>Saved links power the Product Link section in Ticket Detail.</p>
        </div>
        <button class="icon-button" id="closeKnowledgeFileButton" aria-label="Close" type="button">x</button>
      </div>
      <input type="hidden" name="id" value="${escapeHtml(link.id)}">
      <div class="form-grid">
        <label><span>Model</span><input name="model" value="${escapeHtml(link.model)}" placeholder="Optional for review links"></label>
        <label><span>Platform / source</span><select name="platform">${productLinkPlatforms.map((platform) => `<option value="${escapeHtml(platform)}"${link.platform === platform ? " selected" : ""}>${escapeHtml(platform)}</option>`).join("")}</select></label>
        <label class="full-span"><span>URL</span><input name="url" value="${escapeHtml(link.url)}" required></label>
        <label><span>Label</span><input name="label" value="${escapeHtml(link.label)}"></label>
        <label><span>Last updated</span><input name="lastUpdated" type="date" value="${escapeHtml(link.lastUpdated || "")}"></label>
        <label><span>Added by</span><input name="addedBy" value="${escapeHtml(link.addedBy)}"></label>
        <label class="profile-toggle"><input name="active" type="checkbox" ${link.active ? "checked" : ""}><span>Active</span></label>
        <label class="full-span"><span>Notes</span><textarea name="notes" rows="4">${escapeHtml(link.notes || "")}</textarea></label>
      </div>
      <div class="modal-actions">
        <button class="secondary-button" id="cancelKnowledgeFileButton" type="button">Close</button>
        <button class="primary-button" type="submit">Save link</button>
      </div>
    </form>
  `;
  el.knowledgeFileModal.querySelector("#closeKnowledgeFileButton").addEventListener("click", closeKnowledgeFileModal);
  el.knowledgeFileModal.querySelector("#cancelKnowledgeFileButton").addEventListener("click", closeKnowledgeFileModal);
  el.knowledgeFileModal.querySelector("#productLinkForm").addEventListener("submit", saveProductLink);
}

function saveProductLink(event) {
  event.preventDefault();
  if (!currentUserIsAdmin()) return;
  const form = new FormData(event.currentTarget);
  const index = productLinks.findIndex((item) => item.id === form.get("id"));
  if (index < 0) return;
  const normalized = normalizeProductLink({
    ...productLinks[index],
    model: stringFormValue(form, "model"),
    platform: stringFormValue(form, "platform"),
    url: stringFormValue(form, "url"),
    label: stringFormValue(form, "label"),
    notes: stringFormValue(form, "notes"),
    active: form.has("active"),
    lastUpdated: stringFormValue(form, "lastUpdated") || toDateInput(new Date().toISOString()),
    addedBy: stringFormValue(form, "addedBy") || profileDisplayName()
  });
  if (!normalized) return;
  productLinks[index] = normalized;
  persistProductLinks();
  closeKnowledgeFileModal();
  renderKnowledgeVaultPanel();
  renderContext(selectedTicket());
  showToast("Product link saved.");
}

function deactivateProductLink(linkId) {
  if (!currentUserIsAdmin()) return;
  const link = productLinks.find((item) => item.id === linkId);
  if (!link) return;
  if (!link.active) {
    productLinks = productLinks.filter((item) => item.id !== linkId);
    persistProductLinks();
    renderKnowledgeVaultPanel();
    renderContext(selectedTicket());
    showToast("Product link removed.");
    return;
  }
  link.active = false;
  link.lastUpdated = toDateInput(new Date().toISOString());
  persistProductLinks();
  renderKnowledgeVaultPanel();
  renderContext(selectedTicket());
  showToast("Product link deactivated.");
}

function updateKnowledgeBoolean(docId, field, value) {
  if (!currentUserIsAdmin()) return;
  const doc = knowledgeDocs.find((item) => item.id === docId);
  if (!doc || !["approvedForAi", "internalOnly", "customerFacingAllowed"].includes(field)) return;
  if (field === "approvedForAi") {
    setKnowledgeSourceApproval(doc, value);
  } else {
    doc[field] = value;
  }
  doc.lastReviewedDate = toDateInput(new Date().toISOString());
  persistKnowledgeDocs();
  renderKnowledgeVaultPanel();
}

function approveKnowledgeFile(docId) {
  if (!currentUserIsAdmin()) return;
  const doc = knowledgeDocs.find((item) => item.id === docId && !item.archived);
  if (!doc) return;
  setKnowledgeSourceApproval(doc, true);
  doc.lastReviewedDate = toDateInput(new Date().toISOString());
  uploadApprovalPrompt.docIds = uploadApprovalPrompt.docIds.filter((id) => id !== docId);
  uploadApprovalPrompt.fileNames = uploadApprovalPrompt.fileNames.filter((name) => name !== doc.fileName);
  persistKnowledgeDocs();
  renderKnowledgeVaultPanel();
  showToast(`${doc.fileName} approved as a workspace source.`);
}

function approveUploadedKnowledgeFiles() {
  if (!currentUserIsAdmin()) return;
  const activeIds = uploadApprovalPrompt.docIds.filter((id) => knowledgeDocs.some((doc) => doc.id === id && !doc.archived));
  activeIds.forEach((id) => {
    const doc = knowledgeDocs.find((item) => item.id === id);
    if (!doc) return;
    setKnowledgeSourceApproval(doc, true);
    doc.lastReviewedDate = toDateInput(new Date().toISOString());
  });
  clearUploadApprovalPrompt(false);
  persistKnowledgeDocs();
  renderKnowledgeVaultPanel();
  showToast(`${activeIds.length} file${activeIds.length === 1 ? "" : "s"} approved as workspace sources.`);
}

function clearUploadApprovalPrompt(shouldRender = true) {
  uploadApprovalPrompt = { docIds: [], fileNames: [] };
  if (shouldRender) renderKnowledgeVaultPanel();
}

function updateKnowledgeField(docId, field, value) {
  if (!currentUserIsAdmin()) return;
  const doc = knowledgeDocs.find((item) => item.id === docId);
  if (!doc || !["status", "owner", "title", "category", "description", "lastReviewedDate"].includes(field)) return;
  doc[field] = value;
  if (field === "status") setKnowledgeSourceApproval(doc, value === "Approved");
  persistKnowledgeDocs();
  renderKnowledgeVaultPanel();
}

function removeKnowledgeFile(docId) {
  if (!currentUserIsAdmin()) return;
  const doc = knowledgeDocs.find((item) => item.id === docId);
  if (!doc) return;
  doc.archived = true;
  setKnowledgeSourceApproval(doc, false);
  persistKnowledgeDocs();
  renderKnowledgeVaultPanel();
  showToast("Knowledge file removed from the active vault.");
}

function setKnowledgeSourceApproval(doc, approved) {
  doc.approvedForAi = Boolean(approved);
  doc.status = approved ? "Approved" : doc.status === "Approved" ? "Needs Review" : doc.status;
}

function openKnowledgeFileModal(docId) {
  if (!currentUserIsAdmin()) return;

  const doc = knowledgeDocs.find((item) => item.id === docId);
  if (!doc) return;
  renderKnowledgeFileModal(doc);
  el.knowledgeFileModal.hidden = false;
  el.knowledgeFileModal.removeAttribute("hidden");
  if (typeof el.knowledgeFileModal.showModal === "function" && !el.knowledgeFileModal.open) {
    el.knowledgeFileModal.showModal();
  } else {
    el.knowledgeFileModal.setAttribute("open", "");
  }
}

function renderKnowledgeFileModal(doc) {
  const disabled = currentUserIsAdmin() ? "" : "disabled";
  el.knowledgeFileModal.innerHTML = `
    <form id="knowledgeFileForm" class="knowledge-file-form">
      <div class="modal-header">
        <div>
          <p class="eyebrow">RepOS Knowledge Vault file</p>
          <h2>${escapeHtml(doc.fileName)}</h2>
          <p>RepOS stores source details here for workspace reference and review.</p>
        </div>
        <button class="icon-button" id="closeKnowledgeFileButton" aria-label="Close" type="button">x</button>
      </div>
      <input type="hidden" name="id" value="${escapeHtml(doc.id)}">
      <div class="knowledge-preview-summary">
        <article>
          <span>Status</span>
          <strong>${escapeHtml(doc.status)}</strong>
        </article>
        <article>
          <span>Source approval</span>
          <strong>${doc.approvedForAi ? "Approved" : "Not approved"}</strong>
        </article>
        <article>
          <span>Audience</span>
          <strong>${doc.customerFacingAllowed ? "Customer-facing OK" : doc.internalOnly ? "Internal only" : "Internal review"}</strong>
        </article>
        <article>
          <span>Last reviewed</span>
          <strong>${escapeHtml(doc.lastReviewedDate || "Not reviewed")}</strong>
        </article>
      </div>
      <div class="form-grid">
        <label><span>Title</span><input name="title" value="${escapeHtml(doc.title)}" ${disabled}></label>
        <label><span>Category</span><select name="category" ${disabled}>${knowledgeCategories.map((category) => `<option value="${escapeHtml(category)}"${doc.category === category ? " selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select></label>
        <label><span>Owner</span><input name="owner" value="${escapeHtml(doc.owner)}" ${disabled}></label>
        <label><span>Status</span><select name="status" ${disabled}>${knowledgeStatuses.map((status) => `<option value="${escapeHtml(status)}"${doc.status === status ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}</select></label>
        <label><span>Uploaded by</span><input value="${escapeHtml(doc.uploadedBy)}" disabled></label>
        <label><span>Upload date</span><input value="${escapeHtml(doc.uploadDate)}" disabled></label>
        <label><span>Last reviewed date</span><input name="lastReviewedDate" type="date" value="${escapeHtml(doc.lastReviewedDate || "")}" ${disabled}></label>
        <label><span>File details</span><input value="${escapeHtml(`${doc.fileType.toUpperCase()} / ${formatFileSize(doc.size)}`)}" disabled></label>
        <label class="full-span"><span>Description</span><textarea name="description" rows="4" ${disabled}>${escapeHtml(doc.description || "")}</textarea></label>
        <label class="profile-toggle"><input name="approvedForAi" type="checkbox" ${doc.approvedForAi ? "checked" : ""} ${disabled}><span>Approved workspace source</span></label>
        <label class="profile-toggle"><input name="internalOnly" type="checkbox" ${doc.internalOnly ? "checked" : ""} ${disabled}><span>Internal only</span></label>
        <label class="profile-toggle"><input name="customerFacingAllowed" type="checkbox" ${doc.customerFacingAllowed ? "checked" : ""} ${disabled}><span>Customer-facing allowed</span></label>
      </div>
      <div class="modal-actions">
        <button class="secondary-button" id="cancelKnowledgeFileButton" type="button">Close</button>
        ${currentUserIsAdmin() ? `<button class="primary-button" value="save" type="submit">Save metadata</button>` : ""}
      </div>
    </form>
  `;
  el.knowledgeFileModal.querySelector("#closeKnowledgeFileButton").addEventListener("click", closeKnowledgeFileModal);
  el.knowledgeFileModal.querySelector("#cancelKnowledgeFileButton").addEventListener("click", closeKnowledgeFileModal);
  el.knowledgeFileModal.querySelector("#knowledgeFileForm").addEventListener("submit", saveKnowledgeFileMetadata);
}

function closeKnowledgeFileModal() {
  const dialog = el.knowledgeFileModal;
  animateDialogClose(dialog, () => {
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    dialog.hidden = true;
    dialog.setAttribute("hidden", "");
    dialog.innerHTML = "";
  });
}

function saveKnowledgeFileMetadata(event) {
  event.preventDefault();
  if (!currentUserIsAdmin()) return;
  const form = new FormData(event.currentTarget);
  const doc = knowledgeDocs.find((item) => item.id === form.get("id"));
  if (!doc) return;
  doc.title = String(form.get("title") || doc.title).trim() || doc.title;
  doc.category = String(form.get("category") || doc.category);
  doc.description = String(form.get("description") || "").trim();
  doc.owner = String(form.get("owner") || doc.owner).trim() || doc.owner;
  doc.status = String(form.get("status") || doc.status);
  doc.lastReviewedDate = String(form.get("lastReviewedDate") || "");
  setKnowledgeSourceApproval(doc, form.has("approvedForAi") || doc.status === "Approved");
  doc.internalOnly = form.has("internalOnly");
  doc.customerFacingAllowed = form.has("customerFacingAllowed");
  persistKnowledgeDocs();
  closeKnowledgeFileModal();
  renderKnowledgeVaultPanel();
  showToast("Knowledge file metadata saved.");
}

function formatFileSize(bytes) {
  const value = Number(bytes) || 0;
  if (value >= 1048576) return `${Math.round((value / 1048576) * 10) / 10} MB`;
  if (value >= 1024) return `${Math.round((value / 1024) * 10) / 10} KB`;
  return `${value} B`;
}

function isAcceptedReceiptFile(file) {
  if (!file) return false;
  const extension = fileExtension(file.name).toLowerCase();
  return ["pdf", "png", "jpg", "jpeg"].includes(extension) ||
    ["application/pdf", "image/png", "image/jpeg"].includes(file.type);
}

function receiptFileType(file) {
  const extension = fileExtension(file?.name || "").toUpperCase();
  if (extension === "JPEG") return "JPG";
  return extension || (file?.type === "application/pdf" ? "PDF" : "Image");
}

function composerAttachmentType(file) {
  const name = String(file?.name || "").toLowerCase();
  const mime = String(file?.type || "").toLowerCase();
  if (/receipt|invoice|order|confirmation|purchase-proof|proof-of-purchase/.test(name)) {
    return mime.includes("image") ? "order screenshot" : "receipt";
  }
  if (mime.includes("pdf") || fileExtension(name) === "pdf") return "pdf";
  if (mime.includes("image") || ["png", "jpg", "jpeg"].includes(fileExtension(name))) return "photo";
  return "upload";
}

function activeAssignmentUsers() {
  return users.filter((user) => !user.removed && user.assignmentEligible);
}

function mergedAssignmentOptionUsers() {
  const merged = [];
  const seen = new Set();
  const addUser = (user) => {
    const name = normalizeRepName(user?.name || "");
    const key = assignmentUserNameKey(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push({ ...user, name });
  };
  users.forEach(addUser);
  backendAssignmentUsers.forEach(addUser);
  return merged;
}

function activeAssignmentOptionUsers() {
  return mergedAssignmentOptionUsers().filter((user) => !user.removed && user.assignmentEligible);
}

function assignmentUserNameKey(value) {
  return normalizeRepName(value).replace(/\s+/g, " ").toLowerCase();
}

function sameAssignmentUserName(left, right) {
  return assignmentUserNameKey(left) === assignmentUserNameKey(right);
}

function firstEligibleReassignTarget(currentAssignee) {
  return activeAssignmentOptionUsers().find((user) => !sameAssignmentUserName(user.name, currentAssignee))?.name || "";
}

function visibleAssignmentUsers() {
  return users.filter((user) => !user.removed);
}

function activeTicketCountFor(repName) {
  return tickets.filter((ticket) => ticket.assignee === repName && activeWorkloadStatuses.includes(displayStatusFor(ticket))).length;
}

function closedTicketCountFor(repName) {
  return tickets.filter((ticket) => ticket.assignee === repName && isClosedDisplayStatus(ticket)).length;
}

function chooseRandomAssignmentUser() {
  const eligible = activeAssignmentOptionUsers();
  if (!eligible.length) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

function assignmentForNewTicket(ticket, options = {}) {
  const createdBy = options.createdBy || profileDisplayName();
  if (options.mode === "manual") {
    return {
      assignee: createdBy,
      note: `Assigned to ${createdBy} because he created the ticket.`,
      workload: activeTicketCountFor(createdBy),
      source: "manual-create"
    };
  }

  const mentionedAssignment = subjectMentionAssignmentFor(ticket);
  if (mentionedAssignment) return mentionedAssignment;

  const repeatAssignment = repeatCustomerAssignmentFor(ticket);
  if (repeatAssignment) return repeatAssignment;

  const chosen = chooseRandomAssignmentUser();
  if (!chosen) {
    return {
      assignee: createdBy,
      note: `Assigned to ${createdBy} because no eligible assignment-pool reps were available.`,
      workload: activeTicketCountFor(createdBy),
      source: "fallback"
    };
  }

  return {
    assignee: chosen.name,
    note: `Randomly assigned to ${chosen.name} from eligible reps.`,
    workload: activeTicketCountFor(chosen.name),
    source: "random"
  };
}

function subjectMentionAssignmentFor(ticket) {
  const subject = String(ticket.subject || "").toLowerCase();
  if (!subject) return null;
  const mentionedRep = activeAssignmentOptionUsers().find((user) => {
    const parts = user.name.split(/\s+/);
    const csNumber = (parts[0] || "").toLowerCase();
    const firstName = (parts[1] || parts[0] || "").toLowerCase();
    const fullName = user.name.toLowerCase();
    return new RegExp(`\\b${escapeRegExp(firstName)}\\b`, "i").test(subject) ||
      new RegExp(`\\b${escapeRegExp(csNumber)}\\b`, "i").test(subject) ||
      subject.includes(fullName);
  });
  if (!mentionedRep) return null;
  return {
    assignee: mentionedRep.name,
    note: `Assigned to ${mentionedRep.name} because the subject mentioned ${mentionedRep.name.split(" ")[0]}.`,
    workload: activeTicketCountFor(mentionedRep.name),
    source: "subject-mention"
  };
}

function ticketCountForCustomerEmail(email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return 1;
  return tickets.filter((t) => String(t.customer?.email || "").trim().toLowerCase() === key).length;
}

function repeatCustomerAssignmentFor(ticket) {
  const email = String(ticket.email || ticket.customer?.email || "").trim().toLowerCase();
  if (!email) return null;
  const previous = tickets
    .filter((item) => item.customer?.email?.toLowerCase() === email && item.assignee)
    .sort((a, b) => new Date(lastUpdatedAt(b)) - new Date(lastUpdatedAt(a)))[0];
  if (!previous) return null;
  const previousRep = activeAssignmentOptionUsers().find((user) => sameAssignmentUserName(user.name, previous.assignee));
  if (!previousRep) return null;
  return {
    assignee: previous.assignee,
    note: `Assigned to ${previous.assignee} based on customer history.`,
    workload: activeTicketCountFor(previous.assignee),
    source: "repeat-customer"
  };
}

function currentUserIsAdmin() {
  const sessionRole = sessionUserRole();
  if (sessionRole) return ["admin", "owner"].includes(sessionRole);
  const configuredRole = String(workspaceSettings?.currentUserRole || "").trim().toLowerCase();
  const assignmentRole = currentAssignmentUser()?.role;
  return ["admin", "owner"].includes(String(configuredRole || assignmentRole || currentDemoUserRole()).toLowerCase());
}

function currentUserCanUseMacros() {
  return currentUserIsAdmin();
}

function showAdminScreen() {
  if (!currentUserIsAdmin()) return;
  uiState.activeScreen = "admin";
  render();
}

function showKnowledgeVaultScreen() {
  if (!currentUserIsAdmin()) return;
  uiState.activeScreen = "knowledge";
  render();
}

function handleAddRep(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = String(form.get("repName") || "").trim();
  const role = String(form.get("repRole") || "rep");
  const activeLegacyDuplicate = users.some((user) => !user.removed && sameAssignmentUserName(user.name, name));
  const backendAssignmentDuplicate = backendAssignmentUsers.some((user) => sameAssignmentUserName(user.name, name));
  if (!name || activeLegacyDuplicate || backendAssignmentDuplicate) return;

  users.push({
    id: slugify(name),
    name,
    role: userRoles.includes(role) ? role : "rep",
    assignmentEligible: true,
    removed: false
  });
  persistUsers();
  render();
}

function toggleAssignmentEligibility(userId) {
  const user = users.find((item) => item.id === userId);
  if (!user) return;
  user.assignmentEligible = !user.assignmentEligible;
  if (user.name === currentDemoUserName()) {
    addNotification({
      category: "assignment",
      title: "Assignment eligibility changed",
      description: `Your assignment pool status is now ${user.assignmentEligible ? "eligible" : "not eligible"}.`,
      force: Boolean(profile.notifyAssignmentEligibility)
    });
  }
  persistUsers();
  render();
}

function removeAssignmentUser(userId) {
  const user = users.find((item) => item.id === userId);
  if (!user || user.name === currentDemoUserName()) return;
  if (activeTicketCountFor(user.name) > 0) {
    window.alert("This rep has active tickets. Reassign before removing or disable future assignments only.");
    return;
  }

  user.removed = true;
  user.assignmentEligible = false;
  persistUsers();
  render();
}

function reassignTicketsFromUser(userId, targetName) {
  const user = users.find((item) => item.id === userId);
  const target = users.find((item) => item.name === targetName && !item.removed && item.assignmentEligible);
  if (!user || !target) return;

  tickets.forEach((ticket) => {
    if (ticket.assignee === user.name && activeWorkloadStatuses.includes(displayStatusFor(ticket))) {
      reassignTicket(ticket.id, target.name, `${currentDemoUserName()} reassigned active tickets from ${user.name} to ${target.name}.`, false);
    }
  });
  persistTickets();
  render();
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `rep-${Date.now()}`;
}

function renderTicketCard(ticket) {
  const selected = ticket.id === selectedTicketId;
  const overdue = isOverdue(ticket);
  return `
    <button class="ticket-card ${selected ? "selected" : ""}" data-ticket-id="${ticket.id}" type="button">
      <div class="ticket-card-top">
        <span class="ticket-id">${escapeHtml(ticketDisplayId(ticket))}</span>
        <span class="sla ${overdue ? "overdue" : ""}">${dueLabel(ticket.dueAt)}</span>
      </div>
      <strong class="ticket-subject">${escapeHtml(ticket.subject)}</strong>
      <div class="ticket-meta">
        <span>${escapeHtml(ticket.customer.name)}</span>
        <span>${escapeHtml(ticket.model)}</span>
        <span>${ageLabel(ticket.createdAt)}</span>
      </div>
      <div class="badge-row">
        <span class="badge status ${statusBadgeModifier(displayStatusFor(ticket))}">${escapeHtml(displayStatusFor(ticket))}</span>
      </div>
      ${ticket.missing.length ? `<div class="chip-row">${ticket.missing.slice(0, 2).map((chip) => `<span class="chip missing">${escapeHtml(chip)}</span>`).join("")}</div>` : ""}
    </button>
  `;
}

function renderConversation(ticket) {
  if (detailFloatScrollHandler) {
    detailFloatScrollRoot?.removeEventListener("scroll", detailFloatScrollHandler);
    detailFloatScrollHandler = null;
    detailFloatScrollRoot = null;
  }
  if (!ticket) {
    el.conversationPanel.innerHTML = `<div class="empty-state polished"><strong>No ticket selected</strong><p>Select a ticket from the queue.</p></div>`;
    return;
  }

  const threadMessages = visibleThreadMessages(ticket);
  const countLabel = emailCountLabel(ticket);
  const debugLabel = threadCountDebugLabel(ticket);
  const customerTicketCount = ticketCountForCustomerEmail(ticket.customer?.email);
  const ticketLocked = isTicketActionLocked(ticket.id);
  const lastActivity = dateTimeLabel(lastUpdatedAt(ticket));

  el.conversationPanel.innerHTML = `
    <div class="ticket-header compact">
      <div class="ticket-header-top">
        <div class="header-row">
          <button class="icon-button back-button ticket-back-button" id="backToQueueButton" type="button" aria-label="Back to queue" title="Back to queue">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.8 7.2 9 12l4.8 4.8"></path><path d="M9.7 12H18"></path></svg>
            <span class="sr-only">Back to queue</span>
          </button>
          <span class="ticket-id">${escapeHtml(ticketDisplayId(ticket))}</span>
          <span class="badge status ${statusBadgeModifier(displayStatusFor(ticket))}">${escapeHtml(displayStatusFor(ticket))}</span>
          <span class="sla ${isOverdue(ticket) ? "overdue" : ""}">${dueLabel(ticket.dueAt)}</span>
          <span class="email-count-badge" title="${escapeHtml(debugLabel)}" data-email-count="${emailMessageCount(ticket)}" data-visible-email-messages="${visibleEmailMessages(ticket).length}" data-total-thread-items="${threadMessages.length}">${escapeHtml(countLabel)}</span>
        </div>
        <button class="ghost-button compact-action-button" id="copyLinkInlineButton" type="button">Copy ticket link</button>
      </div>
      <div class="ticket-header-main">
        <div class="ticket-title-stack">
          <h2>${escapeHtml(ticket.subject)}</h2>
          <div class="ticket-number-headline">${escapeHtml(ticketDisplayId(ticket))}</div>
        </div>
        <div class="ticket-header-controls">
          <label>
            <span>Status</span>
            <select id="ticketStatusSelect" aria-label="Change ticket status" ${ticketLocked ? "disabled" : ""}>
              ${statusSelectOptions(displayStatusFor(ticket), "Change status")}
            </select>
          </label>
          <label>
            <span>Assignee</span>
            <select id="ticketAssigneeSelect" aria-label="Reassign ticket" ${ticketLocked ? "disabled" : ""}>
              ${assignmentSelectOptions(ticket.assignee)}
            </select>
          </label>
        </div>
      </div>
    </div>

    <div class="conversation-scroll-area" id="conversationScrollArea">
      ${renderTicketDetailsPanel(ticket)}
      <div class="thread" id="ticketThread" aria-label="Conversation thread">
        ${threadMessages.map((message) => renderMessage(message, ticket)).join("")}
      </div>

    <div class="reply-dock">
      <div class="composer-head">
        <div class="composer-title-block">
          <div class="reply-tabs" role="tablist" aria-label="Composer mode">
            <span class="reply-tab-pill motion-tab-indicator" aria-hidden="true"></span>
            <button class="${replyMode === "reply" ? "active" : ""}" data-reply-mode="reply" type="button">Reply</button>
            <button class="${replyMode === "note" ? "active" : ""}" data-reply-mode="note" type="button">Internal note</button>
          </div>
        </div>
        <span class="composer-mode-badge" id="composerModeBadge">${replyMode === "reply" ? "Customer visible" : "Team only"}</span>
      </div>
      <div class="composer-meta-line">
        <span class="composer-meta-item"><span class="composer-meta-label">From</span>${escapeHtml(workspaceConfig.supportMailbox)}</span>
        <span class="composer-meta-arrow" aria-hidden="true">&rarr;</span>
        <span class="composer-meta-item composer-meta-to"><span class="composer-meta-label">To</span><strong>${escapeHtml(ticket.customer.name)} &lt;${escapeHtml(ticket.customer.email)}&gt;</strong></span>
      </div>
      <div class="composer-tool-row">
        ${renderComposerMacroTool()}
      </div>
      <div class="composer-editor-card">
        <div class="format-toolbar" aria-label="Formatting toolbar">
          <button data-format-action="bold" type="button" title="Bold" aria-label="Bold"><strong>B</strong></button>
          <button data-format-action="italic" type="button" title="Italic" aria-label="Italic"><em>I</em></button>
          <button data-format-action="underline" type="button" title="Underline" aria-label="Underline"><u>U</u></button>
          <button data-format-action="bullet" type="button" title="Bulleted list" aria-label="Bulleted list">List</button>
          <button data-format-action="number" type="button" title="Numbered list" aria-label="Numbered list">1.</button>
          <button data-format-action="link" type="button" title="Insert link" aria-label="Insert link">Link</button>
          <span class="format-toolbar-divider" aria-hidden="true"></span>
          <button class="format-attach-button" id="attachmentDropzone" type="button" title="Attach files" aria-label="Attach files"><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M13.75,4.25c-.414,0-.75,.336-.75,.75v6.75c0,2.068-1.682,3.75-3.75,3.75s-3.75-1.682-3.75-3.75V4.75c0-1.241,1.009-2.25,2.25-2.25s2.25,1.009,2.25,2.25v7c0,.414-.336,.75-.75,.75s-.75-.336-.75-.75V5c0-.414-.336-.75-.75-.75s-.75,.336-.75,.75v6.75c0,1.241,1.009,2.25,2.25,2.25s2.25-1.009,2.25-2.25V4.75c0-2.068-1.682-3.75-3.75-3.75s-3.75,1.682-3.75,3.75v7c0,2.895,2.355,5.25,5.25,5.25s5.25-2.355,5.25-5.25V5c0-.414-.336-.75-.75-.75Z" fill="currentColor"></path></svg></button>
        </div>
        <div id="replyEditor" class="reply-editor-rich" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="false" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false" data-placeholder="${replyMode === "reply" ? "Write a customer-visible reply..." : "Write an internal note..."}">${ticket.draft || ""}</div>
      </div>
      <input id="composerAttachmentInput" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" multiple hidden>
      <p class="composer-validation" id="composerValidation" role="status" aria-live="polite"></p>
      <div class="composer-bar">
        <div class="composer-bottom-controls">
          <div class="signature-options" role="radiogroup" aria-label="Signature">
            <span>Signature</span>
            <label class="signature-radio"><input type="radio" name="signatureOption" value="My Signature" ${profile.defaultSignature !== "Department Signature" ? "checked" : ""}> My signature</label>
            <label class="signature-radio"><input type="radio" name="signatureOption" value="Department Signature" ${profile.defaultSignature === "Department Signature" ? "checked" : ""}> Department signature</label>
          </div>
        </div>
        <div class="composer-actions">
          <button class="secondary-button" id="saveDraftButton" type="button">Save Draft</button>
          <button class="secondary-button" id="attachmentButton" type="button">Attach</button>
          <button class="primary-button" id="sendReplyButton" type="button">${replyMode === "reply" ? "Send Reply" : "Add Note"}</button>
        </div>
      </div>
    </div>
    ${renderAppFooter("detail-footer")}
    </div>
    <button class="reply-float-btn" id="replyFloatBtn" type="button" aria-label="Jump to reply composer">Reply</button>
  `;

  document.querySelector("#backToQueueButton").addEventListener("click", showQueueScreen);
  document.querySelector("#copyLinkInlineButton").addEventListener("click", copyTicketLink);
  document.querySelector("#ticketStatusSelect").addEventListener("change", (event) => {
    const nextStatus = event.target.value;
    event.target.value = displayStatusFor(ticket);
    openStatusConfirmModal(ticket.id, nextStatus);
  });
  document.querySelector("#ticketAssigneeSelect").addEventListener("change", (event) => {
    const nextAssignee = event.target.value;
    event.target.value = ticket.assignee;
    openReassignConfirmModal(ticket.id, nextAssignee);
  });
  document.querySelector("#customerHistoryButton")?.addEventListener("click", () => openCustomerHistory(ticket.id));
  document.querySelector("#composerMacroSelect")?.addEventListener("change", (event) => {
    event.preventDefault();
    if (event.target.value) insertMacro(event.target.value);
    event.target.value = "";
    syncCustomSelect(event.target);
  });
  document.querySelector("#replyEditor").addEventListener("input", handleComposerInput);
  document.querySelector("#replyEditor").addEventListener("focus", () => syncComposerState());
  document.querySelector("#replyEditor").addEventListener("blur", () => syncComposerState());
  document.querySelector("#saveDraftButton").addEventListener("click", saveDraft);
  document.querySelector("#sendReplyButton").addEventListener("click", submitComposer);
  document.querySelectorAll("[data-format-action]").forEach((button) => {
    button.addEventListener("mousedown", (e) => e.preventDefault());
    button.addEventListener("click", () => applyComposerFormatting(button.dataset.formatAction));
  });
  document.querySelector("#attachmentButton").addEventListener("click", openComposerAttachmentPicker);
  document.querySelector("#attachmentDropzone").addEventListener("click", openComposerAttachmentPicker);
  document.querySelector("#composerAttachmentInput").addEventListener("change", handleComposerAttachmentSelection);
  document.querySelectorAll("[data-preview-attachment]").forEach((button) => {
    button.addEventListener("click", () => openAttachmentPreview(ticket.id, button.dataset.previewAttachment));
  });
  document.querySelectorAll("input[name='signatureOption']").forEach((input) => {
    input.addEventListener("change", (event) => {
      if (!event.target.checked) return;
      syncComposerState();
      showToast(`Signature set to ${event.target.value}.`);
    });
  });
  document.querySelectorAll("[data-reply-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.replyMode === replyMode) return;
      saveDraft(true);
      replyMode = button.dataset.replyMode;
      document.querySelectorAll("[data-reply-mode]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.replyMode === replyMode);
      });
      positionReplyTabPill(true, 0);
      const editor = document.querySelector("#replyEditor");
      if (editor) editor.setAttribute("data-placeholder", replyMode === "reply" ? "Write a customer-visible reply..." : "Write an internal note...");
      const modeBadge = document.querySelector("#composerModeBadge");
      if (modeBadge) modeBadge.textContent = replyMode === "reply" ? "Customer visible" : "Team only";
      const sendBtn = document.querySelector("#sendReplyButton");
      if (sendBtn) sendBtn.textContent = replyMode === "reply" ? "Send Reply" : "Add Note";
      syncComposerState();
    });
  });
  syncComposerState();
  requestAnimationFrame(() => positionReplyTabPill(false, 0));

  const scrollArea = document.querySelector("#conversationScrollArea");
  const floatBtn = document.querySelector("#replyFloatBtn");
  if (scrollArea && floatBtn) {
    const syncFloatBtn = () => {
      const composer = scrollArea.querySelector(".reply-dock");
      const areaRect = scrollArea.getBoundingClientRect();
      const composerRect = composer?.getBoundingClientRect();
      const composerBelowArea = composerRect ? composerRect.top > areaRect.bottom - 120 : false;
      floatBtn.classList.toggle("visible", composerBelowArea);
    };
    detailFloatScrollHandler = syncFloatBtn;
    detailFloatScrollRoot = scrollArea;
    scrollArea.addEventListener("scroll", detailFloatScrollHandler, { passive: true });
    floatBtn.addEventListener("click", () => {
      scrollConversationToBottom("smooth");
    });
    syncFloatBtn();
  }
}

function renderTicketDetailsPanel(ticket) {
  const lastResponse = ticket.lastRepAt
    ? dateTimeLabel(ticket.lastRepAt)
    : "No rep response yet";
  return `
    <details class="ticket-details-panel" open>
      <summary>
        <span>Ticket Details</span>
        <strong>${escapeHtml(ticket.order || "No order")} / ${escapeHtml(ticket.source || "Unknown channel")}</strong>
      </summary>
      <dl class="ticket-details-grid">
        <div><dt>Order number</dt><dd>${escapeHtml(ticket.order || "Not provided")}</dd></div>
        <div><dt>Source / channel</dt><dd>${escapeHtml(ticket.source || "Unknown")}</dd></div>
        <div><dt>Model</dt><dd>${escapeHtml(ticket.model || "Not provided")}</dd></div>
        <div><dt>Purchase source</dt><dd>${escapeHtml(purchaseSourceDisplayFor(ticket))}</dd></div>
        <div><dt>Receipt status</dt><dd>${escapeHtml(receiptStatusFor(ticket))}</dd></div>
        <div><dt>Warranty status</dt><dd>${escapeHtml(warrantyStatusFor(ticket))}</dd></div>
        <div><dt>Created</dt><dd>${escapeHtml(dateTimeLabel(ticket.createdAt))}</dd></div>
        <div><dt>Last response</dt><dd>${escapeHtml(lastResponse)}</dd></div>
        <div><dt>Last updated</dt><dd>${escapeHtml(dateTimeLabel(lastUpdatedAt(ticket)))}</dd></div>
      </dl>
    </details>
  `;
}

function renderComposerMacroTool() {
  if (!currentUserCanUseMacros()) return "";
  return `
        <label class="composer-tool-field">
          <span>Insert macro</span>
          <select id="composerMacroSelect" aria-label="Insert Macro">
            <option value="">Select a canned response</option>
            ${renderMacroSelectOptions()}
          </select>
          <small class="composer-tool-hint">Appends to the current draft with ticket details filled in.</small>
        </label>
  `;
}

function renderMessage(message, ticket) {
  const label = message.type === "note" ? "Internal Note" : message.type === "timeline" ? "Timeline" : message.author;
  const emailSubject = message.emailSubject
    ? `<div class="message-subject"><span>Subject</span><strong>${escapeHtml(message.emailSubject)}</strong></div>`
    : "";
  if (message.type === "timeline") {
    const event = timelineEventMeta(message);
    return `
      <article class="timeline-row timeline-${event.kind}">
        <span class="timeline-content">
          <span class="timeline-icon" aria-hidden="true">${event.icon}</span>
          <span class="timeline-body">${escapeHtml(timelineDisplayBody(ticket, message))}</span>
          <time>${dateTimeLabel(message.timestamp)}</time>
        </span>
      </article>
    `;
  }

  const author = message.author || (message.type === "customer" ? (ticket.customer?.name || "Customer") : "Agent");
  const roleLabel = message.type === "note" ? "Internal note" : message.type === "customer" ? "Customer" : "Agent";
  return `
    <article class="message ${message.type} chat-message-bubble">
      <span class="message-avatar" aria-hidden="true">${escapeHtml(avatarInitialsFor(author))}</span>
      <div class="message-body">
        <div class="message-head">
          <strong>${escapeHtml(author)}</strong>
          <span class="message-role">${escapeHtml(roleLabel)}</span>
          <time>${dateTimeLabel(message.timestamp)}</time>
        </div>
        ${emailSubject}
        <div class="message-text">${renderMessageBodyHtml(message)}</div>
        ${renderThreadAttachments(message.attachments, ticket)}
      </div>
    </article>
  `;
}

function renderMessageBodyHtml(message) {
  const raw = message.type === "note" ? statusDisplayText(message.body) : message.body;
  // Messages composed in the rich editor are already safe HTML — render as-is.
  // Everything else (customer/seed) is plain text, so escape and keep breaks.
  if (message.html) return raw;
  return escapeHtml(raw).replace(/\n/g, "<br>");
}

function avatarInitialsFor(name) {
  const raw = String(name || "").trim();
  if (!raw) return "?";
  const words = raw.split(/\s+/).filter((word) => /[a-z]/i.test(word) && !/\d/.test(word));
  const picked = words.length ? words : raw.split(/\s+/);
  return picked.slice(0, 2).map((word) => word.charAt(0)).join("").toUpperCase() || "?";
}

function renderThreadAttachments(attachments = [], ticket) {
  const files = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
  if (!files.length) return "";
  return `
    <div class="thread-attachments" aria-label="Message attachments">
      ${files.map((file) => renderThreadAttachment(file, ticket)).join("")}
    </div>
  `;
}

function renderThreadAttachment(file, ticket) {
  const fileName = file.file || file.fileName || "attachment";
  const uploaded = file.uploaded || file.uploadDate || "";
  const uploadedBy = file.uploadedBy || (ticket?.customer?.name ? ticket.customer.name : "Customer");
  const type = file.type || file.fileType || fileExtension(fileName).toUpperCase() || "file";
  const typeLabel = attachmentTypeLabel(file);
  if (attachmentIsImage(file)) {
    return `
      <button class="thread-attachment thread-attachment-image" data-preview-attachment="${escapeHtml(fileName)}" type="button">
        <span class="attachment-image-thumb" aria-hidden="true"><span>Photo preview</span></span>
        <span class="thread-attachment-meta">
          <strong>${escapeHtml(fileName)}</strong>
          <span>${escapeHtml(typeLabel)} / ${escapeHtml(uploaded || "Upload date not shown")}</span>
          <small>Uploaded by ${escapeHtml(uploadedBy)}</small>
        </span>
      </button>
    `;
  }
  return `
    <button class="thread-attachment thread-attachment-file" data-preview-attachment="${escapeHtml(fileName)}" type="button">
      <span class="attachment-file-icon" aria-hidden="true">${escapeHtml(typeLabel)}</span>
      <span class="thread-attachment-meta">
        <strong>${escapeHtml(fileName)}</strong>
        <span>${escapeHtml(type)} / ${escapeHtml(uploaded || "Upload date not shown")}</span>
        <small>Uploaded by ${escapeHtml(uploadedBy)}</small>
      </span>
    </button>
  `;
}

function renderContext(ticket) {
  if (!ticket) {
    el.contextPanel.innerHTML = `<div class="empty-state polished"><strong>No context yet</strong><p>Select a ticket to see customer and product details.</p></div>`;
    return;
  }

  el.contextPanel.innerHTML = `
    ${renderCustomerSnapshot(ticket)}
    <details class="context-accordion" open>
      <summary>Order / Warranty</summary>
      ${renderOrderWarranty(ticket)}
    </details>
    ${renderProductLinkSection(ticket)}
  `;

  el.contextPanel.querySelector("#macroSearch")?.addEventListener("input", (event) => {
    filters.macroSearch = event.target.value.toLowerCase();
    renderContext(selectedTicket());
  });
  el.contextPanel.querySelectorAll("[data-macro-category]").forEach((button) => {
    button.addEventListener("click", () => {
      filters.macroCategory = button.dataset.macroCategory;
      renderContext(selectedTicket());
    });
  });
  el.contextPanel.querySelectorAll("[data-insert-macro]").forEach((button) => button.addEventListener("click", () => insertMacro(button.dataset.insertMacro)));
  el.contextPanel.querySelectorAll("[data-copy-macro]").forEach((button) => button.addEventListener("click", () => copyMacro(button.dataset.copyMacro)));
  el.contextPanel.querySelectorAll("[data-mark-attachment]").forEach((button) => {
    button.addEventListener("click", () => markAttachment(ticket.id, button.dataset.file, button.dataset.markAttachment));
  });
  el.contextPanel.querySelectorAll("[data-preview-attachment]").forEach((button) => {
    button.addEventListener("click", () => openAttachmentPreview(ticket.id, button.dataset.previewAttachment));
  });
  el.contextPanel.querySelector("#ticketPurchaseSourceSelect")?.addEventListener("change", (event) => {
    setTicketPurchaseSource(ticket, event.target.value, currentDemoUserName(), true);
    render();
  });
  el.contextPanel.querySelector("#saveReceiptButton")?.addEventListener("click", () => saveTicketReceiptToAccount(ticket));
  el.contextPanel.querySelector("#registerWarrantyToggle")?.addEventListener("change", (event) => {
    const receipt = receiptRecordFor(ticket);
    const account = accountForTicket(ticket);
    const warranty = receipt ? ensureWarrantyRecordForReceipt(account, receipt) : warrantyRecordFor(ticket);
    if (event.target.checked) {
      registerTicketWarranty(ticket);
    } else if (warranty) {
      event.target.checked = true;
      openUnregisterWarrantyConfirmModal(ticket.id, warranty.id);
    }
  });
  el.contextPanel.querySelector("#dailyMacroSelect")?.addEventListener("change", updateDailyMacroPreview);
  el.contextPanel.querySelector("#insertDailyMacroButton")?.addEventListener("click", () => {
    const macroId = el.contextPanel.querySelector("#dailyMacroSelect")?.value || "";
    if (macroId) insertMacro(macroId);
  });
  el.contextPanel.querySelector("#copyDailyMacroButton")?.addEventListener("click", () => {
    const macroId = el.contextPanel.querySelector("#dailyMacroSelect")?.value || "";
    if (macroId) copyMacro(macroId);
  });
  el.contextPanel.querySelector("#copySuggestedProductLinkButton")?.addEventListener("click", () => copyProductLink(ticket));
  el.contextPanel.querySelector("#insertSuggestedProductLinkButton")?.addEventListener("click", () => insertProductLink(ticket));
  el.contextPanel.querySelectorAll("[data-review-link-id]").forEach((button) => {
    button.addEventListener("click", () => copyReviewLink(button.dataset.reviewLinkId));
  });
  el.contextPanel.querySelectorAll("[data-view-ticket-knowledge]").forEach((button) => {
    button.addEventListener("click", () => openKnowledgeFileModal(button.dataset.viewTicketKnowledge));
  });
  el.contextPanel.querySelector("#openSnapshotHistoryButton")?.addEventListener("click", () => openCustomerHistory(ticket.id));
}

function nextBestStepFor(ticket) {
  const text = `${ticket.subject} ${ticket.model} ${ticket.family} ${ticket.tags.join(" ")} ${lastCustomerMessage(ticket)}`.toLowerCase();
  if (/wsp|sediment|screen|spin-down|low flow/.test(text)) {
    return {
      issue: "Screen clogged with sediment.",
      check: "Flush the filter and turn the scraper knob several times.",
      confirms: "Flow improves after flushing or cleaning."
    };
  }
  if (/tankless|ro500|beep|filter reset|rinse/.test(text)) {
    return {
      issue: "Filter reset or rinse cycle not completed.",
      check: "Confirm which filter was replaced, reset that filter light, and complete the rinse cycle.",
      confirms: "Beeping stops and the filter light returns to normal."
    };
  }
  if (/whole house|wgb32|pressure drop|bypass/.test(text)) {
    return {
      issue: "Sediment restriction.",
      check: "Bypass the system and compare pressure.",
      confirms: "If pressure returns on bypass, the filter train is restricted."
    };
  }
  if (/tank not filling|not filling|tank pressure|rcc7|under sink ro/.test(text)) {
    return {
      issue: "Tank pressure, tank valve, or feed pressure issue.",
      check: "Confirm the tank valve is open and check tank air pressure only when the tank is empty.",
      confirms: "Empty tank pressure should be around 7-10 psi and the tank should start gaining weight after refill."
    };
  }
  if (/warranty|receipt|registration/.test(text)) {
    return {
      issue: "Missing purchase proof or registration details.",
      check: "Ask for a receipt or order confirmation showing seller, purchase date, order number, and model.",
      confirms: "The document matches the customer, model, seller, and purchase date."
    };
  }
  if (/uvf|uv|lamp|ballast/.test(text)) {
    return {
      issue: "Lamp seating, lamp failure, or ballast issue.",
      check: "Confirm lamp pins are seated, the ballast label matches the model, and the startup alarm pattern is documented.",
      confirms: "Alarm clears after reseating, or the same alarm returns with confirmed lamp/ballast details."
    };
  }
  if (/wcs|brine|softener|startup/.test(text)) {
    return {
      issue: "Startup fill cycle or brine line seating issue.",
      check: "Confirm the brine line is tight and watch a full manual regeneration fill and draw cycle.",
      confirms: "The brine tank gains water during fill and the level drops during draw."
    };
  }
  return {
    issue: ticket.diagnosis.issue,
    check: ticket.diagnosis.firstTest,
    confirms: ticket.diagnosis.confirms
  };
}

function renderNextBestStep(ticket) {
  const step = nextBestStepFor(ticket);
  return `
    <section class="context-card next-step-card compact-context-card">
      <div class="section-title">
        <p class="eyebrow">Next Best Step</p>
        <h3>Support helper</h3>
      </div>
      <dl class="diagnosis-list">
        <div><dt>Most likely issue</dt><dd>${escapeHtml(step.issue)}</dd></div>
        <div><dt>What to check next</dt><dd>${escapeHtml(step.check)}</dd></div>
        <div><dt>What confirms it</dt><dd>${escapeHtml(step.confirms)}</dd></div>
      </dl>
    </section>
  `;
}

function renderTicketKnowledgeSources(ticket) {
  if (!currentUserIsAdmin()) return "";

  const approvedCount = approvedKnowledgeSources().length;
  const sources = relevantKnowledgeSourcesFor(ticket);
  return `
    <section class="context-card nested-card ticket-knowledge-card">
      <div class="section-title row-title">
        <div>
          <p class="eyebrow">Knowledge Vault</p>
          <h3>Ticket sources</h3>
        </div>
        <span class="mini-count">${approvedCount}</span>
      </div>
      ${sources.length ? `
        <div class="ticket-knowledge-list">
          ${sources.map((doc) => `
            <article class="ticket-knowledge-source">
              <div>
                <span class="knowledge-source-reason">${escapeHtml(knowledgeSourceReason(doc))}</span>
                <strong>${escapeHtml(doc.title || doc.fileName)}</strong>
                <p>${escapeHtml(knowledgeSourcePreview(doc).slice(0, 118))}${knowledgeSourcePreview(doc).length > 118 ? "..." : ""}</p>
                <small>${escapeHtml(doc.category)} / ${escapeHtml(doc.status)}${doc.lastReviewedDate ? ` / Reviewed ${escapeHtml(doc.lastReviewedDate)}` : ""}</small>
              </div>
              <button class="ghost-button compact-action-button" data-view-ticket-knowledge="${escapeHtml(doc.id)}" type="button">Preview</button>
            </article>
          `).join("")}
        </div>
      ` : `
        <p class="compact-context-note">${approvedCount ? "No strong match for this ticket yet. Use the Knowledge Vault screen to search all approved sources." : "No approved Knowledge Vault sources yet."}</p>
      `}
    </section>
  `;
}

function renderMacroPanel(ticket) {
  if (!currentUserCanUseMacros()) return "";

  const query = filters.macroSearch;
  const activeCategory = filters.macroCategory || "All";
  const macros = macroLibrary.filter((macro) => {
    const matchesSearch = `${macro.name} ${macro.category} ${macro.body}`.toLowerCase().includes(query);
    const matchesCategory = activeCategory === "All" || macro.category === activeCategory;
    return matchesSearch && matchesCategory;
  });
  const pinned = macroLibrary.filter((macro) => macro.favorite && `${macro.name} ${macro.category} ${macro.body}`.toLowerCase().includes(query));
  const groupedMacros = macroCategories
    .map((category) => ({ category, macros: macros.filter((macro) => macro.category === category) }))
    .filter((group) => group.macros.length);
  return `
    <section class="context-card nested-card">
      <div class="section-title row-title">
        <div>
          <p class="eyebrow">Macros</p>
          <h3>Support reply library</h3>
        </div>
        <span class="mini-count">${macros.length}</span>
      </div>
      <input class="macro-search" id="macroSearch" type="search" placeholder="Search warranty, RO, parts, returns, reviews" value="${escapeHtml(filters.macroSearch)}">
      <div class="macro-category-row" aria-label="Macro categories">
        ${["All", ...macroCategories].map((category) => `<button class="${activeCategory === category ? "active" : ""}" data-macro-category="${escapeHtml(category)}" type="button">${escapeHtml(category)}</button>`).join("")}
      </div>
      <div class="macro-section">
        <div class="macro-section-title">
          <strong>Pinned Macros</strong>
          <span>${pinned.length}</span>
        </div>
        <div class="macro-list">
          ${pinned.map((macro) => renderMacroCard(macro, ticket, true)).join("")}
        </div>
      </div>
      <div class="macro-section">
        ${groupedMacros.length ? groupedMacros.map((group) => `
          <div class="macro-section-title">
            <strong>${escapeHtml(group.category)}</strong>
            <span>${group.macros.length}</span>
          </div>
          <div class="macro-list">
            ${group.macros.map((macro) => renderMacroCard(macro, ticket, false)).join("")}
          </div>
        `).join("") : `<p class="muted">No macros match this search.</p>`}
      </div>
    </section>
  `;
}

function renderMacroCard(macro, ticket, isPinned) {
  const preview = applyVariables(macro.body, ticket);
  return `
    <article class="macro-card" title="${escapeHtml(preview)}">
      <div>
        <strong>${isPinned ? "Pinned / " : ""}${escapeHtml(macro.name)}</strong>
        <span>${escapeHtml(macro.category)}</span>
        <p>${escapeHtml(preview.slice(0, 118))}${preview.length > 118 ? "..." : ""}</p>
      </div>
      <div class="macro-actions">
        <button class="ghost-button" data-insert-macro="${macro.id}" type="button">Insert</button>
        <button class="ghost-button" data-copy-macro="${macro.id}" type="button">Copy</button>
      </div>
    </article>
  `;
}

function renderMacroSelectOptions(macros = macroLibrary) {
  const orderedMacros = [
    ...macroCategories.flatMap((category) => macros.filter((macro) => macro.category === category)),
    ...macros.filter((macro) => !macroCategories.includes(macro.category))
  ];
  return orderedMacros
    .map((macro) => `<option value="${escapeHtml(macro.id)}">${escapeHtml(macroOptionLabel(macro))}</option>`)
    .join("");
}

function macroOptionLabel(macro) {
  const badges = [macro.dailyUse ? "daily" : "", macro.favorite ? "favorite" : ""].filter(Boolean);
  return `${macro.category}: ${macro.name}${badges.length ? ` (${badges.join(", ")})` : ""}`;
}

function macroSelectionMeta(macro, ticket) {
  if (!macro) {
    return {
      category: "No macro selected",
      detail: "Choose a macro to preview the reply copy."
    };
  }
  const flags = [macro.dailyUse ? "Daily" : "", macro.favorite ? "Favorite" : ""].filter(Boolean).join(" / ");
  const ticketLabel = ticket ? ticketDisplayId(ticket) : "current ticket";
  return {
    category: [macro.category, flags].filter(Boolean).join(" / "),
    detail: `Preview filled for ${ticketLabel}`
  };
}

function renderDailyMacroMeta(macro, ticket) {
  const meta = macroSelectionMeta(macro, ticket);
  return `
    <div class="daily-macro-meta" id="dailyMacroMeta">
      <span>${escapeHtml(meta.category)}</span>
      <small>${escapeHtml(meta.detail)}</small>
    </div>
  `;
}

function renderCustomerSnapshot(ticket) {
  return `
    <section class="context-card compact-context-card customer-snapshot-card">
      <div class="section-title">
        <h3>${escapeHtml(ticket.customer.name)}</h3>
      </div>
      <dl class="info-list">
        <div><dt>Email</dt><dd>${escapeHtml(ticket.customer.email)}</dd></div>
        <div><dt>Phone</dt><dd>${escapeHtml(ticket.customer.phone || "Missing")}</dd></div>
        <div><dt>Model</dt><dd>${escapeHtml(ticket.model || "Not provided")}</dd></div>
        <div><dt>Order</dt><dd>${escapeHtml(ticket.order || "No order")}</dd></div>
        <div><dt>Last activity</dt><dd>${escapeHtml(dateTimeLabel(lastUpdatedAt(ticket)))}</dd></div>
      </dl>
      <button class="ghost-button full-width-action compact-action-button" id="openSnapshotHistoryButton" type="button">View customer history</button>
    </section>
  `;
}

function dailyMacroLibrary() {
  const preferredIds = [
    "receipt-request",
    "warranty-registered",
    "parts-sent",
    "tank-pressure-reset",
    "tankless-rinse",
    "whole-house-pressure-drop",
    "return-policy",
    "review-request",
    "water-test"
  ];
  return preferredIds.map((id) => macroLibrary.find((macro) => macro.id === id)).filter(Boolean);
}

function renderDailyMacroSection(ticket) {
  if (!currentUserCanUseMacros()) return "";

  const macros = dailyMacroLibrary();
  const selectedMacro = macros[0];
  const preview = selectedMacro ? applyVariables(selectedMacro.body, ticket) : "";
  return `
    <section class="context-card compact-context-card daily-macros-card">
      <div class="section-title row-title">
        <div>
          <p class="eyebrow">Macros</p>
          <h3>Daily replies</h3>
        </div>
        <span class="mini-count">${macros.length}</span>
      </div>
      <label class="context-field">
        <span>Macro</span>
        <select id="dailyMacroSelect" aria-label="Daily macro">
          ${macros.map((macro) => `<option value="${escapeHtml(macro.id)}">${escapeHtml(macro.name)}</option>`).join("")}
        </select>
      </label>
      ${renderDailyMacroMeta(selectedMacro, ticket)}
      <div class="macro-preview macro-preview-scroll" id="dailyMacroPreview" tabindex="0">${escapeHtml(preview)}</div>
      <div class="context-actions split-actions daily-macro-actions">
        <button class="primary-button compact-action-button" id="insertDailyMacroButton" type="button">Insert macro</button>
        <button class="ghost-button compact-action-button" id="copyDailyMacroButton" type="button">Copy</button>
      </div>
    </section>
  `;
}

function updateDailyMacroPreview() {
  if (!currentUserCanUseMacros()) return;

  const ticket = selectedTicket();
  const macroId = el.contextPanel.querySelector("#dailyMacroSelect")?.value || "";
  const macro = macroLibrary.find((item) => item.id === macroId);
  const preview = macro && ticket ? applyVariables(macro.body, ticket) : "";
  const previewNode = el.contextPanel.querySelector("#dailyMacroPreview");
  if (previewNode) previewNode.textContent = preview;
  const metaNode = el.contextPanel.querySelector("#dailyMacroMeta");
  if (metaNode) {
    const meta = macroSelectionMeta(macro, ticket);
    metaNode.innerHTML = `<span>${escapeHtml(meta.category)}</span><small>${escapeHtml(meta.detail)}</small>`;
  }
}

function renderOrderWarranty(ticket) {
  const account = accountForTicket(ticket);
  const receipt = receiptRecordFor(ticket);
  const registered = warrantyStatusFor(ticket) === "Registered";
  const warranty = warrantyRecordFor(ticket) || (receipt ? warrantyRecordForReceipt(account, receipt) : null);
  const registeredAt = warranty?.registeredAt ? dateTimeLabel(warranty.registeredAt) : "";
  const sourceReview = detectedPurchaseSourceReview(ticket);
  return `
    <section class="context-card nested-card order-warranty-card">
      <div class="section-title">
        <h3>${escapeHtml(ticket.order || "No order yet")}</h3>
      </div>
      <dl class="info-list">
        <div><dt>Purchase source</dt><dd>
          <select id="ticketPurchaseSourceSelect" aria-label="Purchase source">
            ${workspaceConfig.purchaseSources.map((source) => `<option value="${escapeHtml(source)}"${purchaseSourceFor(ticket) === source ? " selected" : ""}>${escapeHtml(source)}</option>`).join("")}
          </select>
          ${sourceReview ? `<small class="source-review-note">${escapeHtml(sourceReview)}</small>` : ""}
        </dd></div>
        ${receipt ? `
          <div><dt>Receipt file</dt><dd>${escapeHtml(receipt.fileName || "Not saved")}</dd></div>
          <div><dt>Receipt status</dt><dd>${escapeHtml(receipt.status || receiptStatusFor(ticket))}</dd></div>
          <div><dt>Receipt saved</dt><dd>${escapeHtml(receipt.savedAt ? dateTimeLabel(receipt.savedAt) : "Not provided")}</dd></div>
          <div><dt>Uploaded by</dt><dd>${escapeHtml(receipt.uploadedBy || "Not provided")}</dd></div>
        ` : `<div><dt>Receipt</dt><dd>Not saved</dd></div>`}
      </dl>
      ${receipt
        ? `<label class="warranty-toggle compact-warranty-toggle"><input id="registerWarrantyToggle" type="checkbox" ${registered ? "checked" : ""}><span>${registered ? `Warranty registered${registeredAt ? ` &middot; <small>${escapeHtml(registeredAt)}</small>` : ""}` : "Register warranty"}</span></label>`
        : `<p class="muted order-warranty-hint">Add a receipt before warranty registration.</p>`}
      <button class="link-button order-warranty-add" id="saveReceiptButton" type="button">+ Add receipt</button>
    </section>
  `;
}

function renderProductLinkSection(ticket) {
  const productLink = suggestedProductLink(ticket);
  const reviewNeeded = productReviewNeeded(ticket);
  const reviewLinks = reviewProductLinks();
  const purchaseSource = purchaseSourceFor(ticket);
  const platform = productSourceKey(purchaseSource) || purchaseSource;
  const modelKey = normalizedModelKey(ticket.model);
  const matchLabel = productLink
    ? `${productLink.model || ticket.model || "Model"} / ${productLink.platform}`
    : `${ticket.model || "No model"} / ${platform || "No source"}`;
  return `
    <section class="context-card compact-context-card product-link-card">
      <div class="section-title row-title">
        <h3>${productLink ? escapeHtml(productLink.label) : "No saved link found"}</h3>
        <span class="product-link-status ${productLink ? "is-ready" : "is-missing"}">${productLink ? "Ready" : "Missing"}</span>
      </div>
      <div class="product-link-match-summary">
        <span>Library match</span>
        <strong>${escapeHtml(matchLabel)}</strong>
        <small>${productLink ? "Active link available for this ticket" : "Add an active link for this model and source"}</small>
      </div>
      ${productLink ? `<dl class="info-list">
        <div><dt>Saved link</dt><dd class="link-value"><a href="${escapeHtml(productLink.url)}" target="_blank" rel="noreferrer">${escapeHtml(productLink.url)}</a></dd></div>
      </dl>` : ""}
      <div class="context-actions split-actions product-link-actions">
        <button class="primary-button compact-action-button" id="insertSuggestedProductLinkButton" type="button" ${productLink ? "" : "disabled"}>Insert product URL</button>
        <button class="ghost-button compact-action-button" id="copySuggestedProductLinkButton" type="button" ${productLink ? "" : "disabled"}>Copy URL</button>
      </div>
      ${reviewNeeded && reviewLinks.length ? `
        <div class="review-link-row">
          <span>Review links</span>
          <div class="review-link-actions">
            ${reviewLinks.map((link) => `<button class="ghost-button compact-action-button" data-review-link-id="${escapeHtml(link.id)}" type="button">Copy ${escapeHtml(link.label)}</button>`).join("")}
          </div>
        </div>
      ` : ""}
    </section>
  `;
}

function renderFullCustomerProfile(ticket) {
  return `
    <section class="context-card nested-card">
      <dl class="info-list">
        <div><dt>Name</dt><dd>${escapeHtml(ticket.customer.name)}</dd></div>
        <div><dt>Email</dt><dd>${escapeHtml(ticket.customer.email)}</dd></div>
        <div><dt>Phone</dt><dd>${escapeHtml(ticket.customer.phone || "Missing")}</dd></div>
        <div><dt>Address</dt><dd>${escapeHtml(ticket.customer.address || "Not provided")}</dd></div>
        <div><dt>Previous</dt><dd>${ticket.customer.previousTickets.length ? `${ticket.customer.previousTickets.length} ticket reference${ticket.customer.previousTickets.length === 1 ? "" : "s"}` : "No previous tickets"}</dd></div>
      </dl>
    </section>
  `;
}

function renderFullOrderDetails(ticket) {
  return `
    <section class="context-card nested-card">
      <dl class="info-list">
        <div><dt>Model</dt><dd>${escapeHtml(ticket.model || "Not provided")}</dd></div>
        <div><dt>Family</dt><dd>${escapeHtml(ticket.family || "Not provided")}</dd></div>
        <div><dt>Order</dt><dd>${escapeHtml(ticket.order || "Not provided")}</dd></div>
        <div><dt>Source</dt><dd>${escapeHtml(purchaseSourceDisplayFor(ticket))}</dd></div>
        <div><dt>Follow-up</dt><dd>${ticket.tags.includes("follow-up-due") ? "Due today" : "Not due"}</dd></div>
      </dl>
    </section>
  `;
}

function renderHistoryNotes(ticket) {
  const account = accountForTicket(ticket);
  const notes = normalizeAccountNotes(account.accountNotes, account.notes);
  return `
    <section class="context-card nested-card">
      ${ticket.customer.previousTickets.length ? `<div class="alert-line">Customer has previous tickets</div>` : ""}
      <div class="compact-history-list">
        ${ticket.customer.previousTickets.map((item) => `<span>${escapeHtml(ticketReferenceDisplay(item))}</span>`).join("") || `<span>No previous tickets</span>`}
      </div>
      <p class="compact-context-note">${escapeHtml(ticket.customer.notes || "No customer notes")}</p>
      <p class="compact-context-note">${escapeHtml(notes[0]?.body || account.notes || "No account notes")}</p>
    </section>
  `;
}

function renderSourceWarrantyMetadata(ticket) {
  const account = accountForTicket(ticket);
  const receipt = receiptRecordFor(ticket);
  const warranty = warrantyRecordFor(ticket) || (receipt ? warrantyRecordForReceipt(account, receipt) : null);
  return `
    <section class="context-card nested-card">
      <dl class="info-list">
        <div><dt>Receipt file</dt><dd>${escapeHtml(receipt?.fileName || "Not saved")}</dd></div>
        <div><dt>Receipt status</dt><dd>${escapeHtml(receipt?.status || receiptStatusFor(ticket))}</dd></div>
        <div><dt>Receipt saved</dt><dd>${escapeHtml(receipt?.savedAt ? dateTimeLabel(receipt.savedAt) : "Not provided")}</dd></div>
        <div><dt>Uploaded by</dt><dd>${escapeHtml(receipt?.uploadedBy || "Not provided")}</dd></div>
        <div><dt>Warranty registered</dt><dd>${escapeHtml(warranty?.registeredAt ? dateTimeLabel(warranty.registeredAt) : "No")}</dd></div>
      </dl>
    </section>
  `;
}

function renderProductCard(ticket) {
  return `
    <section class="context-card">
      <div class="section-title">
        <p class="eyebrow">Product / Model</p>
        <h3>${escapeHtml(ticket.model)}</h3>
      </div>
      <dl class="info-list">
        <div><dt>Family</dt><dd>${escapeHtml(ticket.family)}</dd></div>
        <div><dt>Common issue</dt><dd>${escapeHtml(ticket.diagnosis.issue)}</dd></div>
      </dl>
    </section>
  `;
}

function renderSimilarTickets(ticket) {
  return `
    <section class="context-card nested-card">
      <div class="similar-list">
        ${ticket.similar.map((item) => `<span>${escapeHtml(ticketReferenceDisplay(item))}</span>`).join("")}
      </div>
    </section>
  `;
}

function renderAttachments(ticket) {
  return `
    <section class="context-card nested-card">
      <div class="section-title row-title">
        <div>
          <p class="eyebrow">Attachments</p>
          <h3>Files and photos</h3>
        </div>
        <span class="mini-count">${ticket.attachments.length}</span>
      </div>
      <div class="attachment-list">
        ${
          ticket.attachments.length
            ? ticket.attachments.map((file) => `
              <article class="attachment-card">
                ${attachmentIsImage(file)
                  ? `<div class="attachment-preview attachment-preview-image"><span>Photo</span></div>`
                  : `<div class="attachment-preview">${escapeHtml(attachmentTypeLabel(file))}</div>`}
                <div>
                  <strong>${escapeHtml(file.file)}</strong>
                  <span class="attachment-type">${escapeHtml(file.type)}</span>
                  <small>${escapeHtml([file.uploaded, file.uploadedBy || "Customer"].filter(Boolean).join(" / "))}</small>
                </div>
                <div class="attachment-actions">
                  <button class="ghost-button" data-preview-attachment="${escapeHtml(file.file)}" type="button">Preview</button>
                  <button class="ghost-button" data-file="${escapeHtml(file.file)}" data-mark-attachment="${file.type === "receipt" ? "damage photo" : "receipt"}" type="button">
                    Mark as ${file.type === "receipt" ? "damage" : "receipt"}
                  </button>
                </div>
              </article>
            `).join("")
            : `<p class="muted">No attachments yet.</p>`
        }
      </div>
    </section>
  `;
}

function attachmentIsImage(file) {
  const type = String(file?.type || file?.fileType || "").toLowerCase();
  const ext = fileExtension(file?.file || file?.fileName || "");
  return /photo|image|screenshot|jpg|jpeg|png/.test(type) || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
}

function attachmentTypeLabel(file) {
  const type = String(file?.type || file?.fileType || "").toLowerCase();
  const ext = fileExtension(file?.file || file?.fileName || "").toUpperCase();
  if (attachmentIsImage(file)) return "IMG";
  if (type.includes("pdf") || ext === "PDF" || type.includes("receipt") || type.includes("water test")) return "PDF";
  if (ext) return ext;
  return "FILE";
}

function renderChecklist(ticket) {
  return `
    <section class="context-card nested-card">
      <div class="section-title">
        <p class="eyebrow">Troubleshooting Checklist</p>
        <h3>Next checks</h3>
      </div>
      <div class="check-list">
        ${ticket.checklist.map((item, index) => `<label><input type="checkbox" ${index === 0 ? "checked" : ""}>${escapeHtml(item)}</label>`).join("")}
      </div>
    </section>
  `;
}

function renderGuardrails(ticket) {
  return `
    <section class="context-card guardrail-card nested-card">
      <div class="section-title">
        <p class="eyebrow">Guardrails</p>
        <h3>Safe support warnings</h3>
      </div>
      <ul>${ticket.guardrails.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
  `;
}

function renderManagerView(ticket) {
  const familyCount = tickets.filter((item) => item.family === ticket.family).length;
  return `
    <section class="context-card nested-card">
      <div class="section-title">
        <p class="eyebrow">Manager View</p>
        <h3>${escapeHtml(ticket.family)} trend</h3>
      </div>
      <dl class="info-list">
        <div><dt>Open family cases</dt><dd>${familyCount}</dd></div>
        <div><dt>SLA risk</dt><dd>${isOverdue(ticket) ? "At risk now" : "Healthy"}</dd></div>
        <div><dt>Queue state</dt><dd>${escapeHtml(displayStatusFor(ticket))}</dd></div>
      </dl>
    </section>
  `;
}

function getVisibleTickets() {
  const filteredTickets = getFilteredQueueTickets();
  const { startIndex, endIndex } = queuePageInfo(filteredTickets.length);
  return filteredTickets.slice(startIndex, endIndex);
}

function getFilteredQueueTickets() {
  sanitizeQueueState();
  const activeMatcher = activeQueueMatcher();

  return tickets
    .filter((ticket) => {
      return ticketMatchesVisibleQueue(ticket, activeMatcher);
    })
    .sort(sortTickets);
}

function queuePageInfo(totalCount = getFilteredQueueTickets().length) {
  const pageCount = Math.max(1, Math.ceil(totalCount / QUEUE_PAGE_SIZE));
  queuePage = Math.min(Math.max(1, Number.parseInt(queuePage, 10) || 1), pageCount);
  const startIndex = (queuePage - 1) * QUEUE_PAGE_SIZE;
  const endIndex = Math.min(startIndex + QUEUE_PAGE_SIZE, totalCount);
  return {
    page: queuePage,
    pageCount,
    pageSize: QUEUE_PAGE_SIZE,
    totalCount,
    startIndex,
    endIndex,
    hasPrevious: queuePage > 1,
    hasNext: queuePage < pageCount
  };
}

function resetQueuePagination() {
  queuePage = 1;
  selectedTicketIds.clear();
}

function setQueuePage(nextPage) {
  const filteredTickets = getFilteredQueueTickets();
  const pageInfo = queuePageInfo(filteredTickets.length);
  const clampedPage = Math.min(Math.max(1, Number.parseInt(nextPage, 10) || 1), pageInfo.pageCount);
  if (clampedPage === queuePage) return;
  queuePage = clampedPage;
  selectedTicketIds.clear();
  const nextPageInfo = queuePageInfo(filteredTickets.length);
  const pageTickets = filteredTickets.slice(nextPageInfo.startIndex, nextPageInfo.endIndex);
  selectedTicketId = pageTickets[0]?.id || filteredTickets[0]?.id || tickets[0]?.id || "";
  render({ suppressQueueRowEnter: true });
  scrollQueueTableToTop();
}

function scrollQueueTableToTop() {
  const scrollRoot = el.ticketList?.querySelector(".queue-table-wrap");
  if (scrollRoot) scrollRoot.scrollTo({ top: 0, left: scrollRoot.scrollLeft, behavior: "auto" });
}

function sanitizeQueueState() {
  if (!allQueueViews.some((view) => view.id === activeView)) activeView = "open";
  if (!statuses.includes(filters.status)) filters.status = "All statuses";
  if (!closedDateRangeOptions.includes(filters.closedDateRange)) filters.closedDateRange = "This Week";
  if (!["newest", "oldest", "sla"].includes(filters.sort)) filters.sort = "newest";
  filters.table = Object.fromEntries(
    Object.entries(filters.table || {}).filter(([key, value]) => tableColumnKeys.has(key) && String(value || "").trim())
  );
  if (!tableColumnKeys.has(filters.tableSort?.key)) filters.tableSort = { key: "updated", direction: "desc" };
  if (!["asc", "desc"].includes(filters.tableSort.direction)) filters.tableSort.direction = "desc";
}

function sortTickets(a, b) {
  if (uiState.queueMode === "table" && filters.tableSort?.key) {
    const result = compareTableValues(a, b, filters.tableSort.key);
    return filters.tableSort.direction === "asc" ? result : -result;
  }
  if (filters.sort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
  if (filters.sort === "sla") return new Date(a.dueAt) - new Date(b.dueAt);
  return new Date(b.createdAt) - new Date(a.createdAt);
}

function matchesTableFilters(ticket) {
  return Object.entries(filters.table).every(([key, value]) => {
    const query = String(value || "").trim().toLowerCase();
    if (!query) return true;
    return tableCellText(ticket, key).includes(query);
  });
}

function tableCellText(ticket, key) {
  const values = {
    id: ticketDisplayId(ticket),
    updated: dateTimeLabel(lastUpdatedAt(ticket)),
    emails: emailMessageCount(ticket),
    subject: `${ticket.subject} ${lastCustomerMessage(ticket)}`,
    customer: `${ticket.customer.name} ${ticket.customer.email}`,
    team: ticket.family,
    status: displayStatusFor(ticket),
    assignee: ticket.assignee,
    channel: ticket.source,
    model: `${ticket.model} ${ticket.order}`,
    sla: dueLabel(ticket.dueAt),
    tags: [...ticket.tags, ...ticket.missing].join(" ")
  };
  return String(values[key] || "").toLowerCase();
}

function compareTableValues(a, b, key) {
  if (key === "updated") return new Date(lastUpdatedAt(a)) - new Date(lastUpdatedAt(b));
  if (key === "emails") return emailMessageCount(a) - emailMessageCount(b);
  if (key === "sla") return new Date(a.dueAt) - new Date(b.dueAt);
  return tableCellText(a, key).localeCompare(tableCellText(b, key), undefined, { numeric: true });
}

function ticketSearchText(ticket) {
  return [
    ticket.id,
    ticketDisplayId(ticket),
    ticket.subject,
    ticket.customer.name,
    ticket.customer.email,
    ticket.customer.phone,
    ticket.model,
    ticket.family,
    ticket.order,
    displayStatusFor(ticket),
    ticket.source,
    ticket.assignee,
    dashboardQueueReasonTerms(ticket),
    ...ticket.tags,
    ...ticket.missing,
    ...ticket.conversation.map((message) => message.body)
  ]
    .join(" ")
    .toLowerCase();
}

function dashboardQueueReasonTerms(ticket) {
  const terms = [];
  const reason = needsActionReason(ticket);
  if (reason) terms.push(reason);
  if (customerRepliedWithoutRep(ticket)) terms.push("customer replies waiting");
  if (isOverdue(ticket)) terms.push("overdue sla breached");
  if (isSlaDueSoon(ticket)) terms.push("sla due soon");
  if (isUnassignedTicket(ticket)) terms.push("unassigned");
  if (isEscalatedTicket(ticket)) terms.push("escalated");
  if (receiptWarrantyReviewNeeded(ticket)) terms.push("receipt warranty review needed warranty needs review missing receipt");
  if (ticket.tags?.includes("follow-up-due")) terms.push("follow-up due");
  return terms.join(" ");
}

function handleViewClick(event) {
  const button = event.target.closest("[data-view]");
  if (!button) return;

  activeView = button.dataset.view;
  resetQueuePagination();
  uiState.activeScreen = "queue";
  uiState.activeQuickControl = activeView;
  clearFilters(false);
  render();
}

function handleQueueTabClick(event) {
  const button = event.target.closest("[data-queue-tab]");
  if (!button) return;

  const tab = button.dataset.queueTab;
  if (tab === "closed") {
    // The Closed tab is itself a dropdown: open it (and switch to the closed
    // view if we weren't already there), or toggle it if we were.
    closedRangeMenuOpen = activeView === "closed" ? !closedRangeMenuOpen : true;
    activeView = "closed";
  } else {
    closedRangeMenuOpen = false;
    activeView = tab;
  }
  resetQueuePagination();
  uiState.activeScreen = "queue";
  uiState.activeQuickControl = activeView;
  render();
}

function updateFilter(key, value) {
  filters[key] = value;
  if (["global", "queue", "status"].includes(key)) resetQueuePagination();
  render();
}

function handleToolbarStatusChange(event) {
  const value = event.target.value;
  resetToolbarSelect(event.target);
  if (!value) return;

  const selectedTickets = getVisibleSelectedTickets();
  if (selectedTickets.length) {
    if (editableStatuses.includes(value)) {
      openBulkStatusConfirmModal(value);
    } else {
      showToast("Clear selected tickets before changing saved views.");
    }
    return;
  }

  if (editableStatuses.includes(value)) {
    activeView = value === "Open" ? "open" : "closed";
    filters.status = value;
    filters.queue = "";
    resetQueuePagination();
    uiState.activeScreen = "queue";
    uiState.activeQuickControl = "filters";
    render();
    return;
  }

  applyToolbarSavedView(value);
}

function applyToolbarSavedView(value) {
  const savedViews = {
    "view:follow-up": { query: "follow-up due", toast: "Showing follow-up tickets." },
    "view:needs-receipt": { query: "receipt warranty review needed", toast: "Showing tickets needing receipt review." },
    "view:customer-replied": { query: "customer replies waiting", toast: "Showing customer-replied tickets." },
    "view:overdue": { query: "overdue sla breached", sort: "sla", toast: "Showing overdue tickets." }
  };
  const view = savedViews[value];
  if (!view) return;
  activeView = "open";
  filters.status = "All statuses";
  filters.queue = view.query;
  filters.sort = view.sort || "newest";
  resetQueuePagination();
  uiState.activeScreen = "queue";
  uiState.activeQuickControl = "filters";
  if (el.queueSearch) el.queueSearch.value = filters.queue;
  if (el.sortSelect) el.sortSelect.value = filters.sort;
  render();
  showToast(view.toast);
}

function handleToolbarAssignChange(event) {
  const value = event.target.value;
  resetToolbarSelect(event.target);
  if (!value) return;

  const selectedTickets = getVisibleSelectedTickets();
  if (!selectedTickets.length) {
    showToast("Select tickets before assigning.");
    return;
  }

  if (value === "claim") {
    bulkReassignTickets(selectedTickets.map((ticket) => ticket.id), currentDemoUserName());
    return;
  }
  if (value === "assign-team") {
    showToast("Team assignment is ready for workspace routing.");
    return;
  }
  if (value.startsWith("rep:")) {
    openBulkReassignConfirmModal(value.slice(4));
  }
}

function resetToolbarSelect(select) {
  if (!select) return;
  window.requestAnimationFrame(() => {
    select.value = "";
    syncCustomSelect(select);
  });
}

function updateTableFilter(key, value) {
  filters.table[key] = value;
  setActiveQuickControl("filters");
  render();
}

function setQueueMode(mode) {
  uiState.queueMode = "table";
  uiState.activeScreen = "queue";
  applyUiState();
  render();
}

function setQuickView(view) {
  activeView = view;
  uiState.activeScreen = "queue";
  setActiveQuickControl(view);
  render();
}

function openTicketDetail(ticketId, context = {}) {
  const ticket = selectTicket(ticketId);
  logTicketNavigation(ticketId, context.clickedTicketNumber, ticket);
  if (!ticket) {
    showToast("That ticket could not be opened.");
    return;
  }
  uiState.activeScreen = "detail";
  shouldScrollToLatestOnOpen = true;
  render({ preserveQueueList: true });
}

function showQueueScreen() {
  const returningFromDetail = uiState.activeScreen === "detail";
  uiState.activeScreen = "queue";
  if (returningFromDetail && el.ticketList?.innerHTML.trim() && cachedVisibleTickets.length) {
    renderQueueReturnFromDetail();
    return;
  }
  render();
}

function renderQueueReturnFromDetail() {
  queueDebugState.renderTableCalled = false;
  el.ticketList.classList.add("suppress-row-enter");
  el.queueTitle.textContent = queueTitleForActiveView();
  renderToolbarSelectOptions();
  renderBulkActions(cachedVisibleTickets);
  renderQueuePreview(selectedTicket());
  syncQueueSelectionControls(cachedVisibleTickets);
  applyUiState();
  animateViewTransition();
  const transitionDuration = cssDurationMs("--motion-slow", 280);
  window.setTimeout(syncQueueTabIndicator, transitionDuration);
}

function showDashboardScreen() {
  uiState.activeScreen = "dashboard";
  render();
}

function openDashboardFilteredQueue(query) {
  activeView = dashboardIsTeamMode() ? "open" : "assigned";
  uiState.activeScreen = "queue";
  uiState.activeQuickControl = activeView;
  filters.global = "";
  filters.queue = String(query || "").trim();
  filters.status = "All statuses";
  filters.sort = "sla";
  filters.table = {};
  resetQueuePagination();
  if (el.queueSearch) el.queueSearch.value = filters.queue;
  render();
  showToast(filters.queue ? `Filtered tickets: ${filters.queue}.` : "Showing matching tickets.");
}

function showMacroLibrary() {
  if (!currentUserIsAdmin()) return;
  const ticket = selectedTicket();
  if (ticket) {
    openTicketDetail(ticket.id);
    showToast("Macros are available in the ticket context panel.");
  } else {
    showToast("Select a ticket to use macros in context.");
  }
}

function setActiveQuickControl(control) {
  uiState.activeQuickControl = control;
  applyUiState();
}

function clearFilters(shouldRender = true) {
  filters.global = "";
  filters.queue = "";
  filters.status = "All statuses";
  filters.closedDateRange = "This Week";
  filters.sort = "newest";
  filters.macroSearch = "";
  filters.macroCategory = "All";
  filters.knowledgeSearch = "";
  filters.knowledgeCategory = "All";
  filters.knowledgeStatus = "All";
  filters.productLinkSearch = "";
  filters.productLinkPlatform = "All";
  filters.table = {};
  filters.tableSort = { key: "updated", direction: "desc" };
  resetQueuePagination();
  uiState.activeQuickControl = activeView;
  el.queueSearch.value = "";
  el.statusFilter.value = "";
  if (el.assignSelect) el.assignSelect.value = "";
  el.sortSelect.value = "newest";
  if (shouldRender) render();
}

function toggleUi(key, force) {
  uiState[key] = typeof force === "boolean" ? force : !uiState[key];
  applyUiState();
}

function setupSidebarTooltips() {
  document.querySelectorAll(".sidebar [data-tooltip]").forEach((button) => {
    button.addEventListener("mouseenter", () => showSidebarTooltip(button));
    button.addEventListener("focus", () => showSidebarTooltip(button));
    button.addEventListener("mouseleave", hideSidebarTooltip);
    button.addEventListener("blur", hideSidebarTooltip);
  });
  document.addEventListener("pointerover", handleSidebarTooltipOver, true);
  document.addEventListener("mouseover", handleSidebarTooltipOver, true);
  document.addEventListener("focusin", handleSidebarTooltipOver, true);
  document.addEventListener("click", handleSidebarTooltipClick, true);
  document.addEventListener("pointerout", handleSidebarTooltipOut, true);
  document.addEventListener("mouseout", handleSidebarTooltipOut, true);
  document.addEventListener("focusout", handleSidebarTooltipOut, true);
  window.addEventListener("resize", positionSidebarTooltip);
  document.addEventListener("scroll", positionSidebarTooltip, true);
}

function sidebarTooltipButtonFromEvent(event) {
  return event.target?.closest?.(".sidebar [data-tooltip]") || null;
}

function handleSidebarTooltipOver(event) {
  const button = sidebarTooltipButtonFromEvent(event);
  if (button) showSidebarTooltip(button);
}

function handleSidebarTooltipOut(event) {
  const button = sidebarTooltipButtonFromEvent(event);
  if (!button) return;
  if (event.relatedTarget && button.contains(event.relatedTarget)) return;
  hideSidebarTooltip();
}

function handleSidebarTooltipClick(event) {
  const button = sidebarTooltipButtonFromEvent(event);
  if (!button || !document.body.classList.contains("sidebar-collapsed")) return;
  showSidebarTooltip(button);
  window.clearTimeout(sidebarTooltipHideTimer);
  sidebarTooltipHideTimer = window.setTimeout(hideSidebarTooltip, 1800);
}

function getSidebarTooltipPortal() {
  if (sidebarTooltipPortal) return sidebarTooltipPortal;
  sidebarTooltipPortal = document.createElement("div");
  sidebarTooltipPortal.className = "sidebar-tooltip-portal";
  sidebarTooltipPortal.setAttribute("role", "tooltip");
  sidebarTooltipPortal.hidden = true;
  document.body.appendChild(sidebarTooltipPortal);
  return sidebarTooltipPortal;
}

function showSidebarTooltip(button) {
  if (!document.body.classList.contains("sidebar-collapsed") || sidebarMotioning) return;
  const label = button?.dataset?.tooltip?.trim();
  if (!button || !label) return;
  window.clearTimeout(sidebarTooltipHideTimer);
  activeSidebarTooltipButton = button;
  const tooltip = getSidebarTooltipPortal();
  tooltip.textContent = label;
  tooltip.hidden = false;
  positionSidebarTooltip();
  requestAnimationFrame(() => tooltip.classList.add("visible"));
}

function positionSidebarTooltip() {
  if (!activeSidebarTooltipButton || !sidebarTooltipPortal || sidebarTooltipPortal.hidden) return;
  if (!document.body.classList.contains("sidebar-collapsed") || sidebarMotioning) {
    hideSidebarTooltip();
    return;
  }
  const rect = activeSidebarTooltipButton.getBoundingClientRect();
  sidebarTooltipPortal.style.left = `${Math.round(rect.right + 12)}px`;
  sidebarTooltipPortal.style.top = `${Math.round(rect.top + rect.height / 2)}px`;
}

function hideSidebarTooltip() {
  window.clearTimeout(sidebarTooltipHideTimer);
  if (!sidebarTooltipPortal) {
    activeSidebarTooltipButton = null;
    return;
  }
  sidebarTooltipPortal.classList.remove("visible");
  sidebarTooltipPortal.hidden = true;
  activeSidebarTooltipButton = null;
}

function toggleSidebar(force) {
  const nextCollapsed = typeof force === "boolean" ? force : !uiState.sidebarCollapsed;
  if (nextCollapsed === uiState.sidebarCollapsed) return;

  const motionDuration = cssDurationMs("--sidebar-motion-duration", 300);
  const collapseLabelLead = cssDurationMs("--motion-instant", 80);
  const labelRevealDelay = Math.round(motionDuration * 0.62);
  const sidebarDelta = cssNumberValue("--sidebar-expanded-width", 220) - cssNumberValue("--sidebar-collapsed-width", 68);
  window.clearTimeout(sidebarMotionTimer);
  window.clearTimeout(sidebarLabelTimer);
  window.clearTimeout(sidebarLayoutTimer);
  hideSidebarTooltip();
  sidebarMotioning = true;
  sidebarMotionDirection = nextCollapsed ? "collapsing" : "expanding";
  sidebarLabelsHidden = true;
  if (!nextCollapsed) {
    prepareWorkspaceSidebarGlide(-sidebarDelta);
    sidebarLayoutCollapsed = false;
    uiState.sidebarCollapsed = false;
  }
  applyUiState();

  const startSidebarLayoutChange = () => {
    if (nextCollapsed) {
      prepareWorkspaceSidebarGlide(sidebarDelta);
      sidebarLayoutCollapsed = true;
      uiState.sidebarCollapsed = true;
      applyUiState();
    }
    syncSidebarActiveIndicator();
    startWorkspaceSidebarGlide();
  };

  if (nextCollapsed) {
    sidebarLayoutTimer = window.setTimeout(startSidebarLayoutChange, collapseLabelLead);
  } else {
    startSidebarLayoutChange();
  }

  if (!nextCollapsed) {
    sidebarLabelTimer = window.setTimeout(() => {
      sidebarLabelsHidden = false;
      applyUiState();
    }, labelRevealDelay);
  }

  sidebarMotionTimer = window.setTimeout(() => {
    sidebarMotioning = false;
    sidebarMotionDirection = "";
    if (!uiState.sidebarCollapsed) sidebarLabelsHidden = false;
    finishWorkspaceSidebarGlide();
    applyUiState();
    syncSidebarActiveIndicator();
  }, motionDuration + (nextCollapsed ? collapseLabelLead : 0) + 40);
}

function prepareWorkspaceSidebarGlide(offset) {
  if (!el.workspace) return;
  el.workspace.style.transition = "none";
  el.workspace.style.transform = `translate3d(${offset}px, 0, 0)`;
}

function startWorkspaceSidebarGlide() {
  if (!el.workspace) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!sidebarMotioning || !el.workspace) return;
      el.workspace.style.transition = "";
      el.workspace.style.transform = "translate3d(0, 0, 0)";
    });
  });
}

function finishWorkspaceSidebarGlide() {
  if (!el.workspace) return;
  el.workspace.style.transition = "";
  el.workspace.style.transform = "";
}

function applyUiState() {
  const profileSettingsOpen = isProfileSettingsOpen();
  document.body.classList.toggle("sidebar-layout-collapsed", sidebarLayoutCollapsed);
  document.body.classList.toggle("sidebar-collapsed", uiState.sidebarCollapsed);
  document.body.classList.toggle("sidebar-motioning", sidebarMotioning);
  document.body.classList.toggle("sidebar-collapsing", sidebarMotionDirection === "collapsing");
  document.body.classList.toggle("sidebar-expanding", sidebarMotionDirection === "expanding");
  document.body.classList.toggle("sidebar-labels-hidden", sidebarLabelsHidden || uiState.sidebarCollapsed);
  document.body.classList.toggle("metrics-collapsed", uiState.metricsCollapsed);
  document.body.classList.toggle("context-collapsed", uiState.contextCollapsed);
  document.body.classList.toggle("filters-collapsed", uiState.filtersCollapsed);
  document.body.classList.toggle("table-view-active", uiState.queueMode === "table");
  document.body.classList.toggle("card-view-active", uiState.queueMode === "card");
  document.body.classList.toggle("queue-screen", uiState.activeScreen === "queue");
  document.body.classList.toggle("detail-screen", uiState.activeScreen === "detail");
  document.body.classList.toggle("admin-screen", uiState.activeScreen === "admin");
  document.body.classList.toggle("knowledge-screen", uiState.activeScreen === "knowledge");
  document.body.classList.toggle("dashboard-screen", uiState.activeScreen === "dashboard");
  document.body.classList.toggle("is-admin", currentUserIsAdmin());

  el.cardViewButton?.classList.toggle("active", false);
  el.tableViewButton?.classList.toggle("active", true);
  el.cardViewButton?.setAttribute("aria-pressed", "false");
  el.tableViewButton?.setAttribute("aria-pressed", "true");
  if (el.toggleMetricsButton) el.toggleMetricsButton.textContent = uiState.metricsCollapsed ? "Show metrics" : "Hide metrics";
  if (el.toggleContextButton) el.toggleContextButton.textContent = uiState.contextCollapsed ? "Show context" : "Hide context";
  el.toggleSidebarButton.setAttribute("aria-expanded", String(!uiState.sidebarCollapsed));
  el.toggleSidebarButton.setAttribute("aria-label", uiState.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar");
  el.toggleSidebarButton.setAttribute("title", uiState.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar");
  el.toggleMetricsButton?.setAttribute("aria-expanded", String(!uiState.metricsCollapsed));
  el.toggleContextButton?.setAttribute("aria-expanded", String(!uiState.contextCollapsed));
  el.adminNavButton?.classList.toggle("active", !profileSettingsOpen && uiState.activeScreen === "admin");
  el.settingsNavButton.classList.toggle("active", profileSettingsOpen);
  el.knowledgeVaultNavButton?.classList.toggle("active", uiState.activeScreen === "knowledge");
  el.dashboardNavButton.classList.toggle("active", !profileSettingsOpen && uiState.activeScreen === "dashboard");
  el.ticketsNavButton?.classList.toggle("active", !profileSettingsOpen && (uiState.activeScreen === "queue" || uiState.activeScreen === "detail"));
  el.macroNavButton?.classList.remove("active");
  if (!sidebarMotioning) syncSidebarActiveIndicator();
  updateQuickControlState();
  if (!uiState.sidebarCollapsed || sidebarMotioning) hideSidebarTooltip();
}

function isProfileSettingsOpen() {
  return Boolean(el.profileModal && !el.profileModal.hidden && (el.profileModal.open || el.profileModal.hasAttribute("open")));
}

function syncSidebarActiveIndicator() {
  const nav = document.querySelector(".sidebar-main-nav");
  const indicator = nav?.querySelector(".sidebar-nav-indicator");
  const activeButton = nav?.querySelector(".nav-item.active");
  if (!nav || !indicator || !activeButton) {
    indicator?.classList.remove("ready");
    return;
  }

  requestAnimationFrame(() => {
    const navRect = nav.getBoundingClientRect();
    const activeRect = activeButton.getBoundingClientRect();
    indicator.style.setProperty("--sidebar-active-x", `${activeRect.left - navRect.left}px`);
    indicator.style.setProperty("--sidebar-active-y", `${activeRect.top - navRect.top}px`);
    indicator.style.setProperty("--sidebar-active-width", `${activeRect.width}px`);
    indicator.style.setProperty("--sidebar-active-height", `${activeRect.height}px`);
    indicator.classList.add("ready");
  });
}

function spinSettingsIconOnce() {
  if (!el.settingsNavButton) return;
  el.settingsNavButton.classList.remove("settings-spin");
  void el.settingsNavButton.offsetWidth;
  el.settingsNavButton.classList.add("settings-spin");
  window.clearTimeout(spinSettingsIconOnce.clearTimer);
  spinSettingsIconOnce.clearTimer = window.setTimeout(() => {
    el.settingsNavButton?.classList.remove("settings-spin");
  }, cssDurationMs("--settings-spin-duration", 420) + 40);
}

function updateQuickControlState() {
  const active = isCreateTicketModalOpen ? "new" : uiState.activeQuickControl || activeView;
  const controls = {
    open: el.quickOpenButton,
    closed: el.quickClosedButton,
    escalated: null,
    overdue: null,
    search: el.quickSearchButton,
    new: el.quickNewTicketButton,
    filters: el.quickUseFiltersButton,
    sort: el.quickSortButton
  };

  Object.entries(controls).forEach(([key, button]) => {
    if (!button) return;
    button.classList.toggle("active", active === key);
    button.setAttribute("aria-pressed", String(active === key));
  });
  el.quickResetFiltersButton?.setAttribute("aria-pressed", "false");
}

function animateViewTransition() {
  if (!el.ticketWorkspace || lastRenderedScreen === uiState.activeScreen) return;
  lastRenderedScreen = uiState.activeScreen;
  el.ticketWorkspace.classList.remove("view-transition");
  void el.ticketWorkspace.offsetWidth;
  el.ticketWorkspace.classList.add("view-transition");
  clearTimeout(animateViewTransition.timeoutId);
  animateViewTransition.timeoutId = setTimeout(() => {
    el.ticketWorkspace?.classList.remove("view-transition");
  }, cssDurationMs("--motion-normal", 200) + 40);
}

function approvedKnowledgeSources() {
  return knowledgeDocs.filter((doc) => !doc.archived && (doc.approvedForAi || doc.status === "Approved"));
}

function resetDemoData() {
  const confirmed = window.confirm("Restore seeded iSpring demo data? This overwrites tickets, assignment pool, profile preferences, Knowledge Vault metadata, product links, customer accounts, and notifications saved in this local demo state. Uploaded files are not deleted.");
  if (!confirmed) return false;
  tickets = normalizeTickets(JSON.parse(JSON.stringify(workspaceConfig.tickets)));
  lastUsedTicketNumber = loadLastUsedTicketNumber(tickets);
  profile = JSON.parse(JSON.stringify(seedProfile));
  customerAccounts = deriveCustomerAccounts(tickets);
  users = JSON.parse(JSON.stringify(seedUsers));
  knowledgeDocs = JSON.parse(JSON.stringify(workspaceConfig.knowledgeVault));
  productLinks = JSON.parse(JSON.stringify(seedProductLinks));
  notifications = seedNotifications(tickets);
  activeView = "open";
  uiState.activeScreen = "queue";
  uiState.activeQuickControl = "open";
  selectedTicketId = "";
  selectedTicketIds.clear();
  closingTicketIds.clear();
  pendingStatusChanges.clear();
  replyMode = "reply";
  closeTicketModal();
  clearFilters(false);
  applyProfilePreferences({ initialize: true });
  persistTickets();
  persistUsers();
  persistKnowledgeDocs();
  persistProductLinks();
  persistCustomerAccounts();
  persistProfile();
  persistNotifications();
  render();
  showToast("Local demo state restored to seed data.");
  return true;
}

function selectedTicket() {
  if (!tickets.length) return null;
  if (!selectedTicketId) return tickets[0];
  return ticketById(selectedTicketId);
}

function handleComposerInput(event) {
  const ticket = selectedTicket();
  if (!ticket) return;
  ticket.draft = composerEditorHtml(event.target);
  persistTickets();
  syncComposerState();
}

function composerEditorHtml(editor) {
  return editor && "value" in editor ? editor.value : (editor?.innerHTML || "");
}

function composerEditorText(editor) {
  if (!editor) return "";
  return "value" in editor ? editor.value : (editor.innerText || editor.textContent || "");
}

function placeCaretAtEnd(element) {
  if (!element || !window.getSelection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function syncComposerState(showValidation = false) {
  const editor = document.querySelector("#replyEditor");
  const sendButton = document.querySelector("#sendReplyButton");
  const validation = document.querySelector("#composerValidation");
  const hasBody = Boolean(composerEditorText(editor).trim());

  if (sendButton) sendButton.disabled = !hasBody;
  if (!validation) return;
  validation.textContent = (showValidation || document.activeElement === editor) && !hasBody
    ? `Write ${replyMode === "reply" ? "a reply" : "an internal note"} before sending.`
    : "";
}

function applyComposerFormatting(action) {
  const editor = document.querySelector("#replyEditor");
  if (!editor) return;
  editor.focus();

  if (action === "bold") {
    document.execCommand("bold");
  } else if (action === "italic") {
    document.execCommand("italic");
  } else if (action === "underline") {
    document.execCommand("underline");
  } else if (action === "bullet") {
    document.execCommand("insertUnorderedList");
  } else if (action === "number") {
    document.execCommand("insertOrderedList");
  } else if (action === "link") {
    const url = window.prompt("Paste the link URL", "https://");
    if (url === null) return;
    document.execCommand("createLink", false, url.trim() || "https://");
  }

  handleComposerInput({ target: editor });
}

function openComposerAttachmentPicker() {
  document.querySelector("#composerAttachmentInput")?.click();
}

function handleComposerAttachmentSelection(event) {
  const files = [...event.target.files];
  if (!files.length) {
    showToast("No attachment selected.");
    return;
  }
  const ticket = selectedTicket();
  if (!ticket) return;
  const fileNames = files.map((file) => file.name).join(", ");
  const uploadedAt = new Date().toISOString();
  const newAttachments = files.map((file) => ({
    type: composerAttachmentType(file),
    file: file.name,
    fileName: file.name,
    mimeType: file.type || "",
    sizeBytes: file.size || 0,
    uploaded: dateTimeLabel(uploadedAt),
    uploadedAt,
    uploadedBy: profileDisplayName(),
    status: "Attached by rep"
  }));
  ticket.attachments = [...(ticket.attachments || []), ...newAttachments];
  ticket.conversation.push({
    type: "timeline",
    author: "System",
    timestamp: uploadedAt,
    body: `${profileDisplayName()} attached ${fileNames}.`
  });
  const proofAttachments = newAttachments.filter(attachmentLooksLikeOrderProof);
  if (proofAttachments.length) {
    const detected = detectPurchaseSourceFromAttachments(proofAttachments);
    if (detected !== "Unknown") {
      const updated = setTicketPurchaseSource(ticket, detected, "System", false, { fromAttachment: true, timestamp: uploadedAt });
      if (!updated) {
        ticket.conversation.push({
          type: "timeline",
          author: "System",
          timestamp: uploadedAt,
          body: `System detected possible purchase source from attachment: ${detected}. Needs rep review.`
        });
      }
    } else {
      recordAiPurchaseSourceDetection(ticket, "Unknown", "System", { timestamp: uploadedAt, fromAttachment: true });
    }
  }
  persistTicketsLocalOnly();
  syncTicketAttachmentsToBackend(ticket.id, newAttachments);
  event.target.value = "";
  shouldScrollThreadToBottom = true;
  render();
  showToast(`${files.length} attachment${files.length === 1 ? "" : "s"} added.`);
}

function scrollConversationToBottom(behavior = "smooth") {
  window.requestAnimationFrame(() => {
    const area = document.querySelector("#conversationScrollArea");
    if (!area) return;
    area.scrollTo({ top: area.scrollHeight, behavior });
  });
}

function scrollToLatestMessage() {
  window.requestAnimationFrame(() => {
    const area = document.querySelector("#conversationScrollArea");
    if (!area) return;
    const messages = area.querySelectorAll(".message.customer, .message.rep");
    const last = messages[messages.length - 1];
    if (!last) {
      area.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const areaRect = area.getBoundingClientRect();
    const messageRect = last.getBoundingClientRect();
    const targetTop = Math.max(0, area.scrollTop + messageRect.top - areaRect.top - 18);
    area.scrollTo({ top: targetTop, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  });
}

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function scrollTicketDetailToLatest() {
  window.requestAnimationFrame(() => {
    const area = document.querySelector("#conversationScrollArea");
    if (!area) return;
    area.scrollTo({ top: 0, behavior: "auto" });
    const startDelay = prefersReducedMotion() ? 0 : Math.max(120, cssDurationMs("--motion-fast", 140));
    window.setTimeout(() => {
      scrollToLatestMessage();
    }, startDelay);
  });
}

function submitComposer() {
  const ticket = selectedTicket();
  const editor = document.querySelector("#replyEditor");
  const rawBody = composerEditorText(editor).trim();
  if (!ticket || !editor || !rawBody) {
    syncComposerState(true);
    return;
  }
  const body = bodyWithSignature(composerEditorHtml(editor).trim());

  const message = {
    type: replyMode === "reply" ? "rep" : "note",
    author: repLabel(),
    timestamp: new Date().toISOString(),
    body,
    html: true
  };

  ticket.conversation.push(message);
  ticket.draft = "";
  if (replyMode === "reply") {
    ticket.lastRepAt = message.timestamp;
  }
  persistTicketsLocalOnly();
  syncTicketMessageToBackend(ticket.id, message, replyMode === "reply"
    ? { draft: "", lastRepAt: message.timestamp }
    : { draft: "" });
  shouldScrollThreadToBottom = true;
  render();
  showToast(replyMode === "reply" ? "Reply sent." : "Internal note added.");
}

function bodyWithSignature(body) {
  if (!profile.insertSignature || replyMode !== "reply") return body;
  const option = document.querySelector("input[name='signatureOption']:checked")?.value || profile.defaultSignature;
  const signature = signatureText(option);
  if (!signature || body.includes(signature)) return body;
  const signatureHtml = escapeHtml(signature).replace(/\n/g, "<br>");
  return `${body}<br><br>${signatureHtml}`;
}

function signatureText(option) {
  if (option === "My Signature") return profile.mySignature.trim();
  if (option === "Department Signature") return profile.departmentSignature.trim();
  return "";
}

function saveDraft(silent = false) {
  const quiet = silent === true;
  const ticket = selectedTicket();
  const editor = document.querySelector("#replyEditor");
  if (!ticket || !editor) return;

  ticket.draft = composerEditorHtml(editor);
  persistTickets();
  syncComposerState();
  if (!quiet) showToast(composerEditorText(editor).trim() ? "Draft saved." : "Draft cleared.");
}

function insertMacro(macroId) {
  if (!currentUserCanUseMacros()) {
    showToast("Macros are available to admins only.");
    return;
  }

  const ticket = selectedTicket();
  const macro = macroLibrary.find((item) => item.id === macroId);
  const editor = document.querySelector("#replyEditor");
  if (!ticket || !macro || !editor) return;

  const scrollArea = document.querySelector("#conversationScrollArea");
  const scrollTop = scrollArea?.scrollTop || 0;
  const text = applyVariables(macro.body, ticket);
  const macroHtml = escapeHtml(text).replace(/\n/g, "<br>");
  const existingHtml = composerEditorHtml(editor).trim();
  editor.innerHTML = existingHtml ? `${existingHtml}<br><br>${macroHtml}` : macroHtml;
  editor.focus({ preventScroll: true });
  placeCaretAtEnd(editor);
  if (scrollArea) scrollArea.scrollTop = scrollTop;
  ticket.conversation.push({
    type: "timeline",
    author: currentDemoUserName(),
    timestamp: new Date().toISOString(),
    body: `Macro inserted: ${macro.name}.`
  });
  ticket.draft = composerEditorHtml(editor);
  persistTickets();
  showToast("Canned response inserted.");
}

function positionReplyTabPill(animate = true, retry = 0) {
  const tabs = document.querySelector(".reply-tabs");
  if (!tabs) return;
  const pill = tabs.querySelector(".reply-tab-pill");
  const active = tabs.querySelector("button.active");
  if (!pill || !active) return;
  const width = active.offsetWidth;
  if (!width) {
    pill.style.opacity = "0";
    if (retry < 3) requestAnimationFrame(() => positionReplyTabPill(animate, retry + 1));
    return;
  }
  if (!animate) pill.style.transition = "none";
  pill.style.left = `${active.offsetLeft}px`;
  pill.style.width = `${width}px`;
  pill.style.opacity = "1";
  if (!animate) {
    void pill.offsetWidth;
    pill.style.transition = "";
  }
}

function copyMacro(macroId) {
  if (!currentUserCanUseMacros()) {
    showToast("Macros are available to admins only.");
    return;
  }

  const ticket = selectedTicket();
  const macro = macroLibrary.find((item) => item.id === macroId);
  if (!macro) return;
  navigator.clipboard?.writeText(applyVariables(macro.body, ticket));
  showToast("Macro copied.");
}

function insertProductLink(ticket) {
  const link = suggestedProductLink(ticket);
  const editor = document.querySelector("#replyEditor");
  if (!ticket || !link || !editor) return;
  const scrollArea = document.querySelector("#conversationScrollArea");
  const scrollTop = scrollArea?.scrollTop || 0;
  const linkHtml = `<a href="${escapeHtml(link.url)}">${escapeHtml(link.url)}</a>`;
  const existingHtml = composerEditorHtml(editor).trim();
  editor.innerHTML = existingHtml ? `${existingHtml}<br><br>${linkHtml}` : linkHtml;
  editor.focus({ preventScroll: true });
  placeCaretAtEnd(editor);
  if (scrollArea) scrollArea.scrollTop = scrollTop;
  ticket.draft = composerEditorHtml(editor);
  ticket.conversation.push({
    type: "timeline",
    author: currentDemoUserName(),
    timestamp: new Date().toISOString(),
    body: `Product link inserted for ${ticket.model}.`
  });
  persistTickets();
}

function copyProductLink(ticket) {
  const link = suggestedProductLink(ticket);
  if (!link) return;
  navigator.clipboard?.writeText(link.url);
  showToast("Product link copied.");
}

function copyReviewLink(linkId) {
  const link = productLinks.find((item) => item.id === linkId && item.active);
  if (!link) return;
  navigator.clipboard?.writeText(link.url);
  showToast(`${link.label} copied.`);
}

function escalateTicket(ticketId) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket) return;
  if (ticket.escalated) {
    showToast("Ticket is already escalated.");
    return;
  }
  ticket.escalated = true;
  ticket.conversation.push({
    type: "timeline",
    author: "System",
    timestamp: new Date().toISOString(),
    body: `${profileDisplayName()} escalated this ticket.`
  });
  persistTickets();
  render();
  showToast(`${ticketDisplayId(ticket)} escalated.`);
}

function addTimeline(body) {
  const ticket = selectedTicket();
  ticket.conversation.push({ type: "timeline", author: "System", timestamp: new Date().toISOString(), body });
  persistTickets();
  renderConversation(ticket);
}

function openStatusConfirmModal(ticketId, nextStatus) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket || isTicketActionLocked(ticket.id) || displayStatusFor(ticket) === nextStatus || !editableStatuses.includes(nextStatus)) return;

  el.workflowConfirmModal.innerHTML = `
    <form id="statusConfirmForm">
      <div class="modal-header">
        <div>
          <p class="eyebrow">Confirm status change</p>
          <h2>${escapeHtml(ticketDisplayId(ticket))}</h2>
          <p>${escapeHtml(ticket.subject)}</p>
        </div>
        <button class="icon-button" id="closeWorkflowConfirmButton" aria-label="Close" type="button">x</button>
      </div>
      <div class="confirmation-body">
        <dl class="info-list confirmation-list">
          <div><dt>Customer</dt><dd>${escapeHtml(ticket.customer.name)}</dd></div>
          <div><dt>Current status</dt><dd>${escapeHtml(displayStatusFor(ticket))}</dd></div>
          <div><dt>New status</dt><dd>${escapeHtml(nextStatus)}</dd></div>
        </dl>
        <label class="confirmation-note">
          <span>Internal note</span>
          <textarea name="internalNote" rows="4" placeholder="Optional note for the ticket timeline"></textarea>
        </label>
      </div>
      <div class="modal-actions">
        <button class="secondary-button" id="cancelWorkflowConfirmButton" type="button">Cancel</button>
        <button class="primary-button" type="submit">Confirm</button>
      </div>
    </form>
  `;

  openWorkflowConfirmModal();
  el.workflowConfirmModal.querySelector("#closeWorkflowConfirmButton").addEventListener("click", closeWorkflowConfirmModal);
  el.workflowConfirmModal.querySelector("#cancelWorkflowConfirmButton").addEventListener("click", closeWorkflowConfirmModal);
  el.workflowConfirmModal.querySelector("#statusConfirmForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const note = stringFormValue(new FormData(event.currentTarget), "internalNote");
    closeWorkflowConfirmModal(() => changeTicketStatus(ticket.id, nextStatus, note), { instant: true });
  });
}

function openReassignConfirmModal(ticketId, nextAssignee = "") {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket || isTicketActionLocked(ticket.id)) return;
  const activeReps = activeAssignmentOptionUsers();
  const selectedAssignee = activeReps.some((user) => sameAssignmentUserName(user.name, nextAssignee)) ? nextAssignee : activeReps[0]?.name || "";
  if (!selectedAssignee || selectedAssignee === ticket.assignee) return;

  el.workflowConfirmModal.innerHTML = `
    <form id="reassignConfirmForm">
      <div class="modal-header">
        <div>
          <p class="eyebrow">Confirm reassignment</p>
          <h2>${escapeHtml(ticketDisplayId(ticket))}</h2>
          <p>${escapeHtml(ticket.subject)}</p>
        </div>
        <button class="icon-button" id="closeWorkflowConfirmButton" aria-label="Close" type="button">x</button>
      </div>
      <div class="confirmation-body">
        <dl class="info-list confirmation-list">
          <div><dt>Customer</dt><dd>${escapeHtml(ticket.customer.name)}</dd></div>
          <div><dt>Current rep</dt><dd>${escapeHtml(ticket.assignee)}</dd></div>
        </dl>
        <label class="confirmation-field">
          <span>New assigned rep</span>
          <select name="nextAssignee" required>
            ${activeReps.map((user) => `<option value="${escapeHtml(user.name)}"${user.name === selectedAssignee ? " selected" : ""}>${escapeHtml(user.name)}</option>`).join("")}
          </select>
        </label>
        <label class="confirmation-note">
          <span>Internal note</span>
          <textarea name="internalNote" rows="4" placeholder="Optional note for the ticket timeline"></textarea>
        </label>
      </div>
      <div class="modal-actions">
        <button class="secondary-button" id="cancelWorkflowConfirmButton" type="button">Cancel</button>
        <button class="primary-button" type="submit">Confirm</button>
      </div>
    </form>
  `;

  openWorkflowConfirmModal();
  el.workflowConfirmModal.querySelector("#closeWorkflowConfirmButton").addEventListener("click", closeWorkflowConfirmModal);
  el.workflowConfirmModal.querySelector("#cancelWorkflowConfirmButton").addEventListener("click", closeWorkflowConfirmModal);
  el.workflowConfirmModal.querySelector("#reassignConfirmForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const assignee = stringFormValue(form, "nextAssignee");
    const note = stringFormValue(form, "internalNote");
    reassignTicket(ticket.id, assignee, "", true, note);
    closeWorkflowConfirmModal();
  });
}

function openBulkStatusConfirmModal(nextStatus) {
  const selectedTickets = getVisibleSelectedTickets();
  if (!selectedTickets.length || !editableStatuses.includes(nextStatus)) return;

  el.workflowConfirmModal.innerHTML = `
    <form id="bulkStatusConfirmForm">
      <div class="modal-header">
        <div>
          <p class="eyebrow">Confirm bulk status change</p>
          <h2>${selectedTickets.length} selected</h2>
          <p>Update selected tickets to ${escapeHtml(nextStatus)}.</p>
        </div>
        <button class="icon-button" id="closeWorkflowConfirmButton" aria-label="Close" type="button">x</button>
      </div>
      <div class="confirmation-body">
        <dl class="info-list confirmation-list">
          <div><dt>Selected tickets</dt><dd>${selectedTickets.length}</dd></div>
          <div><dt>New status</dt><dd>${escapeHtml(nextStatus)}</dd></div>
        </dl>
        ${renderBulkTicketList(selectedTickets)}
        <label class="confirmation-note">
          <span>Internal note</span>
          <textarea name="internalNote" rows="4" placeholder="Optional note added to each selected ticket"></textarea>
        </label>
      </div>
      <div class="modal-actions">
        <button class="secondary-button" id="cancelWorkflowConfirmButton" type="button">Cancel</button>
        <button class="primary-button" type="submit">Confirm</button>
      </div>
    </form>
  `;

  openWorkflowConfirmModal();
  bindWorkflowCloseButtons();
  el.workflowConfirmModal.querySelector("#bulkStatusConfirmForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const note = stringFormValue(new FormData(event.currentTarget), "internalNote");
    const selectedTicketIdsForStatus = selectedTickets.map((ticket) => ticket.id);
    closeWorkflowConfirmModal(() => bulkChangeTicketStatus(selectedTicketIdsForStatus, nextStatus, note), { instant: true });
  });
}

function openBulkReassignConfirmModal(nextAssignee) {
  const selectedTickets = getVisibleSelectedTickets();
  const activeReps = activeAssignmentOptionUsers();
  if (!selectedTickets.length || !activeReps.some((user) => sameAssignmentUserName(user.name, nextAssignee))) return;

  el.workflowConfirmModal.innerHTML = `
    <form id="bulkReassignConfirmForm">
      <div class="modal-header">
        <div>
          <p class="eyebrow">Confirm bulk reassignment</p>
          <h2>${selectedTickets.length} selected</h2>
          <p>Reassign selected tickets to ${escapeHtml(nextAssignee)}.</p>
        </div>
        <button class="icon-button" id="closeWorkflowConfirmButton" aria-label="Close" type="button">x</button>
      </div>
      <div class="confirmation-body">
        <dl class="info-list confirmation-list">
          <div><dt>Selected tickets</dt><dd>${selectedTickets.length}</dd></div>
          <div><dt>Current assignees</dt><dd>${escapeHtml(assigneeSummary(selectedTickets))}</dd></div>
          <div><dt>New assigned rep</dt><dd>${escapeHtml(nextAssignee)}</dd></div>
        </dl>
        ${renderBulkTicketList(selectedTickets)}
        <label class="confirmation-note">
          <span>Internal note</span>
          <textarea name="internalNote" rows="4" placeholder="Optional note added to each selected ticket"></textarea>
        </label>
      </div>
      <div class="modal-actions">
        <button class="secondary-button" id="cancelWorkflowConfirmButton" type="button">Cancel</button>
        <button class="primary-button" type="submit">Confirm</button>
      </div>
    </form>
  `;

  openWorkflowConfirmModal();
  bindWorkflowCloseButtons();
  el.workflowConfirmModal.querySelector("#bulkReassignConfirmForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const note = stringFormValue(new FormData(event.currentTarget), "internalNote");
    bulkReassignTickets(selectedTickets.map((ticket) => ticket.id), nextAssignee, note);
    closeWorkflowConfirmModal();
  });
}

function openMergeTicketsConfirmModal() {
  if (!currentUserIsAdmin()) {
    showToast("Only admins and owners can merge tickets.");
    return;
  }
  const selectedTickets = getVisibleSelectedTickets();
  if (selectedTickets.length < 2) {
    showToast("Select at least two tickets to merge.");
    return;
  }

  el.workflowConfirmModal.innerHTML = `
    <form id="mergeTicketsConfirmForm">
      <div class="modal-header">
        <div>
          <p class="eyebrow">Confirm merge</p>
          <h2>${selectedTickets.length} selected</h2>
          <p>Combine these tickets into one. All messages move into the primary ticket; the others are closed out.</p>
        </div>
        <button class="icon-button" id="closeWorkflowConfirmButton" aria-label="Close" type="button">x</button>
      </div>
      <div class="confirmation-body">
        ${renderBulkTicketList(selectedTickets)}
        <label class="confirmation-field">
          <span>Primary ticket</span>
          <select name="primaryTicket" required>
            ${selectedTickets.map((ticket) => `<option value="${escapeHtml(ticket.id)}">${escapeHtml(ticketDisplayId(ticket))} / ${escapeHtml(ticket.subject)}</option>`).join("")}
          </select>
        </label>
        <label class="confirmation-note">
          <span>Internal note</span>
          <textarea name="internalNote" rows="4" placeholder="Optional note added to each selected ticket"></textarea>
        </label>
      </div>
      <div class="modal-actions">
        <button class="secondary-button" id="cancelWorkflowConfirmButton" type="button">Cancel</button>
        <button class="primary-button" type="submit">Confirm</button>
      </div>
    </form>
  `;

  openWorkflowConfirmModal();
  bindWorkflowCloseButtons();
  refreshCustomSelects(el.workflowConfirmModal);
  el.workflowConfirmModal.querySelector("#mergeTicketsConfirmForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const primaryTicketId = stringFormValue(form, "primaryTicket");
    const note = stringFormValue(form, "internalNote");
    mergeSelectedTickets(selectedTickets.map((ticket) => ticket.id), primaryTicketId, note);
    closeWorkflowConfirmModal();
  });
}

function bindWorkflowCloseButtons() {
  el.workflowConfirmModal.querySelector("#closeWorkflowConfirmButton")?.addEventListener("click", closeWorkflowConfirmModal);
  el.workflowConfirmModal.querySelector("#cancelWorkflowConfirmButton")?.addEventListener("click", closeWorkflowConfirmModal);
}

function renderBulkTicketList(selectedTickets) {
  return `
    <div class="confirmation-ticket-list" aria-label="Selected tickets">
      ${selectedTickets.map((ticket) => `
        <article>
          <strong>${escapeHtml(ticketDisplayId(ticket))}</strong>
          <span>${escapeHtml(ticket.subject)}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function assigneeSummary(selectedTickets) {
  const counts = selectedTickets.reduce((summary, ticket) => {
    summary[ticket.assignee] = (summary[ticket.assignee] || 0) + 1;
    return summary;
  }, {});
  return Object.entries(counts).map(([assignee, count]) => `${assignee} (${count})`).join(", ");
}

function openWorkflowConfirmModal() {
  el.workflowConfirmModal.hidden = false;
  el.workflowConfirmModal.removeAttribute("hidden");
  if (typeof el.workflowConfirmModal.showModal === "function" && !el.workflowConfirmModal.open) {
    el.workflowConfirmModal.showModal();
  } else {
    el.workflowConfirmModal.setAttribute("open", "");
  }
}

function closeWorkflowConfirmModal(afterClose, { instant = false } = {}) {
  const dialog = el.workflowConfirmModal;
  const finishClose = () => {
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    clearReceiptUploadState();
    dialog.classList.remove("receipt-details-modal", "receipt-preview-dialog");
    dialog.removeAttribute("open");
    dialog.setAttribute("hidden", "");
    dialog.hidden = true;
    dialog.innerHTML = "";
    if (typeof afterClose === "function") requestAnimationFrame(afterClose);
  };

  if (instant) {
    dialog.classList.remove("closing");
    finishClose();
    return;
  }

  animateDialogClose(dialog, finishClose);
}

function clearBulkSelection() {
  selectedTicketIds.clear();
  updateQueueSelectionState();
}

function addInternalNoteToTicket(ticket, body) {
  const note = String(body || "").trim();
  if (!note) return;
  ticket.conversation.push({
    type: "note",
    author: currentDemoUserName(),
    timestamp: new Date().toISOString(),
    body: note
  });
  if (mentionsCurrentUser(note)) {
    addNotification({
      category: "mention",
      title: "Mentioned in internal note",
      description: `${ticketDisplayId(ticket)} includes a note mentioning you.`,
      ticketId: ticket.id
    });
  }
}

function changeTicketStatus(ticketId, nextStatus, internalNote = "") {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket || isTicketActionLocked(ticket.id) || displayStatusFor(ticket) === nextStatus || !editableStatuses.includes(nextStatus)) return;

  const previousStatus = displayStatusFor(ticket);
  const closingTickets = isClosingStatusTransition(previousStatus, nextStatus) ? [ticket] : [];
  const removalIds = closingTickets.filter((item) => statusChangeLeavesCurrentQueue(item, nextStatus)).map((item) => item.id);
  finishTicketStatusChanges({
    changes: [{ ticket, nextStatus, internalNote, bulk: false }],
    removalIds,
    removalToastMessage: queueRemovalToastMessage(closingTickets),
    fallbackToastMessage: isClosingStatusTransition(previousStatus, nextStatus) ? queueRemovalToastMessage(closingTickets) : `${ticketDisplayId(ticket)} updated.`
  });
}

function bulkChangeTicketStatus(ticketIds, nextStatus, internalNote = "") {
  if (!editableStatuses.includes(nextStatus)) return;
  const targetTickets = tickets.filter((ticket) => ticketIds.includes(ticket.id) && !isTicketActionLocked(ticket.id));
  if (!targetTickets.length) return;
  const closingTickets = targetTickets.filter((ticket) => isClosingStatusTransition(displayStatusFor(ticket), nextStatus));
  const removalIds = closingTickets.filter((ticket) => statusChangeLeavesCurrentQueue(ticket, nextStatus)).map((ticket) => ticket.id);
  finishTicketStatusChanges({
    changes: targetTickets.map((ticket) => ({ ticket, nextStatus, internalNote, bulk: true })),
    removalIds,
    removalToastMessage: queueRemovalToastMessage(closingTickets),
    fallbackToastMessage: closingTickets.length
      ? queueRemovalToastMessage(closingTickets)
      : `${targetTickets.length} ticket${targetTickets.length === 1 ? "" : "s"} updated.`,
    onCommitted: () => selectedTicketIds.clear()
  });
}

function reassignTicket(ticketId, nextAssignee, timelineBody, shouldRender = true, internalNote = "") {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket || !nextAssignee || ticket.assignee === nextAssignee) return;

  const previousAssignee = ticket.assignee;
  const actorName = currentDemoUserName();
  ticket.assignee = nextAssignee;
  ticket.conversation.push({
    type: "timeline",
    author: "System",
    timestamp: new Date().toISOString(),
    body: timelineBody || `${actorName} reassigned this ticket from ${previousAssignee} to ${nextAssignee}.`
  });
  addInternalNoteToTicket(ticket, internalNote);
  ticket.aiAssignment = {
    assignedTo: nextAssignee,
    assignedAt: new Date().toISOString(),
    reason: `${actorName} manually reassigned this ticket from ${previousAssignee} to ${nextAssignee}.`,
    workloadAtAssignment: activeTicketCountFor(nextAssignee)
  };
  if (nextAssignee === actorName) {
    addNotification({
      category: "reassigned",
      title: "Ticket reassigned to you",
      description: `${ticketDisplayId(ticket)} was reassigned from ${previousAssignee}.`,
      ticketId: ticket.id
    });
  }

  persistTicketsLocalOnly();
  syncTicketAssigneeToBackend(ticket.id, nextAssignee, internalNote);
  if (shouldRender) render();
}

function bulkReassignTickets(ticketIds, nextAssignee, internalNote = "") {
  const activeReps = activeAssignmentOptionUsers();
  if (!activeReps.some((user) => sameAssignmentUserName(user.name, nextAssignee))) return;
  const targetTickets = tickets.filter((ticket) => ticketIds.includes(ticket.id));
  const actorName = currentDemoUserName();
  targetTickets.forEach((ticket) => {
    const previousAssignee = ticket.assignee;
    ticket.assignee = nextAssignee;
    ticket.conversation.push({
      type: "timeline",
      author: "System",
      timestamp: new Date().toISOString(),
      body: previousAssignee === nextAssignee
        ? `${actorName} bulk confirmed assignment to ${nextAssignee}.`
        : `${actorName} bulk reassigned this ticket from ${previousAssignee} to ${nextAssignee}.`
    });
    addInternalNoteToTicket(ticket, internalNote);
    ticket.aiAssignment = {
      assignedTo: nextAssignee,
      assignedAt: new Date().toISOString(),
      reason: `${actorName} bulk reassigned this ticket from ${previousAssignee} to ${nextAssignee}.`,
      workloadAtAssignment: activeTicketCountFor(nextAssignee)
    };
    if (nextAssignee === actorName && previousAssignee !== nextAssignee) {
      addNotification({
        category: "reassigned",
        title: "Ticket reassigned to you",
        description: `${ticketDisplayId(ticket)} was bulk reassigned from ${previousAssignee}.`,
        ticketId: ticket.id
      });
    }
  });

  selectedTicketIds.clear();
  persistTicketsLocalOnly();
  targetTickets.forEach((ticket) => {
    syncTicketAssigneeToBackend(ticket.id, nextAssignee, internalNote);
  });
  render();
  showToast(`${targetTickets.length} ticket${targetTickets.length === 1 ? "" : "s"} reassigned.`);
}

async function mergeSelectedTickets(ticketIds, primaryTicketId, internalNote = "") {
  if (!currentUserIsAdmin()) {
    showToast("Only admins and owners can merge tickets.");
    return;
  }

  const secondaryTicketIds = ticketIds.filter((ticketId) => String(ticketId) !== String(primaryTicketId));
  const backendResult = await sendTicketMergeToBackend(primaryTicketId, secondaryTicketIds, internalNote);
  if (backendResult?.status === "ok") {
    if (applyBackendMergeResponse(primaryTicketId, secondaryTicketIds, backendResult.payload)) return;
    showToast("Merged on backend. Refreshing local queue state.");
    return;
  }
  if (backendResult?.status === "blocked") {
    showToast(backendTicketMergeErrorMessage(backendResult.payload, backendResult.responseStatus));
    return;
  }

  mergeSelectedTicketsLocally(ticketIds, primaryTicketId, internalNote);
}

function mergeSelectedTicketsLocally(ticketIds, primaryTicketId, internalNote = "") {
  if (!currentUserIsAdmin()) {
    showToast("Only admins and owners can merge tickets.");
    return;
  }

  const selectedTickets = tickets.filter((ticket) => ticketIds.includes(ticket.id));
  const primaryTicket = selectedTickets.find((ticket) => ticket.id === primaryTicketId) || selectedTickets[0];
  if (!primaryTicket || selectedTickets.length < 2) return;

  const relatedTickets = selectedTickets.filter((ticket) => ticket.id !== primaryTicket.id);
  const relatedLabels = relatedTickets.map(ticketDisplayId);
  const actorName = currentDemoUserName();
  const mergedAt = new Date().toISOString();
  primaryTicket.conversation = Array.isArray(primaryTicket.conversation) ? primaryTicket.conversation : [];

  relatedTickets.forEach((ticket) => {
    ticket.conversation = Array.isArray(ticket.conversation) ? ticket.conversation : [];
    // Pull every message from the secondary ticket into the primary thread,
    // tagging each with where it came from so the origin is still traceable.
    const carriedMessages = ticket.conversation.map((message) => ({
      ...message,
      mergedFrom: message.mergedFrom || ticketDisplayId(ticket)
    }));
    primaryTicket.conversation.push(...carriedMessages);

    // Carry over attachments, de-duplicated by stable attachment identity.
    if (Array.isArray(ticket.attachments) && ticket.attachments.length) {
      primaryTicket.attachments = primaryTicket.attachments || [];
      const attachmentKey = (file) => String(file?.id || file?.fileName || file?.name || file?.downloadUrl || "");
      const existingKeys = new Set(primaryTicket.attachments.map(attachmentKey).filter(Boolean));
      ticket.attachments.forEach((file) => {
        const key = attachmentKey(file);
        if (file && (!key || !existingKeys.has(key))) {
          primaryTicket.attachments.push(file);
          if (key) existingKeys.add(key);
        }
      });
    }
  });

  // Keep the combined thread in chronological order.
  primaryTicket.conversation.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Record the merge on the primary ticket and flag it for the queue badge.
  primaryTicket.conversation.push({
    type: "timeline",
    author: "System",
    timestamp: mergedAt,
    body: `${actorName} merged ${relatedLabels.join(", ")} into this ticket.`
  });
  addInternalNoteToTicket(primaryTicket, internalNote);
  primaryTicket.merged = true;
  primaryTicket.mergedFrom = [...new Set([...(primaryTicket.mergedFrom || []), ...relatedLabels])];

  // Retire the secondary tickets: leave a breadcrumb, then hide them from queues.
  relatedTickets.forEach((ticket) => {
    ticket.conversation.push({
      type: "timeline",
      author: "System",
      timestamp: mergedAt,
      body: `${actorName} merged this ticket into ${ticketDisplayId(primaryTicket)}.`
    });
    ticket.mergedInto = primaryTicket.id;
  });

  selectedTicketIds.clear();
  selectedTicketId = primaryTicket.id;
  persistTickets();
  render();
  showToast(`Merged ${selectedTickets.length} tickets into ${ticketDisplayId(primaryTicket)}.`);
}

function copyQueueTicketLink() {
  const selectedTickets = getVisibleSelectedTickets();
  const linkTickets = selectedTickets.length ? selectedTickets : [selectedTicket()].filter(Boolean);
  if (!linkTickets.length) {
    showToast("No ticket selected.");
    return;
  }
  const urls = linkTickets.map((ticket) => `${location.origin}${location.pathname}#${ticket.id}`);
  navigator.clipboard?.writeText(urls.join("\n")).catch(() => {});
  showToast(linkTickets.length === 1 ? `Copied link for ${ticketDisplayId(linkTickets[0])}.` : `Copied ${linkTickets.length} ticket links.`);
}

function refreshQueueFromToolbar() {
  render({ suppressQueueRowEnter: true });
  showToast("Queue refreshed.");
}

function markAttachment(ticketId, fileName, type) {
  const ticket = tickets.find((item) => item.id === ticketId);
  const file = ticket?.attachments.find((item) => item.file === fileName);
  if (!file) return;
  file.type = type;
  if (type === "receipt") saveTicketReceiptToAccount(ticket);
  persistTickets();
  renderContext(ticket);
}

function receiptRecordByIdOrFile(ticket, receiptIdOrFileName) {
  const account = accountForTicket(ticket);
  const key = String(receiptIdOrFileName || "");
  return account.receipts.find((record) => record.id === key || record.fileName === key) || null;
}

function receiptAttachmentFor(ticket, receipt) {
  if (!ticket || !Array.isArray(ticket.attachments)) return null;
  const fileName = receipt?.fileName || "";
  return ticket.attachments.find((file) => (file.file || file.fileName) === fileName) ||
    ticket.attachments.find((file) => isReceiptAttachment(file) && recordMatchesTicket(receipt || {}, ticket)) ||
    ticket.attachments.find(isReceiptAttachment) ||
    null;
}

function receiptRecordFromAttachment(ticket, file) {
  const metadata = extractReceiptMetadata(ticket, {
    ...file,
    fileName: file?.file || file?.fileName || "",
    uploadDate: file?.uploadDate || file?.uploaded || new Date().toISOString()
  });
  return {
    id: `attachment-${stableNumber(`${ticket.id}${metadata.fileName}`)}`,
    ticketId: ticket.id,
    ...metadata,
    fileName: metadata.fileName || file?.file || file?.fileName || "Receipt"
  };
}

function receiptPreviewModel(ticket, receiptIdOrFileName) {
  const accountReceipt = receiptRecordByIdOrFile(ticket, receiptIdOrFileName);
  const sourceTicket = sourceTicketForReceipt(accountReceipt) || ticket;
  const attachment = accountReceipt
    ? receiptAttachmentFor(sourceTicket, accountReceipt) || receiptAttachmentFor(ticket, accountReceipt)
    : ticket.attachments?.find((file) => (file.file || file.fileName) === receiptIdOrFileName) || null;
  const receipt = accountReceipt || receiptRecordFromAttachment(ticket, attachment);
  return { receipt, sourceTicket, attachment, account: accountForTicket(sourceTicket || ticket) };
}

function receiptIsPdf(receipt, attachment = null) {
  const ext = fileExtension(receipt?.fileName || attachment?.file || attachment?.fileName || "");
  const type = String(receipt?.fileType || attachment?.fileType || attachment?.type || attachment?.mimeType || "").toLowerCase();
  return ext === "pdf" || type.includes("pdf");
}

function receiptIsImagePreview(receipt, attachment = null) {
  return !receiptIsPdf(receipt, attachment) && attachmentIsImage(attachment || { fileName: receipt?.fileName, fileType: receipt?.fileType });
}

function receiptPreviewDetails(ticket, receipt, attachment = null, account = null) {
  const sourceTicket = ticket || sourceTicketForReceipt(receipt) || selectedTicket();
  return {
    fileName: receipt?.fileName || attachment?.file || attachment?.fileName || "Receipt",
    purchaseSource: receipt?.source || sourceTicket?.purchaseSource || "Unknown",
    orderNumber: receipt?.orderNumber || sourceTicket?.order || "Not provided",
    model: receipt?.model || sourceTicket?.model || "Not provided",
    customerName: receipt?.customerName || account?.name || sourceTicket?.customer?.name || "Not provided",
    customerEmail: receipt?.customerEmail || account?.email || sourceTicket?.customer?.email || "Not provided",
    purchaseDate: receipt?.purchaseDate || "Not provided",
    receiptTotal: receipt?.receiptTotal || "Not provided",
    uploadedDate: receipt?.uploadDate || receipt?.savedAt || attachment?.uploaded || "Not provided",
    uploadedBy: receipt?.uploadedBy || attachment?.uploadedBy || receiptUploaderForTicket(sourceTicket),
    fileType: receipt?.fileType || attachmentTypeLabel(attachment || { fileName: receipt?.fileName }) || "Receipt"
  };
}

function receiptSourceBrand(source) {
  const brands = {
    Amazon: { name: "amazon", label: "Amazon.com order details", subline: "Sold by iSpring Water Systems" },
    "iSpring direct": { name: "iSpring", label: "iSpring Water Systems", subline: "Direct website order" },
    "Home Depot": { name: "The Home Depot", label: "Home Depot order receipt", subline: "Online order confirmation" },
    "Lowe's": { name: "Lowe's", label: "Lowe's receipt", subline: "Store and online order record" },
    Walmart: { name: "Walmart", label: "Walmart receipt", subline: "Marketplace order confirmation" }
  };
  return brands[source] || { name: source || "Receipt", label: "Receipt / Order Confirmation", subline: "Support proof of purchase" };
}

function receiptSourceClass(source) {
  const slug = slugify(source || "unknown");
  return `receipt-source-${slug || "unknown"}`;
}

function receiptItemDescription(details) {
  const model = details.model && details.model !== "Not provided" ? details.model : "iSpring product";
  return `iSpring ${model} water filtration system`;
}

function renderReceiptPreviewVisual(details, isPdf, isImage) {
  const brand = receiptSourceBrand(details.purchaseSource);
  const sourceClass = receiptSourceClass(details.purchaseSource);
  const itemDescription = receiptItemDescription(details);
  if (isPdf) {
    return `
      <div class="receipt-preview-visual receipt-preview-pdf ${sourceClass}">
        <div class="receipt-pdf-toolbar"><span></span><span></span><span></span></div>
        <div class="receipt-pdf-page">
          <div class="receipt-brand-row">
            <span class="receipt-source-mark">${escapeHtml(brand.name)}</span>
            <small>Support test receipt</small>
          </div>
          <strong>${escapeHtml(brand.label)}</strong>
          <p>${escapeHtml(brand.subline)}</p>
          <dl>
            <div><dt>Order number</dt><dd>${escapeHtml(details.orderNumber)}</dd></div>
            <div><dt>Purchase date</dt><dd>${escapeHtml(formatReceiptDate(details.purchaseDate))}</dd></div>
            <div><dt>Customer</dt><dd>${escapeHtml(details.customerName)}</dd></div>
            <div><dt>Email</dt><dd>${escapeHtml(details.customerEmail)}</dd></div>
          </dl>
          <div class="receipt-line-item">
            <span>${escapeHtml(itemDescription)}</span>
            <strong>${escapeHtml(details.receiptTotal)}</strong>
          </div>
          <div class="receipt-total-row"><span>Item total</span><strong>${escapeHtml(details.receiptTotal)}</strong></div>
        </div>
      </div>
    `;
  }
  return `
    <div class="receipt-preview-visual receipt-preview-image ${isImage ? "" : "receipt-preview-card-only"} ${sourceClass}">
      <div class="receipt-phone-frame">
        <span>${escapeHtml(brand.name)}</span>
        <strong>${escapeHtml(details.receiptTotal)}</strong>
        <p>${escapeHtml(brand.label)} / Support test receipt</p>
        <dl>
          <div><dt>Order</dt><dd>${escapeHtml(details.orderNumber)}</dd></div>
          <div><dt>Model</dt><dd>${escapeHtml(details.model)}</dd></div>
          <div><dt>Date</dt><dd>${escapeHtml(formatReceiptDate(details.purchaseDate))}</dd></div>
        </dl>
        <div class="receipt-line-item compact">
          <span>${escapeHtml(itemDescription)}</span>
          <strong>${escapeHtml(details.receiptTotal)}</strong>
        </div>
      </div>
    </div>
  `;
}

function receiptInfoText(details) {
  return [
    `File: ${details.fileName}`,
    `Purchase source: ${details.purchaseSource}`,
    `Order number: ${details.orderNumber}`,
    `Model: ${details.model}`,
    `Customer: ${details.customerName} <${details.customerEmail}>`,
    `Purchase date: ${details.purchaseDate}`,
    `Receipt total: ${details.receiptTotal}`,
    `Uploaded: ${details.uploadedDate}`,
    `Uploaded by: ${details.uploadedBy}`
  ].join("\n");
}

function formatReceiptDate(value) {
  if (!value || value === "Not provided") return "Not provided";
  return value.includes("T") ? dateTimeLabel(value) : value;
}

function openMockReceiptFile(details) {
  const content = receiptInfoText(details);
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${details.fileName || "receipt"}.mock.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Mock receipt file opened.");
}

function copyReceiptInfo(details) {
  navigator.clipboard?.writeText(receiptInfoText(details)).catch(() => {});
  showToast("Receipt info copied.");
}

function openReceiptPreviewModal(ticketId, receiptIdOrFileName) {
  const ticket = tickets.find((item) => item.id === ticketId) || selectedTicket();
  if (!ticket) {
    showToast("Receipt preview is not available.");
    return;
  }
  const { receipt, sourceTicket, attachment, account } = receiptPreviewModel(ticket, receiptIdOrFileName);
  if (!receipt) {
    showToast("Receipt preview is not available.");
    return;
  }
  const details = receiptPreviewDetails(sourceTicket || ticket, receipt, attachment, account);
  const isPdf = receiptIsPdf(receipt, attachment);
  const isImage = receiptIsImagePreview(receipt, attachment);
  el.workflowConfirmModal.classList.add("receipt-preview-dialog");
  el.workflowConfirmModal.innerHTML = `
    <section class="attachment-preview-modal receipt-preview-modal">
      <div class="modal-header">
        <div>
          <p class="eyebrow">${isPdf ? "PDF receipt preview" : "Receipt image preview"}</p>
          <h2>${escapeHtml(details.fileName)}</h2>
          <p>${escapeHtml(details.purchaseSource)} / ${escapeHtml(details.orderNumber)} / ${escapeHtml(details.model)}</p>
        </div>
        <button class="icon-button" id="closeWorkflowConfirmButton" aria-label="Close" type="button">x</button>
      </div>
      <div class="attachment-preview-body receipt-preview-body">
        ${renderReceiptPreviewVisual(details, isPdf, isImage)}
        <dl class="summary-grid receipt-preview-summary">
          <div><dt>File name</dt><dd>${escapeHtml(details.fileName)}</dd></div>
          <div><dt>Purchase source</dt><dd>${escapeHtml(details.purchaseSource)}</dd></div>
          <div><dt>Order number</dt><dd>${escapeHtml(details.orderNumber)}</dd></div>
          <div><dt>Model</dt><dd>${escapeHtml(details.model)}</dd></div>
          <div><dt>Customer</dt><dd>${escapeHtml(details.customerName)}</dd></div>
          <div><dt>Email</dt><dd>${escapeHtml(details.customerEmail)}</dd></div>
          <div><dt>Purchase date</dt><dd>${escapeHtml(formatReceiptDate(details.purchaseDate))}</dd></div>
          <div><dt>Receipt total</dt><dd>${escapeHtml(details.receiptTotal)}</dd></div>
          <div><dt>Uploaded date</dt><dd>${escapeHtml(formatReceiptDate(details.uploadedDate))}</dd></div>
          <div><dt>Uploaded by</dt><dd>${escapeHtml(details.uploadedBy)}</dd></div>
        </dl>
      </div>
      <div class="modal-actions">
        <button class="secondary-button" id="openMockReceiptButton" type="button">Download/open mock file</button>
        <button class="secondary-button" id="copyReceiptInfoButton" type="button">Copy receipt info</button>
        <button class="primary-button" id="cancelWorkflowConfirmButton" type="button">Close</button>
      </div>
    </section>
  `;
  openWorkflowConfirmModal();
  el.workflowConfirmModal.scrollTo({ top: 0, left: 0, behavior: "auto" });
  bindWorkflowCloseButtons();
  el.workflowConfirmModal.querySelector("#openMockReceiptButton")?.addEventListener("click", () => openMockReceiptFile(details));
  el.workflowConfirmModal.querySelector("#copyReceiptInfoButton")?.addEventListener("click", () => copyReceiptInfo(details));
}

function openAttachmentPreview(ticketId, fileName) {
  const ticket = tickets.find((item) => item.id === ticketId);
  const file = ticket?.attachments?.find((item) => item.file === fileName || item.fileName === fileName);
  if (!ticket || !file) {
    showToast("Attachment preview is not available.");
    return;
  }
  if (isReceiptAttachment(file)) {
    openReceiptPreviewModal(ticket.id, file.file || file.fileName || fileName);
    return;
  }
  const isImage = attachmentIsImage(file);
  const uploadedBy = file.uploadedBy || ticket.customer?.name || "Customer";
  const uploaded = file.uploaded || file.uploadDate || "Upload date not shown";
  el.workflowConfirmModal.innerHTML = `
    <section class="attachment-preview-modal">
      <div class="modal-header">
        <div>
          <p class="eyebrow">${isImage ? "Photo preview" : "File preview"}</p>
          <h2>${escapeHtml(file.file || file.fileName)}</h2>
          <p>${escapeHtml(ticketDisplayId(ticket))} / ${escapeHtml(uploadedBy)} / ${escapeHtml(uploaded)}</p>
        </div>
        <button class="icon-button" id="closeWorkflowConfirmButton" aria-label="Close" type="button">x</button>
      </div>
      <div class="attachment-preview-body">
        ${isImage
          ? `<div class="mock-image-preview"><span>${escapeHtml(file.type || "image")}</span><strong>${escapeHtml(file.file || file.fileName)}</strong></div>`
          : `<div class="mock-file-preview"><span>${escapeHtml(attachmentTypeLabel(file))}</span><strong>${escapeHtml(file.file || file.fileName)}</strong><p>Mock preview/download card. Real file storage will open the uploaded file here.</p></div>`}
        <dl class="summary-grid">
          <div><dt>File type</dt><dd>${escapeHtml(file.type || file.fileType || attachmentTypeLabel(file))}</dd></div>
          <div><dt>Uploaded</dt><dd>${escapeHtml(uploaded)}</dd></div>
          <div><dt>Uploaded by</dt><dd>${escapeHtml(uploadedBy)}</dd></div>
          <div><dt>Status</dt><dd>${escapeHtml(file.status || "Customer attachment")}</dd></div>
        </dl>
      </div>
      <div class="modal-actions">
        <button class="secondary-button" id="cancelWorkflowConfirmButton" type="button">Close</button>
      </div>
    </section>
  `;
  openWorkflowConfirmModal();
  bindWorkflowCloseButtons();
}

function copyTicketLink() {
  const ticket = selectedTicket();
  const url = `${location.origin}${location.pathname}#${ticket.id}`;
  navigator.clipboard?.writeText(url).catch(() => {});
  showToast(`Copied link for ${ticketDisplayId(ticket)}.`);
}

function openCustomerHistory(ticketId, _section = "", editMode = false) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket) return;

  const email = ticket.customer.email.toLowerCase();
  const history = tickets
    .filter((item) => item.customer.email.toLowerCase() === email)
    .sort((a, b) => new Date(lastUpdatedAt(b)) - new Date(lastUpdatedAt(a)));
  const openCount = history.filter(isOpen).length;
  const closedCount = history.filter(isClosedDisplayStatus).length;
  const lastContactAt = history.map(lastUpdatedAt).sort((a, b) => new Date(b) - new Date(a))[0] || "";
  const account = accountForTicket(ticket);
  account.name = account.name || ticket.customer.name || "";
  account.phone = account.phone || ticket.customer.phone || "";
  account.mobile = account.mobile || ticket.customer.mobile || "";
  account.address = account.address || ticket.customer.address || "";
  account.accountNotes = normalizeAccountNotes(account.accountNotes, account.notes);
  account.receipts.forEach((receipt) => ensureWarrantyRecordForReceipt(account, receipt));
  reconcileReceiptUploadersForAccount(account, history);
  persistCustomerAccounts();
  const registeredReceiptCount = account.receipts.filter((receipt) => isRegisteredWarrantyRecord(warrantyRecordForReceipt(account, receipt))).length;

  el.customerHistoryModal.innerHTML = `
    <div class="modal-header compact-history-header">
      <div>
        <p class="eyebrow">Customer History</p>
        <h2>${escapeHtml(account.name || ticket.customer.name)}</h2>
        <p class="history-header-contact">${escapeHtml(account.email || ticket.customer.email)}${account.phone ? ` <span class="history-contact-sep" aria-hidden="true">·</span> ${escapeHtml(account.phone)}` : ""}</p>
      </div>
      <div class="history-header-actions">
        ${editMode ? "" : `<button class="ghost-button" id="editCustomerButton" type="button">Edit customer</button>`}
        <button class="icon-button" id="closeCustomerHistoryButton" aria-label="Close" type="button">x</button>
      </div>
    </div>
    <div class="history-summary compact-history-summary">
      <article><strong>${history.length}</strong><span>Total</span></article>
      <article><strong>${openCount}</strong><span>Open</span></article>
      <article><strong>${closedCount}</strong><span>Closed</span></article>
      <article><strong>${account.receipts.length}</strong><span>Receipts</span></article>
      <article><strong>${registeredReceiptCount}</strong><span>Warranties</span></article>
      <article><strong>${lastContactAt ? dateTimeLabel(lastContactAt) : "None"}</strong><span>Last contact</span></article>
    </div>
    <div class="history-single-page">
      ${renderCustomerHistorySinglePage({ account, ticket, history, editMode })}
    </div>
  `;

  el.customerHistoryModal.hidden = false;
  el.customerHistoryModal.removeAttribute("hidden");
  if (typeof el.customerHistoryModal.showModal === "function" && !el.customerHistoryModal.open) {
    el.customerHistoryModal.showModal();
  } else {
    el.customerHistoryModal.setAttribute("open", "");
  }

  el.customerHistoryModal.querySelector("#closeCustomerHistoryButton").addEventListener("click", closeCustomerHistory);
  el.customerHistoryModal.querySelector("#editCustomerButton")?.addEventListener("click", () => openCustomerHistory(ticket.id, "profile", true));
  el.customerHistoryModal.querySelector("#cancelCustomerEditButton")?.addEventListener("click", () => openCustomerHistory(ticket.id));
  el.customerHistoryModal.querySelector("#customerEditForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveCustomerEdits(ticket.id, new FormData(event.currentTarget));
  });
  el.customerHistoryModal.querySelector("#historyAddReceiptButton")?.addEventListener("click", () => {
    openReceiptUploadModal(ticket.id);
  });
  el.customerHistoryModal.querySelector("#accountNoteForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addAccountNote(ticket.id, el.customerHistoryModal.querySelector("#accountNoteInput").value);
  });
  el.customerHistoryModal.querySelectorAll("[data-view-receipt]").forEach((button) => {
    button.addEventListener("click", () => openReceiptPreviewModal(ticket.id, button.dataset.viewReceipt));
  });
  el.customerHistoryModal.querySelectorAll("[data-verify-receipt]").forEach((button) => {
    button.addEventListener("click", () => markReceiptVerified(ticket.id, button.dataset.verifyReceipt));
  });
  el.customerHistoryModal.querySelectorAll("[data-edit-receipt]").forEach((button) => {
    button.addEventListener("click", () => openReceiptDetailsEditModal(ticket.id, button.dataset.editReceipt));
  });
  el.customerHistoryModal.querySelectorAll("[data-register-receipt]").forEach((button) => {
    button.addEventListener("click", () => {
      registerWarrantyForReceipt(ticket, button.dataset.registerReceipt);
      openCustomerHistory(ticket.id);
    });
  });
  el.customerHistoryModal.querySelectorAll("[data-unregister-warranty]").forEach((button) => {
    button.addEventListener("click", () => openUnregisterWarrantyConfirmModal(ticket.id, button.dataset.unregisterWarranty));
  });
  el.customerHistoryModal.querySelectorAll("[data-apply-receipt]").forEach((button) => {
    button.addEventListener("click", () => applyReceiptToCurrentTicket(ticket.id, button.dataset.applyReceipt));
  });
  el.customerHistoryModal.querySelectorAll("[data-history-ticket]").forEach((button) => {
    button.addEventListener("click", () => {
      closeCustomerHistory();
      openTicketDetail(button.dataset.historyTicket);
    });
  });
}

function renderCustomerHistorySinglePage({ account, ticket, history, editMode = false }) {
  return `
    ${editMode ? `
    <section class="history-section compact-history-section customer-profile-section">
      <div class="section-title compact-section-title">
        <div>
          <p class="eyebrow">Customer profile</p>
          <h3>Edit customer</h3>
        </div>
      </div>
      ${renderCustomerEditForm(account, ticket, true)}
    </section>
    ` : ""}
    <section class="history-section compact-history-section ticket-history-section">
      <div class="section-title compact-section-title">
        <div>
          <p class="eyebrow">Ticket history</p>
          <h3>${history.length} ticket${history.length === 1 ? "" : "s"} for this email</h3>
        </div>
        <span class="section-helper">Matched by email only</span>
      </div>
      ${renderCustomerTicketHistoryTable(history)}
    </section>
    <div class="history-two-column">
      <section class="history-section compact-history-section receipts-history-section">
        <div class="section-title compact-section-title">
          <div>
            <p class="eyebrow">Receipts & warranty</p>
            <h3>${account.receipts.length ? `${account.receipts.length} receipt${account.receipts.length === 1 ? "" : "s"}` : "No receipts"}</h3>
          </div>
          <button class="ghost-button" id="historyAddReceiptButton" type="button">Add receipt</button>
        </div>
        ${renderCustomerReceiptWarrantyCards(account)}
      </section>
      <section class="history-section compact-history-section notes-history-section">
        <div class="section-title compact-section-title">
          <div>
            <p class="eyebrow">Account notes</p>
            <h3>${account.accountNotes.length ? `${account.accountNotes.length} saved` : "No saved notes"}</h3>
          </div>
        </div>
        <form class="account-note-form compact-note-form" id="accountNoteForm">
          <textarea id="accountNoteInput" placeholder="Add an account note for future tickets from this email"></textarea>
          <button class="primary-button" type="submit">Add note</button>
        </form>
        ${renderAccountNotes(account)}
      </section>
    </div>
  `;
}

function renderCustomerProfileDetails(account, ticket, history = []) {
  const accountHistory = history.length
    ? history
    : tickets.filter((item) => item.customer.email.toLowerCase() === String(account.email || ticket.customer.email || "").toLowerCase());
  const openCount = accountHistory.filter(isOpen).length;
  const closedCount = accountHistory.filter(isClosedDisplayStatus).length;
  const lastContactAt = accountHistory.map(lastUpdatedAt).sort((a, b) => new Date(b) - new Date(a))[0] || "";
  const registeredReceiptCount = account.receipts.filter((receipt) => isRegisteredWarrantyRecord(warrantyRecordForReceipt(account, receipt))).length;
  return `
    <dl class="info-list compact-info-grid customer-profile-grid">
      <div><dt>Name</dt><dd>${escapeHtml(account.name || ticket.customer.name)}</dd></div>
      <div><dt>Email</dt><dd>${escapeHtml(account.email || ticket.customer.email)}</dd></div>
      <div><dt>Phone</dt><dd>${escapeHtml(account.phone || account.mobile || ticket.customer.phone || ticket.customer.mobile || "Not provided")}</dd></div>
      <div><dt>Total tickets</dt><dd>${accountHistory.length}</dd></div>
      <div><dt>Open tickets</dt><dd>${openCount}</dd></div>
      <div><dt>Closed tickets</dt><dd>${closedCount}</dd></div>
      <div><dt>Receipts on file</dt><dd>${account.receipts.length}</dd></div>
      <div><dt>Warranties registered</dt><dd>${registeredReceiptCount}</dd></div>
      <div><dt>Last contact</dt><dd>${escapeHtml(lastContactAt ? dateTimeLabel(lastContactAt) : "None")}</dd></div>
    </dl>
  `;
}

function renderCustomerEditForm(account, ticket) {
  return `
    <form class="customer-edit-form" id="customerEditForm">
      <label>Name<input name="name" required value="${escapeHtml(account.name || ticket.customer.name)}"></label>
      <label>Email<input name="email" type="email" required value="${escapeHtml(account.email || ticket.customer.email)}"></label>
      <label>Phone<input name="phone" value="${escapeHtml(account.phone || ticket.customer.phone || "")}"></label>
      <label>Mobile<input name="mobile" value="${escapeHtml(account.mobile || ticket.customer.mobile || "")}"></label>
      <label class="full-span">Address<input name="address" value="${escapeHtml(displayEditableAddress(account.address || ticket.customer.address))}"></label>
      <p class="history-warning full-span">Changing email may affect linked ticket history.</p>
      <div class="history-card-actions full-span">
        <button class="secondary-button" id="cancelCustomerEditButton" type="button">Cancel</button>
        <button class="primary-button" type="submit">Save changes</button>
      </div>
    </form>
  `;
}

function renderCompactTicketList(history) {
  if (!history.length) return `<p class="muted">No tickets found for this email.</p>`;
  return `<div class="compact-history-list">${history.map((item) => `
    <button class="history-ticket compact-history-ticket" data-history-ticket="${escapeHtml(item.id)}" type="button">
      <strong>${escapeHtml(ticketDisplayId(item))} ${escapeHtml(item.subject)}</strong>
      <span>${escapeHtml(displayStatusFor(item))} / ${dateTimeLabel(lastUpdatedAt(item))} / ${escapeHtml(item.assignee)}</span>
    </button>
  `).join("")}</div>`;
}

function renderCompactReceiptSummary(account) {
  if (!account.receipts.length) return `<p class="muted">No saved receipts for this customer.</p>`;
  return `<div class="compact-history-list">${account.receipts.slice(0, 4).map((receipt) => {
    const warranty = warrantyRecordForReceipt(account, receipt);
    const registered = isRegisteredWarrantyRecord(warranty);
    return `<div class="compact-receipt-row"><strong>${escapeHtml(receipt.fileName || "Receipt")}</strong><span>${registered ? "Registered" : "Not registered"} / ${escapeHtml(receipt.model || "No model")}</span></div>`;
  }).join("")}</div>`;
}

function renderCustomerTicketHistoryTable(history) {
  if (!history.length) return `<p class="muted">No tickets found for this email address.</p>`;
  return `
    <div class="history-table-wrap compact-history-table-wrap">
      <table class="history-table">
        <thead>
          <tr>
            <th>Ticket #</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Last updated</th>
            <th>Assigned rep</th>
            <th>Model</th>
            <th>Purchase source</th>
          </tr>
        </thead>
        <tbody>
          ${history.map((item) => `
            <tr>
              <td><button class="link-button" data-history-ticket="${escapeHtml(item.id)}" type="button">${escapeHtml(ticketDisplayId(item))}</button></td>
              <td>${escapeHtml(item.subject)}</td>
              <td><span class="status-pill ${statusClass(displayStatusFor(item))}">${escapeHtml(displayStatusFor(item))}</span></td>
              <td>${escapeHtml(dateTimeLabel(lastUpdatedAt(item)))}</td>
              <td>${escapeHtml(item.assignee || "Unassigned")}</td>
              <td>${escapeHtml(item.model || "Not provided")}</td>
              <td>${escapeHtml(purchaseSourcePreviewDisplayFor(item))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCustomerReceiptWarrantyCards(account) {
  if (!account.receipts.length) {
    return `<p class="muted">No saved receipts for this customer yet.</p>`;
  }

  return `<div class="receipt-link-list">${account.receipts.map((record) => {
    const warranty = ensureWarrantyRecordForReceipt(account, record);
    const registered = isRegisteredWarrantyRecord(warranty);
    const receiptVerified = record.status === "Verified";
    const receiptStatus = receiptVerified ? "Verified" : "Uploaded";
    const warrantyStatus = registered ? "Registered" : "Not registered";
    const purchaseSource = record.source && record.source !== "Unknown" ? record.source : "Not provided";
    const uploadedBy = record.uploadedBy || receiptUploaderForTicket(sourceTicketForReceipt(record)) || "Not provided";
    const uploadedDate = record.savedAt || record.uploadDate ? dateTimeLabel(record.savedAt || record.uploadDate) : "Not provided";
    const registeredBy = registered ? warranty.registeredBy || record.registeredBy || "Not provided" : "Not provided";
    const registeredDate = registered && warranty.registeredAt ? dateTimeLabel(warranty.registeredAt) : "Not provided";
    return `
      <article class="receipt-row-item">
        <button class="receipt-file-link" data-view-receipt="${escapeHtml(record.id || record.fileName || "Receipt")}" type="button" title="Open ${escapeHtml(record.fileName || "receipt")}">
          <svg class="receipt-file-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3Z"></path><path d="M13.5 3v6h6"></path></svg>
          <span class="receipt-file-name">${escapeHtml(record.fileName || "Receipt")}</span>
        </button>
      </article>
    `;
  }).join("")}</div>`;
}

function renderAccountNotes(account) {
  const notes = normalizeAccountNotes(account.accountNotes, account.notes);
  if (!notes.length) return `<p class="muted">No account notes yet.</p>`;
  return `
    <div class="account-notes-list compact-account-notes">
      ${notes.map((note) => `
        <article class="account-note-card">
          <p>${escapeHtml(note.body)}</p>
          <span>${escapeHtml(dateTimeLabel(note.timestamp))} / ${escapeHtml(note.rep || CURRENT_USER)}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function statusClass(status = "") {
  const value = String(status).toLowerCase();
  if (value.includes("closed")) return "status-closed";
  return "status-open";
}

function addAccountNote(ticketId, body) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket || !String(body || "").trim()) return;
  const account = accountForTicket(ticket);
  account.accountNotes = normalizeAccountNotes(account.accountNotes, account.notes);
  account.accountNotes.unshift({
    id: `note-${Date.now()}`,
    body: String(body).trim(),
    timestamp: new Date().toISOString(),
    rep: profileDisplayName()
  });
  persistCustomerAccounts();
  openCustomerHistory(ticket.id, "notes");
  showToast("Account note saved.");
}

function saveCustomerEdits(ticketId, form) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket) return;
  const oldEmail = ticket.customer.email.toLowerCase();
  const newEmail = String(form.get("email") || "").trim().toLowerCase();
  if (!newEmail) return;
  if (newEmail !== oldEmail && !confirm("Changing email may affect linked ticket history. Continue?")) {
    return;
  }

  const oldAccount = accountForTicket(ticket);
  const updated = {
    name: String(form.get("name") || "").trim(),
    email: newEmail,
    phone: String(form.get("phone") || "").trim(),
    mobile: String(form.get("mobile") || "").trim(),
    address: displayEditableAddress(String(form.get("address") || "").trim())
  };

  let targetAccount = oldAccount;
  if (newEmail !== oldEmail) {
    targetAccount = customerAccounts[newEmail] || { ...oldAccount, receipts: [], warranties: [], accountNotes: [] };
    targetAccount.receipts = mergeRecordsById(targetAccount.receipts, oldAccount.receipts);
    targetAccount.warranties = mergeRecordsById(targetAccount.warranties, oldAccount.warranties);
    targetAccount.accountNotes = mergeRecordsById(targetAccount.accountNotes, oldAccount.accountNotes);
    delete customerAccounts[oldEmail];
    customerAccounts[newEmail] = targetAccount;
  }

  Object.assign(targetAccount, updated);
  tickets.forEach((item) => {
    if (item.customer?.email?.toLowerCase() !== oldEmail) return;
    item.customer.name = updated.name || item.customer.name;
    item.customer.email = updated.email;
    item.customer.phone = updated.phone;
    item.customer.mobile = updated.mobile;
    item.customer.address = updated.address || "Not provided";
  });
  persistCustomerAccounts();
  persistTickets();
  render();
  openCustomerHistory(ticket.id, "overview");
  showToast("Customer updated.");
}

function mergeRecordsById(existing = [], incoming = []) {
  const map = new Map();
  [...existing, ...incoming].forEach((record) => {
    if (!record) return;
    map.set(record.id || JSON.stringify(record), record);
  });
  return [...map.values()];
}

function displayEditableAddress(value) {
  const address = String(value || "").trim();
  return address.toLowerCase() === "not provided" ? "" : address;
}

function markReceiptVerified(ticketId, receiptId) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket) return;
  const account = accountForTicket(ticket);
  const receipt = account.receipts.find((record) => record.id === receiptId);
  if (!receipt) return;
  receipt.status = "Verified";
  receipt.extractionNote = "Verified by rep";
  receipt.verifiedBy = profileDisplayName();
  receipt.notes = receipt.notes || `Verified by ${profileDisplayName()}`;
  persistCustomerAccounts();
  openCustomerHistory(ticket.id, "receipts");
  showToast("Receipt marked verified.");
}

function openReceiptDetailsEditModal(ticketId, receiptId) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket) return;
  const account = accountForTicket(ticket);
  const receipt = account.receipts.find((record) => record.id === receiptId);
  if (!receipt) return;
  const warranty = ensureWarrantyRecordForReceipt(account, receipt);
  const registered = isRegisteredWarrantyRecord(warranty);
  const verifiedBy = receipt.verifiedBy || (receipt.status === "Verified" ? profileDisplayName() : "");
  const verificationNote = receipt.verificationNote || receipt.notes || "";
  el.workflowConfirmModal.classList.add("receipt-details-modal");
  el.workflowConfirmModal.innerHTML = `
    <form id="receiptDetailsEditForm" class="receipt-details-form">
      <div class="modal-header receipt-details-header">
        <div>
          <p class="eyebrow">Receipt metadata</p>
          <h2>Edit receipt details</h2>
          <p>${escapeHtml(receipt.fileName || "Receipt")} for ${escapeHtml(ticket.customer.email)}</p>
        </div>
        <button class="icon-button" id="closeWorkflowConfirmButton" aria-label="Close" type="button">x</button>
      </div>
      <div class="receipt-details-body">
        <section class="receipt-edit-section receipt-file-section">
          <div class="receipt-edit-section-title">
            <span class="receipt-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6V3Zm7 1.8V8h3.2L13 4.8ZM8 11v2h8v-2H8Zm0 4v2h6v-2H8Z"/></svg></span>
            <div>
              <h3>Receipt file</h3>
              <p>Manage the uploaded receipt file name.</p>
            </div>
          </div>
          <div class="receipt-edit-grid two-column">
            <label class="receipt-field wide-field">File name<input name="fileName" value="${escapeHtml(receipt.fileName || "")}"></label>
          </div>
        </section>

        <section class="receipt-edit-section">
          <div class="receipt-edit-section-title">
            <span class="receipt-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6h16v12H4V6Zm2 3v2h12V9H6Zm0 4v2h7v-2H6Z"/></svg></span>
            <div>
              <h3>Purchase details</h3>
              <p>Keep source, order, model, and purchase date tied to this receipt.</p>
            </div>
          </div>
          <div class="receipt-edit-grid four-column">
            <label class="receipt-field">Purchase source<select name="source">${workspaceConfig.purchaseSources.map((source) => `<option value="${escapeHtml(source)}"${(receipt.source || "Unknown") === source ? " selected" : ""}>${escapeHtml(source)}</option>`).join("")}</select></label>
            <label class="receipt-field">Order number<input name="orderNumber" value="${escapeHtml(receipt.orderNumber || "")}"></label>
            <label class="receipt-field">Model number<input name="model" value="${escapeHtml(receipt.model || "")}"></label>
            <label class="receipt-field">Purchase date<input name="purchaseDate" type="date" value="${escapeHtml(receipt.purchaseDate || "")}"></label>
          </div>
        </section>

        <section class="receipt-edit-section">
          <div class="receipt-edit-section-title">
            <span class="receipt-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c.8-3.4 3.3-5.3 7-5.3s6.2 1.9 7 5.3H5Z"/></svg></span>
            <div>
              <h3>Customer details</h3>
              <p>Use receipt-specific buyer details when available.</p>
            </div>
          </div>
          <div class="receipt-edit-grid two-column">
            <label class="receipt-field">Customer name<input name="customerName" value="${escapeHtml(receipt.customerName || account.name || "")}"></label>
            <label class="receipt-field">Customer email<input name="customerEmail" type="email" value="${escapeHtml(receipt.customerEmail || account.email || "")}"></label>
          </div>
        </section>

        <section class="receipt-edit-section">
          <div class="receipt-edit-section-title">
            <span class="receipt-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m10 15.2-3.2-3.1-1.4 1.4L10 18 19 7.8l-1.5-1.3L10 15.2Z"/></svg></span>
            <div>
              <h3>Warranty registration</h3>
              <p>Registration is linked to this individual receipt record.</p>
            </div>
          </div>
          <div class="receipt-edit-grid three-column warranty-registration-grid">
            <label class="receipt-toggle-field">
              <input name="warrantyRegistered" type="checkbox" ${registered ? "checked" : ""}>
              <span class="receipt-toggle-track" aria-hidden="true"></span>
              <span>
                <strong>Warranty registered</strong>
                <small>${registered ? "This receipt has a registered warranty." : "Turn on after registration is complete."}</small>
              </span>
            </label>
            <label class="receipt-field">Registered date<input name="registeredDate" type="date" value="${escapeHtml(warranty?.registeredAt ? toDateInput(warranty.registeredAt) : "")}"></label>
            <label class="receipt-field">Registered by<input name="registeredBy" value="${escapeHtml(warranty?.registeredBy || "")}"></label>
          </div>
        </section>

        <section class="receipt-edit-section review-section">
          <div class="receipt-edit-section-title">
            <span class="receipt-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4h14v16H5V4Zm3 4v2h8V8H8Zm0 4v2h8v-2H8Zm0 4v2h5v-2H8Z"/></svg></span>
            <div>
              <h3>Review / verification</h3>
              <p>Saving marks this receipt verified by the current rep.</p>
            </div>
          </div>
          <div class="receipt-edit-grid three-column">
            <label class="receipt-field">Receipt status<select name="receiptStatus">${["Uploaded", "Verified"].map((value) => `<option value="${value}"${(receipt.status === "Verified" ? "Verified" : "Uploaded") === value ? " selected" : ""}>${value}</option>`).join("")}</select></label>
            <label class="receipt-field">Verified by<input name="verifiedBy" value="${escapeHtml(verifiedBy || profileDisplayName())}"></label>
            <label class="receipt-field wide-field">Verification note<textarea name="verificationNote" rows="2">${escapeHtml(verificationNote || "Verified by rep")}</textarea></label>
          </div>
        </section>
      </div>
      <div class="modal-actions receipt-details-actions">
        <button class="secondary-button" id="cancelWorkflowConfirmButton" type="button">Cancel</button>
        <button class="primary-button" type="submit">Save details</button>
      </div>
    </form>
  `;
  openWorkflowConfirmModal();
  bindWorkflowCloseButtons();
  const receiptForm = el.workflowConfirmModal.querySelector("#receiptDetailsEditForm");
  const warrantyToggle = receiptForm.elements.warrantyRegistered;
  const registeredDateInput = receiptForm.elements.registeredDate;
  const registeredByInput = receiptForm.elements.registeredBy;
  warrantyToggle.addEventListener("change", () => {
    if (warrantyToggle.checked) {
      if (!registeredDateInput.value) registeredDateInput.value = toDateInput(new Date().toISOString());
      if (!registeredByInput.value.trim()) registeredByInput.value = profileDisplayName();
      return;
    }
    if (registered && !confirm("Turn off warranty registration for this receipt and clear registered date/by?")) {
      warrantyToggle.checked = true;
      return;
    }
    receiptForm.dataset.warrantyClearConfirmed = "true";
    registeredDateInput.value = "";
    registeredByInput.value = "";
  });
  receiptForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (registered && !form.get("warrantyRegistered") && event.currentTarget.dataset.warrantyClearConfirmed !== "true" && !confirm("Turn off warranty registration for this receipt and clear registered date/by?")) {
      return;
    }
    saveReceiptDetails(ticket.id, receipt.id, form);
    closeWorkflowConfirmModal();
  });
}

function saveReceiptDetails(ticketId, receiptId, form) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket) return;
  const account = accountForTicket(ticket);
  const receipt = account.receipts.find((record) => record.id === receiptId);
  if (!receipt) return;
  const oldFileName = receipt.fileName;
  receipt.fileName = String(form.get("fileName") || "").trim() || receipt.fileName || "Receipt";
  receipt.source = workspaceConfig.purchaseSources.includes(form.get("source")) ? form.get("source") : "Unknown";
  receipt.orderNumber = String(form.get("orderNumber") || "").trim();
  receipt.model = String(form.get("model") || "").trim();
  receipt.customerName = String(form.get("customerName") || "").trim();
  receipt.customerEmail = String(form.get("customerEmail") || "").trim().toLowerCase();
  receipt.purchaseDate = String(form.get("purchaseDate") || "").trim();
  receipt.uploadDate = receipt.uploadDate || receipt.savedAt || "";
  receipt.savedAt = receipt.uploadDate || receipt.savedAt;
  receipt.uploadedBy = receipt.uploadedBy || receiptUploaderForTicket(ticket);
  receipt.status = ["Uploaded", "Verified"].includes(form.get("receiptStatus")) ? form.get("receiptStatus") : "Uploaded";
  receipt.verifiedBy = receipt.status === "Verified" ? profileDisplayName() : "";
  receipt.verificationNote = String(form.get("verificationNote") || "").trim() || "Verified by rep";
  receipt.notes = receipt.verificationNote;

  const warranty = ensureWarrantyRecordForReceipt(account, receipt);
  warranty.receiptFileName = receipt.fileName;
  warranty.source = receipt.source;
  warranty.orderNumber = receipt.orderNumber;
  warranty.model = receipt.model;
  warranty.ticketId = receipt.ticketId || ticket.id;
  if (form.get("warrantyRegistered")) {
    const registeredDate = String(form.get("registeredDate") || "").trim();
    warranty.status = "Registered";
    warranty.registeredAt = registeredDate ? new Date(`${registeredDate}T12:00:00`).toISOString() : new Date().toISOString();
    warranty.registeredBy = String(form.get("registeredBy") || "").trim() || profileDisplayName();
    receipt.warrantyRegistered = true;
    receipt.registeredDate = warranty.registeredAt;
    receipt.registeredBy = warranty.registeredBy;
  } else {
    warranty.status = "Not registered";
    warranty.registeredAt = "";
    warranty.registeredBy = "";
    receipt.warrantyRegistered = false;
    receipt.registeredDate = "";
    receipt.registeredBy = "";
  }
  if (oldFileName && oldFileName !== receipt.fileName) {
    const attachment = ticket.attachments?.find((item) => item.file === oldFileName && item.type === "receipt");
    if (attachment) attachment.file = receipt.fileName;
  }
  const registered = registeredWarrantyRecords(account);
  account.warrantyRegistered = registered.length > 0;
  account.warrantyRegisteredAt = registered[0]?.registeredAt || "";
  persistCustomerAccounts();
  persistTickets();
  render();
  openCustomerHistory(ticket.id, "receipts");
  showToast("Receipt details verified.");
}

function applyReceiptToCurrentTicket(ticketId, receiptId) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket) return;
  const account = accountForTicket(ticket);
  const receipt = account.receipts.find((record) => record.id === receiptId);
  if (!receipt) return;
  const warranty = warrantyRecordForReceipt(account, receipt);
  ticket.receipt = true;
  ticket.receiptReviewStatus = "";
  ticket.order = receipt.orderNumber || ticket.order;
  ticket.model = receipt.model || ticket.model;
  ticket.purchaseSource = receipt.source || ticket.purchaseSource || "Unknown";
  ticket.purchaseSourceMode = isVerifiedPurchaseSource(receipt.source) ? "manual" : ticket.purchaseSourceMode || "";
  if (isRegisteredWarrantyRecord(warranty)) {
    ticket.warranty = "Registered";
    ticket.warrantyReviewStatus = "";
  }
  ticket.conversation.push({
    type: "timeline",
    author: "System",
    timestamp: new Date().toISOString(),
    body: `${profileDisplayName()} applied receipt ${receipt.fileName || "metadata"} to this ticket.`
  });
  persistCustomerAccounts();
  persistTickets();
  render();
  openCustomerHistory(ticket.id, "receipts");
  showToast("Receipt applied to current ticket.");
}

function applyWarrantyToCurrentTicket(ticketId, warrantyId) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket) return;
  const account = accountForTicket(ticket);
  const warranty = account.warranties.find((record) => record.id === warrantyId);
  if (!warranty) return;
  ticket.order = warranty.orderNumber || ticket.order;
  ticket.model = warranty.model || ticket.model;
  ticket.purchaseSource = warranty.source || ticket.purchaseSource || "Unknown";
  ticket.purchaseSourceMode = isVerifiedPurchaseSource(warranty.source) ? "manual" : ticket.purchaseSourceMode || "";
  ticket.warranty = isRegisteredWarrantyRecord(warranty) ? "Registered" : "Not registered";
  ticket.warrantyReviewStatus = "";
  ticket.conversation.push({
    type: "timeline",
    author: "System",
    timestamp: new Date().toISOString(),
    body: `${profileDisplayName()} applied warranty record ${warranty.receiptFileName || warranty.id} to this ticket.`
  });
  persistCustomerAccounts();
  persistTickets();
  render();
  openCustomerHistory(ticket.id, "receipts");
  showToast("Warranty record applied to current ticket.");
}

function closeCustomerHistory() {
  const dialog = el.customerHistoryModal;
  animateDialogClose(dialog, () => {
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    dialog.removeAttribute("open");
    dialog.setAttribute("hidden", "");
    dialog.hidden = true;
    dialog.innerHTML = "";
  });
}

function openReceiptUploadModal(ticketId) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket) return;
  pendingReceiptUpload = { ticketId, file: null };
  el.workflowConfirmModal.innerHTML = `
    <form id="receiptUploadForm">
      <div class="modal-header">
        <div>
          <p class="eyebrow">Receipt upload</p>
          <h2>Add receipt</h2>
          <p>${escapeHtml(ticket.customer.email)} / ${escapeHtml(ticketDisplayId(ticket))}</p>
        </div>
        <button class="icon-button" id="closeWorkflowConfirmButton" aria-label="Close" type="button">x</button>
      </div>
      <div class="receipt-upload-body">
        <input id="receiptFileInput" name="receiptFile" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" hidden>
        <button class="receipt-dropzone" id="receiptDropzone" type="button">
          <strong>Drop receipt here</strong>
          <span>PDF, PNG, JPG, or JPEG. You can also choose a file or paste a screenshot from the clipboard.</span>
        </button>
        <div class="receipt-upload-actions">
          <button class="secondary-button" id="chooseReceiptFileButton" type="button">Choose file</button>
          <span id="receiptUploadHint">No receipt selected</span>
        </div>
        <p class="muted">Receipt metadata will be saved to this customer email history and reused on future tickets from this email address.</p>
      </div>
      <div class="modal-actions">
        <button class="secondary-button" id="cancelWorkflowConfirmButton" type="button">Cancel</button>
        <button class="primary-button" type="submit">Save receipt</button>
      </div>
    </form>
  `;
  openWorkflowConfirmModal();
  bindWorkflowCloseButtons();
  const form = el.workflowConfirmModal.querySelector("#receiptUploadForm");
  const fileInput = el.workflowConfirmModal.querySelector("#receiptFileInput");
  const dropzone = el.workflowConfirmModal.querySelector("#receiptDropzone");
  el.workflowConfirmModal.addEventListener("paste", handleReceiptPaste);
  el.workflowConfirmModal.addEventListener("close", clearReceiptUploadState, { once: true });
  el.workflowConfirmModal.querySelector("#chooseReceiptFileButton").addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => setPendingReceiptFile(fileInput.files?.[0]));
  ["dragenter", "dragover"].forEach((type) => {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((type) => {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.remove("dragging");
    });
  });
  dropzone.addEventListener("drop", (event) => setPendingReceiptFile(event.dataTransfer?.files?.[0]));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const file = pendingReceiptUpload.file;
    if (!isAcceptedReceiptFile(file)) {
      showToast("Choose a PDF, PNG, JPG, or JPEG receipt.");
      return;
    }
    const targetTicket = tickets.find((item) => item.id === pendingReceiptUpload.ticketId);
    if (!targetTicket || !saveUploadedReceiptToAccount(targetTicket, file)) return;
    closeWorkflowConfirmModal();
    openCustomerHistory(targetTicket.id, "receipts");
    render();
    showToast("Receipt uploaded and saved to customer history.");
  });
}

function setPendingReceiptFile(file) {
  if (!isAcceptedReceiptFile(file)) {
    showToast("Receipt upload accepts PDF, PNG, JPG, or JPEG files.");
    return;
  }
  pendingReceiptUpload.file = file;
  updateReceiptUploadSelection();
}

function updateReceiptUploadSelection() {
  const hint = el.workflowConfirmModal.querySelector("#receiptUploadHint");
  const file = pendingReceiptUpload.file;
  if (!hint || !file) return;
  const ticket = tickets.find((item) => item.id === pendingReceiptUpload.ticketId);
  hint.textContent = `${file.name} / ${receiptFileType(file)} / ${formatFileSize(file.size)} / ${receiptUploaderForTicket(ticket)}`;
}

function handleReceiptPaste(event) {
  const files = Array.from(event.clipboardData?.files || []);
  const image = files.find((file) => isAcceptedReceiptFile(file));
  if (!image) return;
  event.preventDefault();
  setPendingReceiptFile(image);
}

function clearReceiptUploadState() {
  el.workflowConfirmModal.removeEventListener("paste", handleReceiptPaste);
  pendingReceiptUpload = { ticketId: "", file: null };
}

function applyVariables(text, ticket) {
  return text
    .replaceAll("{{customer_first_name}}", ticket.customer.name.split(" ")[0])
    .replaceAll("{{customer_name}}", ticket.customer.name)
    .replaceAll("{{ticket_number}}", ticketDisplayId(ticket))
    .replaceAll("{{model_number}}", ticket.model)
    .replaceAll("{{model}}", ticket.model)
    .replaceAll("{{rep_name}}", macroRepName())
    .replaceAll("{{rep_first_name}}", macroRepName())
    .replaceAll("{{replacement_part}}", replacementPartFor(ticket))
    .replaceAll("{{product_link}}", suggestedProductLink(ticket)?.url || "No saved link found for this model/source.")
    .replaceAll("{{product_review_link}}", productReviewLinkFor(ticket))
    .replaceAll("{{review_link}}", reviewLinkFor(ticket));
}

function replacementPartFor(ticket) {
  return workspaceConfig.products[ticket.family]?.replacementPart || "replacement part confirmed by support";
}

function macroRepName() {
  return profileDisplayName().split(" ")[0] || profile.firstName || "Robert";
}

function reviewLinkFor(ticket) {
  const base = productReviewLinkFor(ticket);
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}ticket=${encodeURIComponent(ticket.id)}`;
}

function productReviewLinkFor(ticket) {
  return reviewProductLinks()[0]?.url || workspaceConfig.reviewLinks.trustpilot || workspaceConfig.reviewLinks.default;
}

function normalizedModelKey(model) {
  const rawModel = String(model || "").trim().toUpperCase();
  if (!rawModel || rawModel === "TBD") return "";
  const models = [...new Set(activeProductLinks().map((link) => link.model).filter(Boolean))];
  const exact = models.find((key) => key === rawModel);
  if (exact) return exact;
  return models.find((key) => rawModel.includes(key) || key.includes(rawModel)) || "";
}

function productSourceKey(source) {
  return productLinkPlatformFromSource(source);
}

function suggestedProductLink(ticket) {
  const modelKey = normalizedModelKey(ticket.model);
  const platform = productSourceKey(purchaseSourceFor(ticket));
  const link = modelKey && platform
    ? activeProductLinks().find((item) => item.model === modelKey && item.platform === platform)
    : null;
  if (!link) return null;
  const sourceLabel = purchaseSourceFor(ticket);
  return {
    ...link,
    label: link.label || `${ticket.model} / ${sourceLabel}`
  };
}

function activeProductLinks() {
  return productLinks.filter((link) => link.active);
}

function reviewProductLinks() {
  return activeProductLinks().filter((link) => ["Google Review", "Trustpilot"].includes(link.platform));
}

function productReviewNeeded(ticket) {
  const text = [...ticket.tags, ticket.subject, ticket.issue, displayStatusFor(ticket)].join(" ").toLowerCase();
  return Boolean(ticket.partsSent || /review|parts-sent|resolved|closed|follow-up/.test(text));
}

function openTicketModal() {
  isCreateTicketModalOpen = true;
  renderCreateTicketModal();
  el.ticketModal.hidden = false;
  el.ticketModal.removeAttribute("hidden");

  el.ticketForm.reset();

  if (typeof el.ticketModal.showModal === "function" && !el.ticketModal.open) {
    el.ticketModal.showModal();
  } else {
    el.ticketModal.setAttribute("open", "");
  }
}

function closeTicketModal() {
  isCreateTicketModalOpen = false;
  const dialog = el.ticketModal;
  if (!dialog.open) {
    dialog.hidden = true;
    dialog.setAttribute("hidden", "");
    return;
  }
  animateDialogClose(dialog, () => {
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    dialog.removeAttribute("open");
    dialog.setAttribute("hidden", "");
    dialog.hidden = true;
    dialog.innerHTML = "";
    el.ticketForm = null;
    if (el.quickNewTicketButton) {
      uiState.activeQuickControl = activeView;
      applyUiState();
    }
  });
}

function renderCreateTicketModal() {
  if (!isCreateTicketModalOpen) return;

  el.ticketModal.innerHTML = `
    <form id="ticketForm">
      <div class="modal-header">
        <div>
          <p class="eyebrow">Outbound-first support</p>
          <h2>Create ticket</h2>
        </div>
        <button class="icon-button" id="closeTicketModalButton" aria-label="Close" type="button">x</button>
      </div>

      <div class="create-ticket-body">
        <section class="ticket-form-section create-ticket-primary">
          <div class="section-heading">
            <h3>Required details</h3>
            <p>Manual tickets are assigned to you and prepared as an outbound customer email.</p>
          </div>
          <div class="form-grid compact-form-grid create-ticket-required-grid">
            <label>
              Customer name
              <input name="customerName" required maxlength="70" spellcheck="false" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false" placeholder="Customer name">
            </label>
            <label>
              Customer email
              <input name="email" type="text" inputmode="email" autocomplete="email" required spellcheck="false" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false" placeholder="customer@example.com">
            </label>
            <label class="full-span">
              Subject
              <input name="subject" required maxlength="100" spellcheck="false" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false" placeholder="${escapeHtml(workspaceConfig.defaultCreateTicket.subjectPlaceholder)}">
            </label>
            <label class="message-field full-span">
              Message / reason for ticket
              <textarea name="message" required rows="5" spellcheck="false" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false" placeholder="Write the reason for opening this ticket, such as a call summary or follow-up request."></textarea>
            </label>
          </div>
        </section>

        <details class="ticket-form-section create-ticket-advanced">
          <summary>
            <span>Advanced details</span>
            <small>Optional</small>
          </summary>
          <div class="form-grid compact-form-grid">
            <label>
              Phone
              <input name="phone" spellcheck="false" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false" placeholder="555-123-4567">
            </label>
            <label>
              Model number
              <input name="modelNumber" spellcheck="false" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false" placeholder="${escapeHtml(workspaceConfig.modelPlaceholder)}">
            </label>
            <label>
              Order number
              <input name="orderNumber" spellcheck="false" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false" placeholder="${escapeHtml(workspaceConfig.orderPlaceholder)}">
            </label>
            <label>
              Purchase source
              <select name="purchaseSource">
                <option value="">Not provided</option>
                ${workspaceConfig.purchaseSources.map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`).join("")}
              </select>
            </label>
            <label class="full-span">
              Issue type
              <select name="issueType">
                <option value="">Not provided</option>
              </select>
            </label>
          </div>
        </details>
      </div>

      <div class="modal-actions">
        <button class="secondary-button" id="cancelTicketModalButton" type="button">Cancel</button>
        <button class="primary-button" value="create" type="submit">Create ticket</button>
      </div>
    </form>
  `;

  el.ticketForm = el.ticketModal.querySelector("#ticketForm");
  fillSelect(el.ticketForm.elements.issueType, ["", ...issueTypes], "");
  el.ticketForm.elements.issueType.options[0].textContent = "Not provided";
  syncCustomSelect(el.ticketForm.elements.issueType);
  el.ticketForm.addEventListener("submit", handleCreateTicket);
  el.ticketForm.querySelector("#closeTicketModalButton").addEventListener("click", (event) => {
    event.preventDefault();
    closeTicketModal();
  });
  el.ticketForm.querySelector("#cancelTicketModalButton").addEventListener("click", (event) => {
    event.preventDefault();
    closeTicketModal();
  });
}

function handleCreateTicket(event) {
  event.preventDefault();
  if (event.submitter && event.submitter.value !== "create") return;

  if (!el.ticketForm) return;
  const form = new FormData(el.ticketForm);
  const nextNumber = nextTicketNumber();
  const createdAt = new Date().toISOString();
  const createdBy = profileDisplayName();
  const subject = stringFormValue(form, "subject");
  const model = stringFormValue(form, "modelNumber");
  const family = workspaceConfig.defaultCreateTicket.productFamily;
  const customer = stringFormValue(form, "customerName");
  const email = stringFormValue(form, "email");
  const phone = stringFormValue(form, "phone");
  const orderNumber = stringFormValue(form, "orderNumber");
  const issueType = stringFormValue(form, "issueType");
  const reason = stringFormValue(form, "message");
  const purchaseSource = stringFormValue(form, "purchaseSource") || "Unknown";
  const assignment = assignmentForNewTicket({ subject, family, issueType, email }, { mode: "manual", createdBy });
  const notification = manualTicketNotificationEmail({ customer, subject, ticketNumber: nextNumber });

  const ticket = buildTicket({
    id: String(nextNumber),
    subject,
    customer,
    email,
    phone,
    model,
    family,
    source: "Manual",
    purchaseSource,
    assignee: assignment.assignee,
    status: "Open",
    priority: "Normal",
    ageHours: 0,
    dueInHours: 24,
    tags: issueType ? [slugify(issueType)] : [],
    missing: [],
    order: orderNumber,
    warranty: "Needs review",
    receipt: false,
    previousTickets: [],
    attachments: [],
    issue: diagnosisForFamily(family).issue,
    firstTest: diagnosisForFamily(family).firstTest,
    confirms: diagnosisForFamily(family).confirms,
    customerMessage: reason,
    repReply: "",
    internalNote: reason,
    aiAssignment: {
      assignedTo: assignment.assignee,
      assignedAt: createdAt,
      reason: assignment.note,
      workloadAtAssignment: assignment.workload
    }
  });

  ticket.createdAt = createdAt;
  ticket.dueAt = hoursFromNow(24);
  ticket.lastCustomerAt = "";
  ticket.lastRepAt = createdAt;
  ticket.purchaseSourceMode = purchaseSource !== "Unknown" ? "manual" : "";
  ticket.conversation = [
    {
      type: "timeline",
      author: "System",
      timestamp: createdAt,
      body: `${createdBy} created this ticket manually.`
    },
    {
      type: "note",
      author: createdBy,
      timestamp: createdAt,
      body: reason
    },
    {
      type: "rep",
      author: workspaceConfig.supportMailbox,
      timestamp: createdAt,
      emailSubject: notification.subject,
      body: notification.body
    },
    {
      type: "timeline",
      author: "System",
      timestamp: createdAt,
      body: "Customer notification email generated."
    }
  ];
  ticket.conversation.push({
    type: "timeline",
    author: "System",
    timestamp: createdAt,
    body: assignment.note
  });
  applyCustomerAccountToTicket(ticket);

  tickets.unshift(ticket);
  if (assignedToCurrentDemoUser(ticket)) {
    addNotification({
      category: "assigned",
      title: "Ticket assigned to you",
      description: `${ticketDisplayId(ticket)} was created and assigned to your queue.`,
      ticketId: ticket.id
    });
  }
  selectedTicketId = ticket.id;
  activeView = "open";
  uiState.activeScreen = "detail";
  uiState.activeQuickControl = "open";
  persistTickets();
  closeTicketModal();
  render();
  showToast("Ticket created and customer notification prepared.");
}

function customerFirstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "there";
}

function manualTicketNotificationEmail({ customer, subject, ticketNumber }) {
  const displayId = ticketDisplayId(ticketNumber);
  return {
    subject: `Your iSpring support ticket has been created - ${displayId}`,
    body: `Hi ${customerFirstName(customer)},\n\nA support ticket has been created for you with iSpring Water Systems.\n\nTicket number: ${displayId}\nSubject: ${subject}\n\nYou can reply directly to this email with any updates, photos, receipts, or questions, and they will be added to your ticket.\n\nThanks,\niSpring Support`
  };
}

function diagnosisForFamily(family) {
  return workspaceConfig.products[family]?.diagnosis || workspaceConfig.defaultProductDiagnosis;
}

function isOpen(ticket) {
  if (ticket.mergedInto) return false;
  return displayStatusFor(ticket) === "Open";
}

function isOverdue(ticket) {
  return isOpen(ticket) && new Date(ticket.dueAt) < new Date();
}

function lastCustomerMessage(ticket) {
  return [...ticket.conversation].reverse().find((message) => message.type === "customer")?.body || "";
}

function lastUpdatedAt(ticket) {
  return [...ticket.conversation].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]?.timestamp || ticket.createdAt;
}

function ageLabel(value) {
  const hours = Math.max(1, Math.round((new Date() - new Date(value)) / 36e5));
  return hours < 24 ? `${hours}h old` : `${Math.round(hours / 24)}d old`;
}

function dueLabel(value) {
  const hours = Math.round((new Date(value) - new Date()) / 36e5);
  if (hours < 0) {
    const over = Math.abs(hours);
    return over >= 48 ? `${Math.round(over / 24)}d overdue` : `${over}h overdue`;
  }
  if (hours < 24) return `SLA ${hours}h`;
  return `Due ${new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function dateTimeLabel(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function hoursAgo(hours) {
  const date = new Date();
  date.setTime(date.getTime() - hours * 60 * 60 * 1000);
  return date.toISOString();
}

function hoursFromNow(hours) {
  const date = new Date();
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  return date.toISOString();
}

// Ticket data is cached in localStorage from the first seed, so absolute due
// dates drift into the deep past and every ticket reads as overdue. Re-baseline
// each open ticket's SLA relative to "now" on load, using a stable per-ticket
// offset so the queue always shows a realistic spread (~1/3 overdue, some due
// soon, most comfortably ahead) instead of a wall of red.
function slaOffsetHoursForTicket(ticket) {
  const r = hashStringToUnit(ticket.id || ticket.number || ticket.subject || "");
  if (r < 0.22) return -Math.round(2 + (r / 0.22) * 70);          // -2h .. -72h (~22% overdue)
  if (r < 0.36) return Math.round(((r - 0.22) / 0.14) * 8);       // 0h .. 8h (due soon)
  return Math.round(9 + ((r - 0.36) / 0.64) * 87);                // 9h .. 96h (comfortably ahead)
}

function hashStringToUnit(value) {
  let h = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function rebaselineOpenTicketSla(list) {
  if (!Array.isArray(list)) return;
  for (const ticket of list) {
    if (ticket && isOpen(ticket)) {
      ticket.dueAt = hoursFromNow(slaOffsetHoursForTicket(ticket));
    }
  }
}

function toDateInput(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function fillSelect(select, options, selected) {
  select.innerHTML = options.map((option) => `<option value="${escapeHtml(option)}"${option === selected ? " selected" : ""}>${escapeHtml(option)}</option>`).join("");
  syncCustomSelect(select);
}

function statusSelectOptions(selected, placeholder = "") {
  const selectedIsSupported = editableStatuses.includes(selected);
  const placeholderOption = !selectedIsSupported && placeholder
    ? `<option value="" selected disabled>${escapeHtml(placeholder)}</option>`
    : "";
  return `${placeholderOption}${editableStatuses.map((status) => `<option value="${escapeHtml(status)}"${selected === status ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
