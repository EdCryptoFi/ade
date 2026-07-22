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
      { name: "LandingPage", children: [{ name: "Hero" }, { name: "Pricing" }, { name: "Features" }] },
      { name: "Auth", children: [{ name: "LoginForm" }, { name: "RegisterForm" }, { name: "PasswordReset" }] },
      { name: "Dashboard", children: [{ name: "SubscriptionStatus" }, { name: "UsageMetrics" }] },
      { name: "BillingPage", children: [{ name: "PlanSelector" }, { name: "PaymentMethod" }, { name: "InvoiceHistory" }] },
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
  other: {
    name: "App",
    children: [
      { name: "Header" },
      { name: "MainContent" },
      { name: "Footer" },
    ],
  },
}

export function decideComponents(input: ProjectInput, domain: DomainCategory): ComponentDecision {
  const tree = domainTemplates[domain]
  return {
    tree,
    reasoning: `Template de componentes para domínio ${domain} aplicado com base nas features: ${input.features.join(", ")}`,
  }
}
