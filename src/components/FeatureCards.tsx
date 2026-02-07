import { Users, Mail, Zap, DollarSign } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Get more subscribers",
    description: "with landing pages, forms, and creator recommendations.",
    color: "text-[#5CC5DE]",
  },
  {
    icon: Mail,
    title: "Send beautiful emails",
    description: "that build relationships, not just revenue.",
    color: "text-[#E8B86D]",
  },
  {
    icon: Zap,
    title: "Automate your work",
    description: "with apps that connect your creator tools directly to Kit.",
    color: "text-[#7BC47F]",
  },
  {
    icon: DollarSign,
    title: "Earn more on autopilot",
    description: "with your digital products, subscriptions, and Kit Ads.",
    color: "text-[#E88B8B]",
  },
];

export function FeatureCards() {
  return (
    <section className="py-12 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className={`flex-shrink-0 ${feature.color}`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm">
                  <strong className="text-black">{feature.title}</strong>{" "}
                  <span className="text-gray-600">{feature.description}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
