import Link from "next/link";
import { Mail, Newspaper, Zap, FormInput, Tags, Layout, Users, Grid, BarChart, FlaskConical, DollarSign, ShoppingBag } from "lucide-react";

const features = [
  {
    icon: Mail,
    title: "Email marketing",
    description: "Reach your audience with personalized, engaging emails.",
  },
  {
    icon: Newspaper,
    title: "Newsletters",
    description: "Write and design newsletters that build loyal fans.",
  },
  {
    icon: Zap,
    title: "Visual Automations",
    description: "Build email sequences and workflows with drag-and-drop simplicity.",
  },
  {
    icon: FormInput,
    title: "Forms & opt-ins",
    description: "Capture subscribers with customizable opt-in forms.",
  },
  {
    icon: Tags,
    title: "Segmentation & Tagging",
    description: "Organize subscribers for targeted, relevant messaging.",
  },
  {
    icon: Layout,
    title: "Landing Pages",
    description: "Build beautiful customized website pages that convert.",
  },
  {
    icon: Users,
    title: "Recommendations",
    description: "Grow subscribers by cross-promoting with other creators.",
  },
  {
    icon: Grid,
    title: "Kit App Store",
    description: "Connect all your tools so everything works together seamlessly.",
  },
  {
    icon: BarChart,
    title: "Analytics & Insights",
    description: "Track growth with actionable audience insights.",
  },
  {
    icon: FlaskConical,
    title: "Email A/B testing",
    description: "Optimize email conversions with data-driven split testing.",
  },
  {
    icon: DollarSign,
    title: "Sponsorships & Kit Ads",
    description: "Monetize your newsletter with premium brand partnerships.",
  },
  {
    icon: ShoppingBag,
    title: "Commerce",
    description: "Sell digital products, memberships, and subscriptions directly through Kit.",
  },
];

export function PlatformFeatures() {
  return (
    <section id="features" className="py-20 bg-[#F5F5F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif mb-4">
            The email marketing platform for creators
            <br />
            who mean business
          </h2>
          <div className="mt-8">
            <Link
              href="#"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-black bg-[#5CC5DE] hover:bg-[#4AB5CE] rounded-full transition-colors"
            >
              Start free trial
            </Link>
            <p className="mt-3 text-sm text-gray-500">No credit card required</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="text-[#5CC5DE] mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-lg mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full text-sm hover:bg-white transition-colors"
          >
            Show more features
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
