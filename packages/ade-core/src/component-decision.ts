import type { ComponentDecision, ComponentNode, DomainCategory, ProjectInput } from "./types.ts"

const domainTemplates: Record<DomainCategory, ComponentNode> = {
  marketplace: {
    name: "App",
    children: [
      { name: "Header", children: [{ name: "SearchBar" }, { name: "Cart" }, { name: "UserMenu" }] },
      { name: "ProductGrid", children: [{ name: "ProductCard" }, { name: "Filters" }] },
      { name: "ProductPage", children: [{ name: "Gallery" }, { name: "ProductInfo" }, { name: "Reviews" }] },
      { name: "Checkout", children: [{ name: "CartSummary" }, { name: "PaymentForm" }, { name: "OrderConfirmation" }] },
      { name: "Footer" },
    ],
  },
  dashboard: {
    name: "App",
    children: [
      { name: "Header" },
      { name: "Sidebar", children: [{ name: "NavMenu" }, { name: "WorkspaceSwitcher" }] },
      {
        name: "DashboardGrid",
        children: [
          { name: "MetricCard" },
          { name: "ChartWidget" },
          { name: "DataTable" },
          { name: "ActivityFeed" },
        ],
      },
      { name: "AnalyticsPage", children: [{ name: "DateRangePicker" }, { name: "ChartBuilder" }] },
      { name: "SettingsPage", children: [{ name: "ProfileForm" }, { name: "PreferencesForm" }] },
    ],
  },
  saas: {
    name: "App",
    children: [
      {
        name: "PublicPages",
        children: [
          { name: "LandingPage", children: [{ name: "Hero" }, { name: "Features" }, { name: "PricingSection" }] },
          { name: "Auth", children: [{ name: "LoginForm" }, { name: "RegisterForm" }, { name: "PasswordReset" }, { name: "SSOButton" }] },
        ],
      },
      {
        name: "AppLayout",
        children: [
          { name: "TopNav", children: [{ name: "WorkspaceSwitcher" }, { name: "UserMenu" }, { name: "NotificationBell" }] },
          { name: "Sidebar", children: [{ name: "NavMenu" }, { name: "QuickActions" }] },
        ],
      },
      {
        name: "Dashboard",
        children: [
          { name: "Home", children: [{ name: "WelcomeHero" }, { name: "MetricCards" }, { name: "RecentActivity" }] },
          { name: "Analytics", children: [{ name: "ChartWidget" }, { name: "DateRangePicker" }, { name: "ExportButton" }] },
          { name: "UsagePage", children: [{ name: "UsageChart" }, { name: "QuotaBar" }] },
        ],
      },
      {
        name: "Billing",
        children: [
          { name: "PlanSelector", children: [{ name: "PlanCard" }, { name: "FeatureComparison" }] },
          { name: "PaymentMethod", children: [{ name: "CardForm" }, { name: "PaymentHistory" }] },
          { name: "InvoiceHistory", children: [{ name: "InvoiceList" }, { name: "InvoiceDetail" }] },
          { name: "SubscriptionStatus" },
        ],
      },
      { name: "Settings", children: [{ name: "ProfileForm" }, { name: "PreferencesForm" }, { name: "NotificationPreferences" }] },
    ],
  },
  crm: {
    name: "App",
    children: [
      { name: "Sidebar", children: [{ name: "PipelineView" }, { name: "Contacts" }, { name: "Analytics" }] },
      { name: "PipelineBoard", children: [{ name: "StageColumn" }, { name: "DealCard" }] },
      { name: "ContactPage", children: [{ name: "ContactInfo" }, { name: "ActivityHistory" }, { name: "Notes" }] },
      { name: "ReportsPage", children: [{ name: "SalesChart" }, { name: "ConversionFunnel" }] },
    ],
  },
  "ai-agent": {
    name: "App",
    children: [
      { name: "ChatInterface", children: [{ name: "MessageList" }, { name: "InputBar" }, { name: "ToolCallDisplay" }] },
      { name: "AgentConfigPanel", children: [{ name: "ToolSelector" }, { name: "PromptEditor" }, { name: "MemoryViewer" }] },
      { name: "SessionHistory" },
      { name: "Analytics", children: [{ name: "TokenUsage" }, { name: "CostBreakdown" }] },
    ],
  },
  "landing-page": {
    name: "Page",
    children: [
      { name: "Hero", children: [{ name: "Headline" }, { name: "CTAButton" }, { name: "HeroImage" }] },
      { name: "FeaturesSection", children: [{ name: "FeatureCard" }] },
      { name: "Testimonials" },
      { name: "PricingSection" },
      { name: "Footer", children: [{ name: "ContactForm" }, { name: "SocialLinks" }] },
    ],
  },
  game: {
    name: "App",
    children: [
      { name: "MainMenu", children: [{ name: "PlayButton" }, { name: "Settings" }, { name: "Leaderboard" }] },
      { name: "GameCanvas" },
      { name: "HUD", children: [{ name: "Score" }, { name: "HealthBar" }, { name: "Inventory" }] },
      { name: "GameOverScreen" },
    ],
  },
  "social-network": {
    name: "App",
    children: [
      { name: "Feed", children: [{ name: "PostCard" }, { name: "CreatePost" }] },
      { name: "Sidebar", children: [{ name: "ProfileCard" }, { name: "TrendingTopics" }, { name: "Suggestions" }] },
      { name: "ProfilePage", children: [{ name: "UserInfo" }, { name: "PostGrid" }, { name: "FollowersList" }] },
      { name: "Messages", children: [{ name: "ConversationList" }, { name: "Chat" }] },
      { name: "Notifications" },
    ],
  },
  transportation: {
    name: "App",
    children: [
      {
        name: "Fleet",
        children: [
          { name: "VehicleList", children: [{ name: "VehicleCard" }, { name: "StatusBadge" }, { name: "MaintenanceAlert" }] },
          { name: "DriverList", children: [{ name: "DriverCard" }, { name: "LicenseStatus" }, { name: "TripHistory" }] },
          { name: "VehicleDetail", children: [{ name: "TelemetryPanel" }, { name: "FuelLog" }, { name: "InspectionHistory" }] },
        ],
      },
      {
        name: "Freights",
        children: [
          { name: "FreightBoard", children: [{ name: "FreightCard" }, { name: "RouteMap" }, { name: "Filters" }] },
          { name: "TripPlanning", children: [{ name: "RouteOptimizer" }, { name: "VehicleAssignment" }, { name: "DriverAssignment" }] },
          { name: "FreightDetail", children: [{ name: "Milestones" }, { name: "Documents" }, { name: "PaymentStatus" }] },
        ],
      },
      {
        name: "Finance",
        children: [
          { name: "PaymentsDashboard", children: [{ name: "FreightPayments" }, { name: "ReceivablesTable" }, { name: "ReconciliationView" }] },
          { name: "Invoices", children: [{ name: "NfeList" }, { name: "NfeEmissionForm" }, { name: "NfeStatus" }] },
          { name: "FinancialReports", children: [{ name: "RevenueChart" }, { name: "CostBreakdown" }, { name: "ExportButton" }] },
        ],
      },
      {
        name: "Operations",
        children: [
          { name: "RealtimeMap", children: [{ name: "LiveVehicleMarkers" }, { name: "TripProgress" }] },
          { name: "AlertsCenter", children: [{ name: "DelayAlerts" }, { name: "MaintenanceAlerts" }] },
          { name: "CompliancePanel", children: [{ name: "FiscalStatus" }, { name: "RegulatoryChecks" }] },
        ],
      },
      { name: "Settings", children: [{ name: "CompanyProfile" }, { name: "IntegrationSettings" }, { name: "UserPermissions" }] },
    ],
  },
  fintech: {
    name: "App",
    children: [
      {
        name: "Accounts",
        children: [
          { name: "AccountList", children: [{ name: "AccountCard" }, { name: "BalanceBadge" }] },
          { name: "AccountDetail", children: [{ name: "Statement" }, { name: "TransactionsTable" }, { name: "ExportButton" }] },
        ],
      },
      {
        name: "Payments",
        children: [
          { name: "PaymentCenter", children: [{ name: "PaymentForm" }, { name: "PaymentMethods" }, { name: "ScheduledPayments" }] },
          { name: "PaymentHistory", children: [{ name: "TransactionList" }, { name: "StatusFilters" }, { name: "RefundAction" }] },
        ],
      },
      {
        name: "Invoicing",
        children: [
          { name: "InvoiceList", children: [{ name: "InvoiceRow" }, { name: "StatusBadge" }, { name: "Filters" }] },
          { name: "InvoiceEditor", children: [{ name: "LineItems" }, { name: "TaxComputation" }, { name: "NfePreview" }] },
          { name: "NfeStatusTracker", children: [{ name: "AuthorizationStatus" }, { name: "RejectionReasons" }] },
        ],
      },
      {
        name: "Compliance",
        children: [
          { name: "FiscalDashboard", children: [{ name: "TaxObligations" }, { name: "FilingStatus" }, { name: "Deadlines" }] },
          { name: "AuditTrail", children: [{ name: "EventLog" }, { name: "Export" }] },
        ],
      },
      { name: "Settings", children: [{ name: "CompanyProfile" }, { name: "BankAccounts" }, { name: "Integrations" }] },
    ],
  },
  other: {
    name: "App",
    children: [
      { name: "Header" },
      { name: "MainContent" },
      { name: "Footer" },
    ],
  },
}

function addConditionalChildren(tree: ComponentNode, input: ProjectInput): void {
  const settings = tree.children
  if (!settings) return

  // Teams / multi-tenant
  if (input.teams || input.multiTenant) {
    settings.push({
      name: "TeamManagement",
      children: [
        { name: "TeamList" },
        { name: "InviteForm", children: [{ name: "InviteByEmail" }, { name: "InviteByLink" }] },
        { name: "RoleManager", children: [{ name: "RoleList" }, { name: "PermissionEditor" }] },
        { name: "MemberProfile" },
      ],
    })
  }

  if (input.multiTenant) {
    settings.push({
      name: "TenantAdmin",
      children: [
        { name: "TenantList" },
        { name: "TenantSettings", children: [{ name: "BrandingConfig" }, { name: "DomainConfig" }, { name: "SSOConfig" }] },
        { name: "UsagePerTenant" },
      ],
    })
  }

  // API access
  if (input.apiAccess) {
    settings.push({
      name: "Developer",
      children: [
        { name: "ApiKeys", children: [{ name: "KeyList" }, { name: "CreateKeyModal" }, { name: "KeyPermissions" }] },
        { name: "ApiDocs", children: [{ name: "EndpointList" }, { name: "Playground" }, { name: "CodeSnippets" }] },
        { name: "WebhookManagement", children: [{ name: "WebhookList" }, { name: "WebhookForm" }, { name: "DeliveryLogs" }] },
      ],
    })
  }

  // Webhooks (if separate from API)
  if (input.webhooks && !input.apiAccess) {
    settings.push({
      name: "WebhookManagement",
      children: [{ name: "WebhookList" }, { name: "WebhookForm" }, { name: "DeliveryLogs" }, { name: "RetryConfig" }],
    })
  }

  // SSO
  if (input.sso) {
    settings.push({
      name: "SSOConfig",
      children: [{ name: "IdentityProviderList" }, { name: "SAMLConfig" }, { name: "OIDCConfig" }, { name: "DomainVerification" }],
    })
  }

  // Audit log
  if (input.auditLog) {
    settings.push({
      name: "AuditLog",
      children: [{ name: "LogTimeline" }, { name: "LogFilters" }, { name: "LogExport" }, { name: "ComplianceReport" }],
    })
  }

  // Feature flags
  if (input.featureFlags) {
    settings.push({
      name: "FeatureFlags",
      children: [{ name: "FlagList" }, { name: "FlagEditor" }, { name: "TargetingRules" }, { name: "RolloutDashboard" }],
    })
  }

  // Onboarding
  if (input.onboarding) {
    settings.push({
      name: "Onboarding",
      children: [{ name: "WelcomeWizard" }, { name: "SetupSteps" }, { name: "ProgressTracker" }, { name: "CompletionChecklist" }],
    })
  }

  // Data export
  if (input.dataExport) {
    settings.push({
      name: "DataTools",
      children: [{ name: "ExportPage", children: [{ name: "ExportForm" }, { name: "ExportHistory" }, { name: "DownloadButton" }] },
      { name: "ImportPage", children: [{ name: "UploadZone" }, { name: "MappingConfig" }, { name: "ImportPreview" }] }],
    })
  }
}

export function decideComponents(input: ProjectInput, domain: DomainCategory): ComponentDecision {
  const tree = structuredClone(domainTemplates[domain])
  addConditionalChildren(tree, input)
  return {
    tree,
    reasoning: `Template ${domain} with ${countNodes(tree)} components based on: ${input.features.join(", ")}`,
  }
}

function countNodes(node: ComponentNode): number {
  let count = 1
  if (node.children) for (const c of node.children) count += countNodes(c)
  return count
}
